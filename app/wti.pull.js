var command = require('child_process').spawn
var {
    androidWtiPath,
    iosWtiPath,
    disableLogging
} = require(`./configuration.json`)
var helpers = require("./helpers")
var fs = require(`fs`)
var path = require(`path`)

module.exports = {
    wtiPull
}

/**
 * Do wti pull in location pointed to by: "iosWtiPath","androidWtiPath" key in the "configuration.json" file depending on platform parameter.
 * @param {String} platform
 * @returns {Promise} status code if successfull or err otherwise
 */
function wtiPull(platform) {
    return new Promise((resolve, reject) => {
        let process = command(`wti`, [`pull`], { cwd: platform == "android" ? androidWtiPath : iosWtiPath })
        process.stdout.on('data', (data) => {
            if (!disableLogging) console.log(`stdout: ${data}`)
        })
        process.stderr.on('data', (data) => {
            if (!disableLogging) console.log(`stderr: ${data}`)
            reject(data)
        })
        process.on('close', (code) => {
            if (!disableLogging) console.log(`child process exited with code ${code}`)
            console.log(`### Done pulling ${platform} files`)
            resolve(true)
        })
    })
}