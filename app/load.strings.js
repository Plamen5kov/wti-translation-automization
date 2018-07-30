const fs = require(`fs`)
const _ = require(`lodash`)
const os = require(`os`)

const helpers = require(`./helpers`)
const xmlParser = require(`./xml.parser`)
const config = require(`./configuration.json`)

/**
 * The following are generated by a library included in this project.
 * If you want to generate a new regex feel free to add your scenario to the array and regenerate the regex or write it yourself if you feel confident - I don't
 
 const regexgen = require('regexgen')
 var androidReg = regexgen(["%s","%s","%1$s","%2$s","%3$s","%d","%1$.2f","%2$.2f","%1$s","%2$s","%3$s","%1$s","%2$s","%3$s","%1$s","%2$s","%1$.2f","%2$.2f","%1$s","%2$.2f","%3$s","%4$.4f","%1$s","%1$s","%2$s","%1$s","%1$s","%2%s","%s","%.2f","%.02f","%.04f"])
 console.log(androidReg)

var iosReg = regexgen(["%1$@", "%2$@", "%@","%d"])
console.log(iosReg)
 */
const iosPlaceholderRegex = /%(?:[12]\$@|[@d])/g
const androidPlaceholderRegex = /%(?:(?:4\$\.4|\.(?:0[24]|2))f|2\$(?:\.2f|s)|1\$(?:\.2f|s)|3\$s|2%s|[ds])/g
const iosSplitKeyValueRegex = /"(.*)"\s+=\s+"(.*)"/ //I wrote this one, seems to work fine so far

module.exports = {
    loadIos,
    loaodAndroid,
    loadAndroidAndIosData,
    iosPlaceholderRegex,
    androidPlaceholderRegex,
    iosSplitKeyValueRegex
}

/**
 * Parse downloaded values/string files and load them in memory.
 * Where do I load files from: see key "iosWtiPath" in "configuration.json" 
 * Where do I copy files locally: see key iosWtiCopyToPath in "configuration.json"
 * @returns
 *      dictionary: {
 *          "ios key 1": {
 *              generic_key: "value", //should be same as android (it's the english translation)
 *              translationByLanguage: {
 *                  en: "english translation"
 *                  de: "german translation"
 *                  ...
 *              }
 *          },
 *          "ios key 2": {}
 *          ....
 *      }
 *                   
 */
function loadIos() {
    var iosTranslationsByKey = {}
    var iosGenericKeyToSpecificKey = {}

    helpers.iterateOverPulledFiles(`ios`, (data) => {
        var fileContent = fs.readFileSync(data.fileToSave, { encoding: helpers.getEncoding(`ios`) })

        var language = helpers.extractLanguageFromFileName(data.fileToSave, `ios`)

        _.chain(fileContent)
            .split(os.EOL)
            .filter((val) => {
                return !_.isEmpty(val)
            })
            .map((value, index, collection) => {
                if (!_.isEmpty(value)) {
                    var splitArr = iosSplitKeyValueRegex.exec(value)
                    if (splitArr) {
                        var replacedValue = splitArr[2].replace(iosPlaceholderRegex, helpers.PLACEHOLDER)
                        var genericKey = replacedValue
                        var extractedKey = splitArr[1]
                        var extractedValue = genericKey
                        _pushToDictionary(iosTranslationsByKey, genericKey, extractedKey, extractedValue, language, iosGenericKeyToSpecificKey)
                    }
                }
            })
            .value()
    })

    if (!config.disableLogging) {
        _verifyCoherencyOfTranslations(iosTranslationsByKey, `ios`)
    }
    return {
        iosTranslationsByKey,
        iosGenericKeyToSpecificKey
    }
}

/**
 * Parse downloaded localized string files and load them in memory.
 * Where do I load files from: see key "androidWtiPath" in "configuration.json" 
 * Where do I copy files locally: see key androidWtiCopyToPath in "configuration.json"
 * @returns
 *      dictionary: {
 *          android_key1: {
 *              generic_key: "value", //should be same as ios (it's the english translation)
 *              translationByLanguage: {
 *                  en: "english translation"
 *                  de: "german translation"
 *                  ...
 *              }
 *          },
 *          android_key2: {}
 *          ....
 *      }                  
 */
function loaodAndroid() {
    var androidTranslationsByKey = {}
    var androidGenericKeyToSpecificKey = {}
    var languageProcessedDict = {}
    return new Promise((resolve, reject) => {
        helpers.iterateOverPulledFiles(`android`, (data) => {

            var language = helpers.extractLanguageFromFileName(data.fileToSave, `android`)

            xmlParser.getXmlFileAsJson(data.fileToSave).then((json) => {
                var processedKeyValues = _.chain(json.resources.string)
                    .map((value, key, collection) => {
                        var genericKey = value._.replace(androidPlaceholderRegex, helpers.PLACEHOLDER)
                        var extractedKey = value.$.name
                        var extractedValue = value._

                        _pushToDictionary(androidTranslationsByKey, genericKey, extractedKey, extractedValue, language, androidGenericKeyToSpecificKey)
                        languageProcessedDict[language] = language
                    })
                    .value()

                if (_(languageProcessedDict).size() === helpers.DEFAULT_TRANSLATION_LANGUAGES_COUNT) {
                    if (!config.disableLogging) {
                        _verifyCoherencyOfTranslations(androidTranslationsByKey, `android`)
                    }
                    resolve({
                        androidTranslationsByKey,
                        androidGenericKeyToSpecificKey
                    })
                }
            })
        })
    })
}

/**
 * Loads both pulled android and ios translations from local directory specified in "configuration.json"
 */
function loadAndroidAndIosData() {
    return new Promise((resolve, reject) => {
        var iosData = loadIos()
        var androidData
        loaodAndroid()
            .then((data) => {
                androidData = data
                resolve({
                    androidData,
                    iosData
                })
            })
    })
}

// PRIVATE
function _verifyCoherencyOfTranslations(dictionary, platform) {
    var allSupportedCountries = platform === `android` ? config.supportedCountriesAndroid : config.supportedCountriesIos
    var inconsistency = false
    var warningMessages = [`Spotted inconsistency while loading ${platform} string files:\n`]
    _.forEach(dictionary, (value, key, collection) => {
        if (_.size(value.translationByLanguage) < helpers.DEFAULT_TRANSLATION_LANGUAGES_COUNT) {
            var notImplementedCount = helpers.DEFAULT_TRANSLATION_LANGUAGES_COUNT - _.size(value.translationByLanguage)
            inconsistency = true
            var missingLanguages = _.difference(allSupportedCountries, _.keys(value.translationByLanguage))
            warningMessages.push(`\tMissing translation for ${notImplementedCount} languages: [${missingLanguages}] for generic_key: "${value.generic_key}"\n`)
        }
    })
    if (inconsistency) {
        console.warn(warningMessages.join(``))
    }
}

function _pushToDictionary(dictionary, genericKey, extractedKey, extractedValue, language, genericKeyToSpecificKey) {
    var transformedGenericKey = config.caseSensitiveSearch ? genericKey : genericKey.toLowerCase()
    transformedGenericKey = helpers.sanitizeKey(transformedGenericKey)

    if (!dictionary[extractedKey]) {
        dictionary[extractedKey] = {
            translationByLanguage: {}
        }
    }
    if (language === helpers.EN_LANGUAGE) {
        dictionary[extractedKey].generic_key = transformedGenericKey
        genericKeyToSpecificKey[transformedGenericKey] = extractedKey
    }
    if (!dictionary[extractedKey].translationByLanguage[language]) {
        dictionary[extractedKey].translationByLanguage[language] = extractedValue
    }
}