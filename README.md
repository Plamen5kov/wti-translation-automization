## What is this?
An attempt at a tool to automate string translation synchronization between Android and Ios.

*The main idea:* When an iOS or an Android team requests translation and that translation is done, this translation will be syncronized between the two repos with a run of a command.

Currently the tool `wti pulls` the strings and makes a local copy and DOES NOT operate on the original files!

## Prerequisites
* `git clone ssh://git@bitbucket.neterra.paysafe.com:7999/mobile/androidskrillapp.git`
* `git clone ssh://git@bitbucket.neterra.paysafe.com:7999/mobile/iosskrillapp.git`
* globaly installed [wti tool](https://github.com/AtelierConvivialite/webtranslateit#installation)

>You'll need these repos so you can point the tool to the folder inside each repo pointing to the `.wti` file.

## How to run:
* `git clone ssh://git@bitbucket.neterra.paysafe.com:7999/~plamenpetkov/webtranslateit-tool.git`
* `cd webtranslateit-tool`
* `npm install`
* open `app/configuration.json` and set up your environment
* `node app/index.js`
* migrated string files are in the `pulled/(ios/android)` folder.

>Note: If you're going to copy paste directly to iOS strings folder, rename `zh` to `zh-Hans` first.

## Problems to think about:
*generic_key === english translaction*

* "wait let me take a selfie" *> different quotes on android and ios causes different generic_key
* same generic_key for different original keys *> will this be a problem when matching ios and android state
* case sensitive/insensitive *> is it a problem if we do case unsensitive for generic_keys
* we can have all strings and keys in both places and then clean unused resources bot in the xcode and android studio projects
  
 *simmlilar strings:*

Now you can use your fingerprint to log into the **** app instead of your PIN.\n\nPlease note that any fingerprint registered on               your device          can then be used to login to the app.\n\nYou can continue using the app by logging in with your app PIN.
now you can use your fingerprint to log into the **** app instead of your pin.\n\nplease note that any fingerprint registered under touchid in your device settings can then be used to login to the app.\n\nyou can continue using the app by logging in with your app pin.

 ```
    an error was encountered during the document submission an  process\nplease try again or contact **** customer support for assistance
    an error was encountered during the document submission process please try again or contact **** customer support for assistance
       
    cancelled
    canceled

    conversion rate:	
    conversion rate: 1 {placeholder} = {placeholder} {placeholder}
```

*device speciffic examples:*

```
    device is rooted
    device is jailbroken
```

*what is Toza Koza and why is it in every android CAK translation?*

```
Compte chèque / Toza Koza
```
 