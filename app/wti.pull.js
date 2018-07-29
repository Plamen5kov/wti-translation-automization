const command = require('child_process').spawn

const config = require(`./configuration.json`)

module.exports = {
    wtiPull
}

/**
 * Do wti pull in location pointed to by: "config.iosWtiPath","config.androidWtiPath" key in the "configuration.json" file depending on platform parameter.
 * @param {String} platform
 * @returns {Promise} status code if successfull or err otherwise
 */
function wtiPull(platform) {
    return new Promise((resolve, reject) => {
        let process = command(`wti`, [`pull`], { cwd: platform == `android` ? config.androidWtiPath : config.iosWtiPath })
        process.stdout.on('data', (data) => {
            if (!config.disableLogging) console.log(`stdout: ${data}`)
        })
        process.stderr.on('data', (data) => {
            if (!config.disableLogging) console.log(`stderr: ${data}`)
            reject(data)
        })
        process.on('close', (code) => {
            if (!config.disableLogging) console.log(`child process exited with code ${code}`)
            console.log(`### Done pulling ${platform} files`)
            resolve(true)
        })
    })
}