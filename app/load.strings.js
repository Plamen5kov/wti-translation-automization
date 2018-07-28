var fs = require(`fs`)
var _ = require(`lodash`)
var os = require(`os`)
var path = require("path")

var helpers = require(`./helpers`)
var xmlParser = require(`./xml.parser`)
var config = require(`./configuration.json`)

var iosSplitKeyValueRegex = /(.*)"\s+=\s+"(.*)/ //I wrote this one, seems to work fine so far
/**
 * The following are generated by a library included in this project.
 * If you want to generate a new regex feel free to add your scenario to the array and regenerate the regex or write it yourself if you feel confident - I don't
 
 const regexgen = require('regexgen')
 var androidReg = regexgen(["%s","%s","%1$s","%2$s","%3$s","%d","%1$.2f","%2$.2f","%1$s","%2$s","%3$s","%1$s","%2$s","%3$s","%1$s","%2$s","%1$.2f","%2$.2f","%1$s","%2$.2f","%3$s","%4$.4f","%1$s","%1$s","%2$s","%1$s","%1$s","%2%s","%s","%.2f","%.02f","%.04f"])
 console.log(androidReg)

var iosReg = regexgen(["%1$@", "%2$@", "%@","%d"])
console.log(iosReg)
 */
var iosPlaceholderRegex = /%(?:[12345]\$@|[@d])/g
var androidPlaceholderRegex = /%(?:(?:4\$\.4|\.(?:0[24]|2))f|2\$(?:\.2f|s)|1\$(?:\.2f|s)|3\$s|2%s|[ds])/g

const DEFAULT_TRANSLATION_LANGUAGES_COUNT = 12


module.exports = {
    loadIos,
    loaodAndroid,
    loadAndroidAndIosData
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
    var iosTranslationsByLanguage = []
    var iosTranslationsByGenericKey = {}

    helpers.iterateOverPulledFiles(`ios`, (data) => {
        var fileContent = fs.readFileSync(data.fileToSave, { encoding: `utf16le` })

        var firtsDotIndex = data.fileToSave.indexOf(".", config.iosWtiCopyToPath.length)
        var language = data.fileToSave.substring(`${config.iosWtiCopyToPath}${path.sep}`.length, firtsDotIndex)

        var processedKeyValues = _.chain(fileContent)
            .split(os.EOL)
            .filter((val) => {
                return !_.isEmpty(val)
            })
            .map((value, index, collection) => {
                if (!_.isEmpty(value)) {
                    var splitArr = iosSplitKeyValueRegex.exec(value)
                    if (splitArr) {
                        var replacedValue = splitArr[2].replace(iosPlaceholderRegex, "{placeholder}")
                        var genericKey = replacedValue.substring(0, replacedValue.length - 2)
                        var extractedKey = splitArr[1].substring(1)
                        var extractedValue = splitArr[2].substring(0, splitArr[2].length - 2)
                        _pushToDictionary(iosTranslationsByGenericKey, genericKey, extractedKey, extractedValue, language)
                        return {
                            key: extractedKey,
                            value: extractedValue,
                            generic_key: genericKey
                        }
                    }
                }
            })
            .value()

        var item = {}
        item[language] = processedKeyValues
        iosTranslationsByLanguage.push(item)
    })

    if (!config.disableLogging) {
        _verifyCoherencyOfTranslations(iosTranslationsByGenericKey, "ios")
    }
    return iosTranslationsByGenericKey
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
    var androidTranslationsByLanguage = []
    var androidTranslationsByGenericKey = {}

    return new Promise((resolve, reject) => {
        helpers.iterateOverPulledFiles(`android`, (data) => {

            var firtsSepIndex = data.fileToSave.indexOf(path.sep, config.androidWtiCopyToPath.length + 1)
            var language = data.fileToSave.substring(`${config.androidWtiCopyToPath}${path.sep}values-`.length, firtsSepIndex)

            xmlParser.getXmlFileAsJson(data.fileToSave).then((json) => {
                var processedKeyValues = _.chain(json.resources.string)
                    .map((value, key, collection) => {
                        var genericKey = value._.replace(androidPlaceholderRegex, "{placeholder}")
                        var extractedKey = value.$.name
                        var extractedValue = value._

                        _pushToDictionary(androidTranslationsByGenericKey, genericKey, extractedKey, extractedValue, language)

                        return {
                            key: extractedKey,
                            value: extractedValue,
                            generic_key: genericKey
                        }
                    })
                    .value()

                var item = {}
                item[language] = processedKeyValues
                androidTranslationsByLanguage.push(item)

                if (androidTranslationsByLanguage.length === DEFAULT_TRANSLATION_LANGUAGES_COUNT) {
                    if (!config.disableLogging) {
                        _verifyCoherencyOfTranslations(androidTranslationsByGenericKey, "android")
                    }
                    resolve(androidTranslationsByGenericKey)
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
    var allSupportedCountries = platform === "android" ? config.supportedCountriesAndroid : config.supportedCountriesIos
    var inconsistency = false
    var warningMessages = [`Spotted inconsistency while loading ${platform} string files:\n`]
    _.forEach(dictionary, (value, key, collection) => {
        if (_.size(value.translationByLanguage) < DEFAULT_TRANSLATION_LANGUAGES_COUNT) {
            var notImplementedCount = DEFAULT_TRANSLATION_LANGUAGES_COUNT - _.size(value.translationByLanguage)
            inconsistency = true
            var missingLanguages = _.difference(allSupportedCountries, _.keys(value.translationByLanguage))
            warningMessages.push(`\tMissing translation for ${notImplementedCount} languages: [${missingLanguages}] for generic_key: "${value.generic_key}"\n`)
        }
    })
    if (inconsistency) {
        console.warn(warningMessages.join(""))
    }
}

function _sanitizeGenericKey(genericKey) {
    return genericKey.replace(/“|”|\\\\"|\.|:|\n|\s|\'|\\|\,|\?|/g, "")
}

function _pushToDictionary(dictionary, genericKey, extractedKey, extractedValue, language) {
    var transformedGenericKey = config.caseSensitiveSearch ? genericKey : genericKey.toLowerCase()
    transformedGenericKey = _sanitizeGenericKey(transformedGenericKey)

    if (!dictionary[extractedKey]) {
        dictionary[extractedKey] = {
            translationByLanguage: {}
        }
    }
    if (language === "en") {
        dictionary[extractedKey].generic_key = transformedGenericKey
    }
    if (!dictionary[extractedKey].translationByLanguage[language]) {
        dictionary[extractedKey].translationByLanguage[language] = extractedValue
    }
}