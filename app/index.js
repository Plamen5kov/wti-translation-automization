const _ = require(`lodash`)

const fs = require(`fs`)
const helpers = require(`./helpers`)
const pull = require(`./wti.pull`)
const loadStrings = require(`./load.strings`)
const config = require(`./configuration.json`)
const xmlHelper = require(`./xml.parser`)
const customSeparator = "***"
const path = require(`path`)

/**
 * Do "wti pull" strings and move them to local folder so we can work with them locally
 */
Promise.all([
    pull.wtiPull("android"),
    pull.wtiPull("ios")
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
    //TODO: plamen5kov: implement later (ask user to leave the keys he wants to migrate)

    var migrateMeToIos = runDataTransformation(diffKeyFiles.missingFromIosFileName, data.androidData.androidTranslationsByKey, `ios`)
    helpers.iterateOverPulledFiles(`ios`, (data) => {
        var language = helpers.extractLanguageFromFileName(data.fileToSave, `ios`)
        var translationForCurrentLanguage = []
        _(migrateMeToIos).forEach((translations, key) => {
            var value = translations[language] || helpers.NO_TRANSLATION_FOUND
            var lineToWrite = `"${key}" = "${value}"`
            translationForCurrentLanguage.push(lineToWrite)
        })

        helpers.appendOrCreateFile(data.fileToSave, translationForCurrentLanguage, { joinSeparator: `\n\n`, encoding: helpers.getEncoding(`ios`) })
    })

    var migrateMeToAndroid = runDataTransformation(diffKeyFiles.missingFromAndroidFileName, data.iosData.iosTranslationsByKey, `android`)
    var jsonTemplate = xmlHelper.getXmlFileAsJson(`${__dirname}${path.sep}translations-template.xml`).then((jsonTemplate) => {
        helpers.iterateOverPulledFiles(`android`, (data) => {
            var language = helpers.extractLanguageFromFileName(data.fileToSave, `android`)
            xmlHelper.getXmlFileAsJson(data.fileToSave).then((currentTranslationsAsJson) => {
                var translationForCurrentLanguage = []
                _(migrateMeToAndroid).forEach((translations, key) => {

                    var transformedKey = helpers.sanitizeKey(key.toLowerCase()).replace(/[^\w|\d]/g, `_`)
                    var value = translations[language]
                    var newTranslation = xmlHelper.getTemplateAsJson(transformedKey, value)
                    currentTranslationsAsJson.resources.string.push(newTranslation)
                })

                xmlHelper.buildXmlFrom(currentTranslationsAsJson, data.fileToSave)
            })
        })
    })
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
        var err = { occured: false, key: "", lang: [] }

        _(config.supportedCountriesAndroid)
            .forEach((language) => {

                var translation = translationsByKey[key].translationByLanguage[language]
                if (translation) {
                    var placeHolder = platform === `android` ? `%s` : `%@`
                    translation = translation.replace(loadStrings.androidPlaceholderRegex, placeHolder)
                    if (language == "en") {
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
            console.log(_(errLines).join("\n"))
        }
    }
    if (!config.disableLogging) showDuplicatedTranslationPatterns(translationsPerKey, platform)
    return translationsPerKey
}

function showDuplicatedTranslationPatterns(translationsPerKey, platform) {
    var err = []
    _(translationsPerKey).forEach((value, key) => {
        if (value.count > 12) {
            err.push(`\tDuplicate translation: "${key}" while migrating from ${platform}`)
        }
    })
    console.log(`\nSpotted a problem while migrating ${platform}`)
    console.log(err.join(`\n`))
}

function readKeyFile(fileName, platform) {
    var missingFromIosFileContent = fs.readFileSync(fileName, { encoding: helpers.getEncoding(platform) })
    var leftKeysToMigrate = _(missingFromIosFileContent)
        .split("\n")
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
    const missingFromIosFileName = "missing-from-ios.txt"
    var specificAndroidKeysMissingFromIos = []
    _(missingKeysInAndroid).forEach((generic_key) => {
        var originalAndroidKey = androidGenericKeyToSpecificKey[generic_key]
        var lineToWrite = `${originalAndroidKey}***${generic_key}`
        specificAndroidKeysMissingFromIos.push(lineToWrite)
    })
    helpers.appendOrCreateFile(missingFromIosFileName, specificAndroidKeysMissingFromIos, { encoding: helpers.getEncoding(`ios`) })

    // save missing keys from android to a file
    const missingFromAndroidFileName = "missing-from-android.txt"
    var specificIosKeysMissingFromAndroid = []
    _(missingKeysInIos).forEach((generic_key) => {
        var originalIosKey = iosGenericKeyToSpecificKey[generic_key]
        specificIosKeysMissingFromAndroid.push(originalIosKey)
    })
    helpers.appendOrCreateFile(missingFromAndroidFileName, specificIosKeysMissingFromAndroid, { encoding: helpers.getEncoding(`android`) })

    return {
        missingFromIosFileName,
        missingFromAndroidFileName
    }
}