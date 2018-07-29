var xml2js = require(`xml2js`)
var fs = require(`fs`)
var helpers = require(`./helpers`)
var translationsTemplatePath = "translations-template.xml"
var path = require(`path`)

function getXmlFileAsJson(filePath) {
    return new Promise(function (resolve, reject) {
        var translationsTemplate = fs.readFileSync(`${filePath}`, { encoding: helpers.getEncoding(`android`) })
        xml2js.parseString(translationsTemplate, function (err, result) {
            if (err) {
                return reject(err)
            }
            resolve(result)
        })
    })
}

function getTemplateAsJson(name, value) {
    value = value || helpers.NO_TRANSLATION_FOUND
    var templateAsJson = {}
    templateAsJson._ = value
    templateAsJson.$ = {
        name: name
    }
    return templateAsJson
}

function buildXmlFrom(oldContent, outFilePath) {
    var builder = new xml2js.Builder({
        headless: true
    })
    var xml = builder.buildObject(oldContent)
    try { fs.unlinkSync(outFilePath) } catch (e) { }
    fs.writeFileSync(outFilePath, xml, { encoding: helpers.getEncoding(`android`) })
}

module.exports = {
    getXmlFileAsJson,
    getTemplateAsJson,
    buildXmlFrom
}