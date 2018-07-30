const xml2js = require(`xml2js`)
const fs = require(`fs`)
const path = require(`path`)

const helpers = require(`./helpers`)
const translationsTemplatePath = path.join(__dirname, `translations-template.xml`)

module.exports = {
    getXmlFileAsJson,
    getTemplateAsJson,
    buildXmlFrom,
    translationsTemplatePath
}

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
        headless: true,
        renderOpts: {
            pretty: true,
            indent: `    `,
            newline: `\n`
        }
    })
    const prefix = `<?xml version="1.0" encoding="utf-8"?>\n`
    var xml = `${prefix}${builder.buildObject(oldContent)}`
    try { fs.unlinkSync(outFilePath) } catch (e) { }
    fs.writeFileSync(outFilePath, xml, { encoding: helpers.getEncoding(`android`) })
}
