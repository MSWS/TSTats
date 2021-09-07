# PT (Player Tracker)
### PT is a JavaScript Discord Bot originally intended for use with Source Servers. This script uses [Gamedig's](https://www.npmjs.com/package/gamedig) library.

## Installation
1. Install Typescript - `npm install typescript -g` 
2. Install Required libraries - `npm install [Library]` (See `package.json` for libraries used)
3. Initialize project - `npm init -y`
4. Compile/Build source - `npx src/index.ts --downlevelIteration`
5. Run program - `npm run build`

## Creation
Note: In order for slash commands to function properly, the bot must be given the **applications.commands** OAuth2 scope permission. 

## Permissions
| Administrator   | ❌   | Manage Nicknames     | ❌   | Mention Everyone    | ❌   |
| --------------- | --- | -------------------- | --- | ------------------- | --- |
| Audit Log       | ❌   | Manage Emojis        | ❌   | Use External Emojis | ❌   |
| Server Insights | ❌   | Manage Webhooks      | ❌   | Add Reactions       | ❌   |
| Manage Server   | ❌   | View Channels        | ✔️   | Mute Members        | ❌   |
| Manage Roles    | ❌   | Send Messages        | ✔️   | Deafen Members      | ❌   |
| Manage Channels | ✔️   | Send TTS Messages    | ❌   | Move Members        | ❌   |
| Kick Members    | ❌   | Manage Messages      | ✔️   | Use Voice Activity  | ❌   |
| Ban Members     | ❌   | Embed Links          | ✔️   | Priority Speaker    | ❌   |
| Create Invite   | ❌   | Attach Files         | ✔️   | Connect/Speak/Video | ❌   |
| Change Nickname | ❌   | Read Message History | ✔️   | Top Role Required   | ❌   |

## Setup
Note: By default, only the highest role and roles that have access to `MANAGE_GUILD` permission will have access to all commands. Users with these roles have may give/revoke additional access to `/addserver` and `/deleteserver` by doing `/giveaccess [role]` or `/revokeaccess [role]`.

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
"topicRate": 300, // The delay (in seconds) that each channel's topic will be refreshed (note: rate limit is 600)
"useServerName": true, // If true, embeds will use the server's live name, if false, will use the configured name
"lineLength": 60, // Maximum line length for embeds
"cacheRate": 5, // How often (in minutes) an image should be cached for