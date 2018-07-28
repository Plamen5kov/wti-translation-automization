var path = require(`path`)
var fs = require(`fs`)

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
    ensureDirectoryExistence
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
    deleteFolderRecursive(androidWtiCopyToPath)
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
