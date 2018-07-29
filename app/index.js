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
    var diffDataIos = _checkWhatsMissing(data.iosData, data.androidData, `ios`)
    var diffDataAndroid = _checkWhatsMissing(data.androidData, data.iosData, `android`)

    _generateReportFile(diffDataAndroid.differentGenericKeys,
        diffDataIos.differentGenericKeys,
        diffDataAndroid.equalGenericKeys)
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

    return {
        differentGenericKeys,
        equalGenericKeys
    }
}

function _generateReportFile(missingInIos, missingInAndroid, equal) {
    var reportFileName = `${config.reportFileSuffix}`

    helpers.writeToNewFile(reportFileName,
        `### Equal ios and android translations: Size: ${_.size(equal)}\n`,
        equal,
        `\n\n\n### Translations missing in android Size: ${missingInAndroid.length}\n`,
        missingInAndroid,
        `\n\n\n### Translations missing in ios Size: ${missingInIos.length}\n`,
        missingInIos
    )

    const reportAbsolutePath = path.join(__dirname, path.sep, `..`, path.sep, reportFileName)
    console.log(`### Checkout report\n${reportAbsolutePath}`)
}

// TODO: plamen5kov: problems to think about:
/**
 * 
 * generic_key === english translaction
 *      - "wait let me take a selfie" -> different quotes on android and ios causes different generic_key
 *      - same generic_key for different original keys -> will this be a problem when matching ios and android state
 *      - case sensitive/insensitive -> is it a problem if we do case unsensitive for generic_keys
 *      - we can have all strings and keys in both places and then clean unused resources bot in the xcode and android studio projects
 * 
 * 
 simmlilar strings:
    Now you can use your fingerprint to log into the Skrill app instead of your PIN.\n\nPlease note that any fingerprint registered on               your device          can then be used to login to the app.\n\nYou can continue using the app by logging in with your app PIN.
    now you can use your fingerprint to log into the skrill app instead of your pin.\n\nplease note that any fingerprint registered under touchid in your device settings can then be used to login to the app.\n\nyou can continue using the app by logging in with your app pin.

    an error was encountered during the document submission an  process\nplease try again or contact skrill customer support for assistance
    an error was encountered during the document submission process please try again or contact skrill customer support for assistance
       
    cancelled
    canceled

    conversion rate:	
    conversion rate: 1 {placeholder} = {placeholder} {placeholder}


device speciffic examples:
    device is rooted
    device is jailbroken
what?
    Compte chèque / Toza Koza
 */