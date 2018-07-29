const _ = require(`lodash`)

const helpers = require(`./helpers`)
const pull = require(`./wti.pull`)
const loadStringsApi = require(`./load.strings`)

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
    var diffDataAndroid = helpers.checkWhatsMissing(data.iosData.iosTranslationsByGenericKey, data.androidData.androidTranslationsByGenericKey, `ios`)
    var diffDataIos = helpers.checkWhatsMissing(data.androidData.androidTranslationsByGenericKey, data.iosData.iosTranslationsByGenericKey, `android`)

    syncAndroidAndIosFiles(diffDataAndroid.differentGenericKeys,
        diffDataIos.differentGenericKeys,
        data.iosData,
        data.androidData)

    const missingFromIosFileName = "missing-from-ios.txt"
    var specificAndroidKeysMissingFromIos = []
    _(diffDataIos.differentGenericKeys).forEach((generic_key) => {
        var originalAndroidKey = data.androidData.androidGenericKeyToSpecificKey[generic_key]
        var lineToWrite = `${originalAndroidKey} = ${generic_key}`
        specificAndroidKeysMissingFromIos.push(lineToWrite)
    })
    helpers.writeToNewFile(missingFromIosFileName, specificAndroidKeysMissingFromIos)

    const missingFromAndroidName = "missing-from-android.txt"
    var specificIosKeysMissingFromAndroid = []
    _(diffDataAndroid.differentGenericKeys).forEach((generic_key) => {
        var originalIosKey = data.iosData.iosGenericKeyToSpecificKey[generic_key]
        specificIosKeysMissingFromAndroid.push(originalIosKey)
    })
    helpers.writeToNewFile(missingFromAndroidName, specificIosKeysMissingFromAndroid)
    
    // helpers.generateReportFile(diffDataIos.differentGenericKeys,
    //     diffDataAndroid.differentGenericKeys,
    //     diffDataIos.equalGenericKeys)
})

function syncAndroidAndIosFiles(missingKeysInIos, missingKeysInAndroid, allIosData, allAndroidData) {
    var originalToGenericKey = {}
}