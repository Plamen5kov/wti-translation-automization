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
    var diffDataIos = helpers.checkWhatsMissing(data.iosData, data.androidData, `ios`)
    var diffDataAndroid = helpers.checkWhatsMissing(data.androidData, data.iosData, `android`)

    helpers.generateReportFile(diffDataAndroid.differentGenericKeys,
        diffDataIos.differentGenericKeys,
        diffDataAndroid.equalGenericKeys)
})