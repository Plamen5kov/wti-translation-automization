var xml2js = require('xml2js')
var fs = require("fs")
var translationsTemplatePath = "translations-template.xml"

function getXmlFileAsJson(filePath) {
    return new Promise(function (resolve, reject) {
        var translationsTemplate = fs.readFileSync(filePath, {encoding: "UTF-8"})
        xml2js.parseString(translationsTemplate, function (err, result) {
            if(err) {
                return reject(err)
            }
            resolve(result)
        })
    })
}

function getTemplateAsString(name, value) {
    templateAsJson.string._ = value
    templateAsJson.string.$.name = name
    return templateAsJson.string
}

function buildXmlFrom(oldContent, newContent, outFilePath) {
    oldContent.resources.string.push(newContent)
    //add check for the same property
    
    var builder = new xml2js.Builder()
    var xml = builder.buildObject(oldContent)
    fs.writeFileSync(outFilePath, xml)
}

module.exports = {
    getXmlFileAsJson,
    getTemplateAsString,
    buildXmlFrom
}