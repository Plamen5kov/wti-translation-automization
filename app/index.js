const _ = require(`lodash`)
const fs = require(`fs`)
const path = require(`path`)

const helpers = require(`./helpers`)
const pull = require(`./wti.pull`)
const loadStrings = require(`./load.strings`)
const config = require(`./configuration.json`)
const xmlHelper = require(`./xml.parser`)
const prompter = require(`./prompter`)

const customSeparator = `***`

const args = process.argv
var moveBackAfterFinished = false
if (args.length >= 3) {
    if (args[2] === "--mbaf") {
        moveBackAfterFinished = true
    }
}

/**
 * Do "wti pull" strings and move them to local folder so we can work with them locally
 */
Promise.all([
    pull.wtiPull(`android`),
    pull.wtiPull(`ios`)
]).then((data) => {
    helpers.moveStrings(`ios`)
    helpers.moveStrings(`android`)

    loadStrings.loadAndroidAndIosData().then(successCallback)
})

/**
 * Load android and ios data from local files and check differences
 */
function successCallback(data) {

    var diffDataAndroid = helpers.checkWhatsMissing(data.iosData.iosTranslationsByKey, data.androidData.androidTranslationsByKey, `ios`)
    var diffDataIos = helpers.checkWhatsMissing(data.androidData.androidTranslationsByKey, data.iosData.iosTranslationsByKey, `android`)

    var diffKeyFiles = saveMissingKeysToFiles(diffDataAndroid.differentGenericKeys,
        diffDataIos.differentGenericKeys,
        data.iosData.iosGenericKeyToSpecificKey,
        data.androidData.androidGenericKeyToSpecificKey)

    helpers.generateReportFile(diffDataIos.differentGenericKeys,
        diffDataAndroid.differentGenericKeys,
        diffDataIos.equalGenericKeys)

    // user interaction prompt?
    prompter.runPromptWithQuestion(diffKeyFiles.missingFromIosFileName, diffKeyFiles.missingFromAndroidFileName).then((choice) => {
        switch (choice) {
            case 1:
                migrateIos(diffKeyFiles.missingFromIosFileName, data.androidData.androidTranslationsByKey, `ios`)
                if (moveBackAfterFinished) moveSynchronizedFilesBack(`ios`)
                process.exit(0)
                break;
            case 2:
                migrateAndroid(diffKeyFiles.missingFromAndroidFileName, data.iosData.iosTranslationsByKey, `android`)
                    .then(() => {
                        if (moveBackAfterFinished) moveSynchronizedFilesBack(`android`)
                        process.exit(0)
                    })
                break;
            case 3:
                migrateIos(diffKeyFiles.missingFromIosFileName, data.androidData.androidTranslationsByKey, `ios`)
                if (moveBackAfterFinished) moveSynchronizedFilesBack(`ios`)
                migrateAndroid(diffKeyFiles.missingFromAndroidFileName, data.iosData.iosTranslationsByKey, `android`)
                    .then(() => {
                        if (moveBackAfterFinished) moveSynchronizedFilesBack(`android`)
                        process.exit(0)
                    })
                break;
            case 4:
                process.exit(0)
                break;
            default:
                process.exit(0)
                break;
        }

    })
}

function moveSynchronizedFilesBack(platform) {
    helpers.iterateOverPulledFiles(platform, (data) => {
        fs.copyFileSync(data.fileToSave, data.fileToCopy, () => { })
    })
}

function migrateAndroid(missingFromAndroidFileName, iosTranslationsByKey, platform) {
    return new Promise((resolve, reject) => {
        var counter = 0
        var migrateMeToAndroid = runDataTransformation(missingFromAndroidFileName, iosTranslationsByKey, platform)
        var jsonTemplate = xmlHelper.getXmlFileAsJson(`${xmlHelper.translationsTemplatePath}`).then((jsonTemplate) => {
            helpers.iterateOverPulledFiles(platform, (data) => {
                var language = helpers.extractLanguageFromFileName(data.fileToSave, platform)
                xmlHelper.getXmlFileAsJson(data.fileToSave).then((currentTranslationsAsJson) => {
                    var translationForCurrentLanguage = []
                    _(migrateMeToAndroid).forEach((translations, key) => {

                        var transformedKey = _(key)
                            .thru((v) => { return v.replace(loadStrings.androidPlaceholderRegex, ``) })
                            .thru((v) => { return helpers.sanitizeKey(v) })
                            .thru((v) => { return v.replace(/[^\w|\d]/g, `_`) })
                            .thru((v) => { return v.toLocaleLowerCase() })
                            .thru((v) => { return _(v).trimStart(`_`) })
                            .thru((v) => { return _(v).trimEnd(`_`) })
                            .thru((v) => { return v.match(/^\d/) ? `_${v}` : v })
                            .value()

                        var value = translations[language]
                        var newTranslation = xmlHelper.getTemplateAsJson(transformedKey, value)
                        currentTranslationsAsJson.resources.string.push(newTranslation)
                    })

                    counter++
                    xmlHelper.buildXmlFrom(currentTranslationsAsJson, data.fileToSave)
                    if (counter >= helpers.DEFAULT_TRANSLATION_LANGUAGES_COUNT) {
                        console.log(`### Successfully migrated ${platform}...`)
                        resolve(true)
                    }
                })
            })
        })
    })
}
function migrateIos(missingFromIosFileName, androidTranslationsByKey, platform) {

    var migrateMeToIos = runDataTransformation(missingFromIosFileName, androidTranslationsByKey, platform)
    helpers.iterateOverPulledFiles(platform, (data) => {
        var language = helpers.extractLanguageFromFileName(data.fileToSave, platform)
        var translationForCurrentLanguage = []
        _(migrateMeToIos).forEach((translations, key) => {
            var value = translations[language] || helpers.NO_TRANSLATION_FOUND
            var lineToWrite = `"${key}" = "${value}"`
            translationForCurrentLanguage.push(lineToWrite)
        })

        helpers.appendOrCreateFile(data.fileToSave, translationForCurrentLanguage, { joinSeparator: `\n\n`, encoding: helpers.getEncoding(platform) })
    })
    console.log(`### Successfully migrated ${platform}...`)
}

function runDataTransformation(missingFromIosFileName, translationsByKey, platform) {
    var keysToMigrate = readKeyFile(missingFromIosFileName, platform)
    return aggregateEasyToUseDictionary(keysToMigrate, translationsByKey, platform)
}

function aggregateEasyToUseDictionary(leftKeysToMigrate, translationsByKey, platform) {
    var translationsPerKey = {}
    var errLines = []

    _(leftKeysToMigrate).forEach((key) => {
        var newKey
        var err = { occured: false, key: ``, lang: [] }

        _(config.supportedCountriesAndroid)
            .forEach((language) => {

                var translation = translationsByKey[key].translationByLanguage[language]
                if (translation) {
                    var opositePlatformRegex = loadStrings.getOpositePlatformPlaceholderRegex(platform)
                    translation = translation.replace(opositePlatformRegex, helpers.PLACEHOLDER)
                    var placeHolder = helpers.getOppositePlaceholder(platform)
                    translation = translation.replace(new RegExp(helpers.PLACEHOLDER, `g`), placeHolder)
                    if (language === helpers.EN_LANGUAGE) {
                        newKey = translation
                    }

                    if (!translationsPerKey[newKey]) {
                        translationsPerKey[newKey] = {}
                        translationsPerKey[newKey].count = 0
                    }

                    translationsPerKey[newKey][language] = translation
                    translationsPerKey[newKey].count++

                } else {
                    err.occured = true
                    err.key = key
                    err.lang.push(language)
                }
            })
        if (err.occured) errLines.push(`\tMissing translation for ${platform} key: "${err.key}" on [${_(err.lang).join(`,`)}]`)
    })
    if (!config.disableLogging) {
        if (errLines.length) {
            console.log(`\nSpotted a problem while migrating ${platform} translations`)
            console.log(_(errLines).join(`\n`))
        }
    }
    if (!config.disableLogging) showDuplicatedTranslationPatterns(translationsPerKey, platform)
    return translationsPerKey
}

function showDuplicatedTranslationPatterns(translationsPerKey, platform) {
    var err = []
    _(translationsPerKey).forEach((value, key) => {
        if (value.count > helpers.DEFAULT_TRANSLATION_LANGUAGES_COUNT) {
            err.push(`\tDuplicate translation: "${key}" while migrating from ${platform}`)
        }
    })
    console.log(`\nSpotted a problem while migrating ${platform}`)
    console.log(err.join(`\n`))
}

function readKeyFile(fileName, platform) {
    var missingFromIosFileContent = fs.readFileSync(fileName, { encoding: helpers.getEncoding(platform) })
    var leftKeysToMigrate = _(missingFromIosFileContent)
        .split(`\n`)
        .map((line) => {
            var splitArr = line.split(customSeparator)
            if (splitArr) {
                return splitArr[0]
            }
        })
        .value()

    return leftKeysToMigrate
}

function saveMissingKeysToFiles(missingKeysInIos, missingKeysInAndroid, iosGenericKeyToSpecificKey, androidGenericKeyToSpecificKey) {

    // save missing keys from ios to a file
    const missingFromIosFileName = `missing-from-ios.txt`
    var specificAndroidKeysMissingFromIos = []
    _(missingKeysInAndroid).forEach((generic_key) => {
        var originalAndroidKey = androidGenericKeyToSpecificKey[generic_key]
        var lineToWrite = `${originalAndroidKey}***${generic_key}`
        specificAndroidKeysMissingFromIos.push(lineToWrite)
    })
    try { fs.unlinkSync(missingFromIosFileName) } catch (e) { }
    helpers.appendOrCreateFile(missingFromIosFileName, specificAndroidKeysMissingFromIos, { encoding: helpers.getEncoding(`ios`) })

    // save missing keys from android to a file
    const missingFromAndroidFileName = `missing-from-android.txt`
    var specificIosKeysMissingFromAndroid = []
    _(missingKeysInIos).forEach((generic_key) => {
        var originalIosKey = iosGenericKeyToSpecificKey[generic_key]
        specificIosKeysMissingFromAndroid.push(originalIosKey)
    })
    try { fs.unlinkSync(missingFromAndroidFileName) } catch (e) { }
    helpers.appendOrCreateFile(missingFromAndroidFileName, specificIosKeysMissingFromAndroid, { encoding: helpers.getEncoding(`android`) })

    return {
        missingFromIosFileName,
        missingFromAndroidFileName
    }
}