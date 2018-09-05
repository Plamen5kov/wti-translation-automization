const xml2js = require(`xml2js`)
const fs = require(`fs`)
const path = require(`path`)

const helpers = require(`./helpers`)
const translationsTemplatePath = path.join(__dirname, `translations-template.xml`)

module.exports = {
    getXmlFileAsJson,
    getTemplateAsJson,
    buildXmlFrom,
    translationsTemplatePath,
    xmlJsonToRegularKeyValue,
    getResolvedJson,
    regularJsonToXmlFormat
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

function buildXmlFrom(content, outFilePath) {
    var builder = new xml2js.Builder({
        headless: true,
        renderOpts: {
            pretty: true,
            indent: `    `,
            newline: `\n`
        }
    })
    const prefix = `<?xml version="1.0" encoding="utf-8"?>\n`
    var xml = `${prefix}${builder.buildObject(content)}`
    try { fs.unlinkSync(outFilePath) } catch (e) { }
    fs.writeFileSync(outFilePath, xml, { encoding: helpers.getEncoding(`android`) })
}

let keyValueMap = {};
function xmlJsonToRegularKeyValue(data) {
    // if(data && data.resources && data.resources.string)
        for(let index in data.resources.string) {
                keyValueMap[data.resources.string[index].$.name] = data.resources.string[index]._
        }
}

function getResolvedJson() {
    return keyValueMap;
}

let count = 0
function regularJsonToXmlFormat(data) {
    let xmlFormat = {
        resources: {
            string: []
        }
    }
    
    for(let cItem in data) {
        xmlFormat.resources.string[count] = {_: "",$: {name: ""}}
        xmlFormat.resources.string[count]._ = cItem._ = data[cItem]
        xmlFormat.resources.string[count].$.name = cItem
        count++
    }

    return xmlFormat
}