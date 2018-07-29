var path = require(`path`)
var fs = require(`fs`)
const _ = require(`lodash`)
const config = require(`./configuration.json`)

var { androidWtiPath,
    androidWtiCopyToPath,
    iosWtiPath,
    iosWtiCopyToPath,
    supportedCountriesIos,
    supportedCountriesAndroid,
    iosCustomPath,
    androidCustomPath,
    disableLogging
} = require(`./configuration.json`)

module.exports = {
    iterateOverPulledFiles,
    deleteFolderRecursive,
    clearOutFolder,
    moveStrings,
    ensureDirectoryExistence,
    writeToNewFile,
    generateReportFile,
    checkWhatsMissing
}

/**
 * Iterate through platform files with translations. You can see the path to those files in the "configuration.json" file.
 * @param {String} platform 
 * @param {Function} callback 
 */
function iterateOverPulledFiles(platform, callback) {

    var customPathPattern = _getCustomPathPattern(platform)
    var supportedCountries = _getSupportedCountries(platform)
    for (var i in supportedCountries) {
        var currentSupportedCountry = supportedCountries[i]
        var customPath = customPathPattern.replace(/%\w+%/g, currentSupportedCountry)

        var platformWtiPath = _getWtiFromPath(platform)
        var fileToCopy = path.join(platformWtiPath, customPath)

        var platformWtiCopyPath = _getWtiToPath(platform)
        var fileToSave = path.join(platformWtiCopyPath, customPath)

        if(fileToCopy.indexOf(`zh-Hans`) != -1) {
            fileToSave = fileToSave.replace(`zh-Hans`, `zh`)
        }
        callback({ fileToCopy, fileToSave })
    }
}

/**
 * Delete fs path recursively
 * @param {String} path 
 */
function deleteFolderRecursive(path) {
    if (fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function (file, index) {
            var curPath = path + "/" + file
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath)
            } else {
                try { fs.unlinkSync(curPath) } catch (e) { }
            }
        })
        fs.rmdirSync(path)
    }
}

/**
 * Delete local folders containing translations
 * @param {String} platform 
 */
function clearOutFolder(platform) {
    var deleteDolder = _getWtiToPath(platform)
    var wtiCopyToPath = _getWtiToPath(platform)
    deleteFolderRecursive(wtiCopyToPath)
    console.log(`### Deleted ${deleteDolder}`)
}

/**
 * Move translated string to local folder
 * @param {String} platform 
 */
function moveStrings(platform) {
    clearOutFolder(platform)

    iterateOverPulledFiles(platform, (data) => {
        ensureDirectoryExistence(data.fileToSave)
        fs.copyFileSync(data.fileToCopy, data.fileToSave, () => { })
        if (!disableLogging) console.log(`Copied files from\n"${data.fileToCopy}" to\n"${data.fileToSave}"\n`)
    })
    console.log(`### Copied files from\n"${_getWtiFromPath(platform)}" to\n"${_getWtiToPath(platform)}"\n`)
}

/**
 * Make sure "filePath" exists
 * @param {String} filePath 
 */
function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath)
    if (fs.existsSync(dirname)) {
        return true
    }
    ensureDirectoryExistence(dirname)
    fs.mkdirSync(dirname)
}

/**
 * Write arguments to file
 * @param {String} fileName
 * @param {Object} objects/arrays/strings to write
 */
function writeToNewFile() {
    const DEFAULT_FILE_PATH = `default-output-file.txt`
    var filePath = DEFAULT_FILE_PATH
    if (arguments.length >= 1) {
        if (typeof arguments[0] === `string`) {
            filePath = arguments[0]
            try { fs.unlinkSync(filePath) } catch (e) { }
        } else {
            throw `The filename you provided ${arguments[0]} is not a string.`
        }
    }

    if (arguments.length >= 2) {
        for (var i in arguments) {
            var currentItem = arguments[Number.parseInt(i) + 1]
            if (currentItem instanceof Array) {
                fs.appendFileSync(filePath, `${currentItem.join(`\n`)}`)
            } else if (currentItem instanceof Object) {
                fs.appendFileSync(filePath, `${_.keys(currentItem).join(`\n`)}`)
            } else if (typeof currentItem === `string`) {
                fs.appendFileSync(filePath, currentItem)
            }
        }
    }
}

/**
 * Check what genericKeys are missing from @param fillInArray
 * @param {Array} checkFromArray 
 * @param {Array} fillInArray
 */
function checkWhatsMissing(checkFromArray, fillInArray, platform) {
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

function generateReportFile(missingInIos, missingInAndroid, equal) {
    var reportFileName = `${config.reportFileSuffix}`

    writeToNewFile(reportFileName,
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

// PRIVATE
function _getWtiFromPath(platform) {
    return platform == "android" ? androidWtiPath : iosWtiPath
}

function _getWtiToPath(platform) {
    return platform == "android" ? androidWtiCopyToPath : iosWtiCopyToPath
}

function _getCustomPathPattern(platform) {
    return platform == "android" ? androidCustomPath : iosCustomPath
}

function _getSupportedCountries(platform) {
    return platform == "android" ? supportedCountriesAndroid : supportedCountriesIos
}
