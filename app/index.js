const _ = require(`lodash`)

const fs = require(`fs`)
const helpers = require(`./helpers`)
const pull = require(`./wti.pull`)
const loadStringsApi = require(`./load.strings`)
const config = require(`./configuration.json`)
const customSeparator = "***"
/**
 * Do "wti pull" strings and move them to local folder so we can work with them locally
 */
// Promise.all([
//     pull.wtiPull("android"),
//     pull.wtiPull("ios")
// ]).then((data) => {
//     helpers.moveStrings(`ios`)
//     helpers.moveStrings(`android`)
// })

/**
 * Load android and ios data from local files and check differences
 */
loadStringsApi.loadAndroidAndIosData().then((data) => {
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
    var migrateMeToAndroid = runDataTransformation(diffKeyFiles.missingFromAndroidFileName, data.iosData.iosTranslationsByKey, `android`)

    debugger
})

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

        var supportedCountries = config.supportedCountriesAndroid
        _(supportedCountries)
            .forEach((language) => {
                var translation = translationsByKey[key].translationByLanguage[language]
                if (translation) {
                    var placeHolder = platform === `android` ? `%s` : `%@`
                    translation = translation.replace(loadStringsApi.androidPlaceholderRegex, placeHolder)
                    if (language == "en") {
                        newKey = translation
                    }

                    if (!translationsPerKey[newKey]) {
                        translationsPerKey[newKey] = {}
                    }
                    translationsPerKey[newKey][language] = translation
                } else {
                    err.occured = true
                    err.key = key
                    err.lang.push(language)
                }
            })
        if (err.occured) errLines.push(`\tMissing translation for android key: ${err.key} on [${_(err.lang).join(`,`)}]`)
    })
    if (!config.disableLogging) {
        if (errLines.length) {
            console.log(`\nSpotted a problem while migrating android translations to ios`)
            console.log(_(errLines).join("\t\n"))
        }
    }
    return translationsPerKey
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
    helpers.writeToNewFile(missingFromIosFileName, specificAndroidKeysMissingFromIos, { encoding: helpers.getEncoding(`ios`) })

    // save missing keys from android to a file
    const missingFromAndroidFileName = "missing-from-android.txt"
    var specificIosKeysMissingFromAndroid = []
    _(missingKeysInIos).forEach((generic_key) => {
        var originalIosKey = iosGenericKeyToSpecificKey[generic_key]
        specificIosKeysMissingFromAndroid.push(originalIosKey)
    })
    helpers.writeToNewFile(missingFromAndroidFileName, specificIosKeysMissingFromAndroid, { encoding: helpers.getEncoding(`android`) })

    return {
        missingFromIosFileName,
        missingFromAndroidFileName
    }
}