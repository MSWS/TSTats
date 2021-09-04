# EdgeBot
### PT is a JavaScript Discord Bot originally intended for use with Source Servers. This script uses [Gamedig's](https://www.npmjs.com/package/gamedig) library.

## Installation
1. Install Typescript - `npm install typescript -g` 
2. Install Gamedig - `npm install gamedig`
3. Initialize project - `npm init -y`
4. Compile/Build source - `npx src/index.ts --downlevelIteration`
5. Run program - `npm run build`

## Configuration
### All Configuration is done through the `config.json`

```json
/**
    Global Settings
**/
"token": "", // The token of the bot
"discordRate": 60, // The rate (in seconds) that the bot will update the embeds
"sourceRate": 60, // The rate (in seconds) that the bot will query the game servers
"discordDelay": 10, // The delay (in seconds) that the program will wait to start sending messages
"sourceDelay": 0, // The delay (in seconds) that the program will wait to start querying game servers
"useSteamName": true, // If true, embeds will use the server's live name, if false, will use the configured name
"lineLength": 60, // Maximum line length for embeds
"cacheRate": 5, // How often (in minutes) an image should be cahced for
/**
    Server Settings
**/
"name": "EdgeGamers Jailbreak", // Name of the server (should be unique)
"channel": "802436744367570946", // Channel ID to send embed to
"ip": "74.91.113.83:27015", // IP of the server (ip:port)
"color": "", // (OPTIONAL) Color that the embed should have, if empty, color will be dynamic
"type": "csgo" // (OPTIONAL) Type of gameserver (csgo, css, etc. see https://www.npmjs.com/package/gamedig)
"overrideName": "" // (OPTIONAL) If present, the embed will use this string instead of the live name
```

