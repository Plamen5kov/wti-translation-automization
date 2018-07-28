const fs = require(`fs`)
const pull = require(`./wti.pull`)
const _ = require(`lodash`)
const helpers = require(`./helpers`)
const loadStringsApi = require(`./load.strings`)
const config = require(`./configuration.json`)
const path = require(`path`)

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
    _checkWhatsMissing(data.iosData, data.androidData, `ios`) //got in android missing in ios
    _checkWhatsMissing(data.androidData, data.iosData, `android`) //got in ios missing in android
})

// PRIVATE
/**
 * Check what genericKeys are missing from @param fillInArray
 * @param {Array} checkFromArray 
 * @param {Array} fillInArray
 */
function _checkWhatsMissing(checkFromArray, fillInArray, platform) {
    function getGenericKey(item) {
        return item.generic_key
    }
    var checkFromArrayGenericKeys = _.chain(checkFromArray).map(getGenericKey).value()
    var fillInArrayGenericKeys = _.chain(fillInArray).map(getGenericKey).value()

    var equalGenericKeys = {}
    var differentGenericKeys = _.differenceWith(checkFromArrayGenericKeys, fillInArrayGenericKeys, (iosItem, androidItem) => {
        const isEqual = iosItem === androidItem
        if (isEqual) equalGenericKeys[iosItem] = true

        return isEqual
    })
    _generateReportFile(equalGenericKeys, differentGenericKeys, platform)
    return differentGenericKeys
}

function _generateReportFile(equalGenericKeys, differentGenericKeys, platform) {
    var reportFileName = `${platform}-${config.reportFilePath}`

    try { fs.unlinkSync(reportFileName) } catch (e) { }
    fs.writeFileSync(reportFileName, `### Equal ios and android translations: Size: ${_.size(equalGenericKeys)} ###\n`)
    fs.appendFileSync(reportFileName, `${_.keys(equalGenericKeys).join(`\n`)}`)
    fs.appendFileSync(reportFileName, `\n\n\n### Translations only in ${platform}: Size: ${differentGenericKeys.length} ###\n`)
    fs.appendFileSync(reportFileName, `${differentGenericKeys.join(`\n`)}`)
    const reportAbsolutePath = path.join(__dirname, path.sep, `..`, path.sep, reportFileName)
    
    console.log(`### Checkout report\n${reportAbsolutePath}`)
}