const readline = require(`readline`);

module.exports = {
    runPromptWithQuestion
}
function runPromptWithQuestion(missingFromIosFileName, missingFromAndroidFileName) {
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: `I'm about to start the migration of the android and ios strings.
            Before you make your choice:
                    Know you can go in the ios or android file and leave only the keys that you want translated:
                    * iOS keys that will be migrated: "${missingFromIosFileName}"
                    * Android keys that will be migrated: "${missingFromAndroidFileName}"
                    
                    Feel free to delete the lines with the keys you don't want to migrate and make your choice!
            
            Your options:
                    1) migrate only ios
                    2) migrate only android
                    3) migrate both
                    4) cancel
                `
        });

        if (process.stdin.isTTY) {
            rl.prompt();
        } else {
            resolve(3)
        }

        function isCorrectChoice(input) {
            if (input === 1 || input === 2 || input === 3 || input === 4) {
                return true
            }
            return false
        }

        rl.on(`line`, (line) => {
            var choice = Number.parseInt(line)
            if (isCorrectChoice(choice)) {
                resolve(choice)
            } else {
                rl.prompt()
            }
        }).on(`close`, () => {
            resolve(true)
        }).on(`SIGINT`, () => {
            reject(true)
        })
    })
}