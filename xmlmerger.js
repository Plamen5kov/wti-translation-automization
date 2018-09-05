const xmlHelper = require(`./app/xml.parser`)
const langs = [`cs`, `de`, `el`, `en`, `es`, `fr`, `it`, `pl`, `ro`, `ru`, `tr`, `zh`]

for(i in langs) {
    mergeStringXmlFiles(langs[i])
}

function mergeStringXmlFiles(lang) {
    //all merged xml files will be output in this file
    const outputFilePath = `/Users/plamenpetkov/work/repos/androidskrillapp/SkrillPaymentsAndroidApp/src/main/res/values-${lang}/strings_v2.xml`
    
    //xml files you want to merge into one
    inputXmlFilesArray = [
        `/Users/plamenpetkov/work/repos/androidskrillapp/SkrillPaymentsAndroidApp/src/main/res/values-${lang}/strings_v2.xml`,
        `/Users/plamenpetkov/work/temporary/values-${lang}/strings.xml`,
        `/Users/plamenpetkov/work/temporary/values-${lang}/android_strings.xml`
    ]

    function getPromiseArray(inputXmlFilesArray) {
        let promisesArr = []
        for(let i in inputXmlFilesArray) {
            promisesArr.push(xmlHelper.getXmlFileAsJson(inputXmlFilesArray[i]))
        }
        return promisesArr
    }

    Promise.all(getPromiseArray(inputXmlFilesArray)).then((data) => {
        for(let i in data) {
            xmlHelper.xmlJsonToRegularKeyValue(data[i])
        }
        let resolvedJsonMap = xmlHelper.getResolvedJson();
        let preparedJsonForXml = xmlHelper.regularJsonToXmlFormat(resolvedJsonMap)
        xmlHelper.buildXmlFrom(preparedJsonForXml, outputFilePath)
    })
}
