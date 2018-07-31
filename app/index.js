const _ = require(`lodash`)
const helpers = require(`./helpers`)
const xmlHelper = require(`./xml.parser`)
const basePath = `/Users/plamenpetkov/work/repos/androidskrillapp/SkrillPaymentsAndroidApp/src/main/res/values`
const pathToMasterFile = `${basePath}-en/strings_v2.xml`
const pathToOurSourceControlFile = `${basePath}/strings_v2.xml`
const path = require(`path`)
const fs = require(`fs`)

const masterFileName = "master.file.txt"
const sourceControlFile = "source..control.file.txt"

getAndWrite(pathToMasterFile, masterFileName)
getAndWrite(pathToOurSourceControlFile, sourceControlFile)

function getAndWrite(inputPath, outPath) {

    xmlHelper.getXmlFileAsJson(inputPath).then((sourceControlFileAsJson) => {
        var keyValLines = []
        var valKeyLines = []

        _(sourceControlFileAsJson.resources.string).forEach((item) => {
            var name = item.$.name
            var val = item._
            var keyValWrite = `${name} = ${val}`
            var valKeyWrite = `${val} = ${name}`
            
            keyValLines.push(keyValWrite)
            keyValLines.sort()

            valKeyLines.push(valKeyWrite)
            valKeyLines.sort()
        })

        const keyFirstPrefix = "KEY.FIRST-"
        const valFirstPrefix = "VAL.FIRST-"
        createNewFile(keyFirstPrefix, outPath, keyValLines)
        createNewFile(valFirstPrefix, outPath, valKeyLines)
    })

    function createNewFile(prefix, outpath, arrToWrite) {
        var wholePath = `${prefix}${outPath}`
        try { fs.unlinkSync(wholePath) } catch (e) { }
        helpers.appendOrCreateFile(wholePath, arrToWrite, { joinSeparator: `\n` })
    }
}