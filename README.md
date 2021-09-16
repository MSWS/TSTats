# PT (Player Tracker)
### PT is a JavaScript Discord Bot originally intended for use with Source Servers. This script uses [Gamedig's](https://www.npmjs.com/package/gamedig) library.

## Installation

1. npm init --yes
2. npm install copyfiles --save-dev
3. npm install discord.js --save-dev
4. npm install gamedig --save-dev
5. npm install typescript --save-dev
6. npm run execute
7. tsc

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

```jsonc
/**
    Global Settings
**/
{
    "token": "", // Token of the bot
    "discordRate": 60, // Rate that Discord messages will be updated
    "sourceRate": 60, // Rate that game servers will be updated
    "discordDelay": 3, // Initial discord message delay
    "sourceDelay": 0, // Initial source server delay
    "presenceRate": 60, // Rate that presence will be updated
    "useServerName": true, // If true, embeds will use the live server's name
    "lineLength": 50, // Max line length for embeds 
    "cacheRate": 5, // Minutes to cache graphs for
    "addServerPermission": "MANAGE_CHANNELS", // Required permission to add servers
    "elevatedPermission": "MANAGE_GUILD", // Required permission to give other roles access to add servers / give additional access
    "ephemeralize": { // Ephemeralizing messages causes them to only be shown to the source (https://support.discord.com/hc/en-us/articles/1500000580222-Ephemeral-Messages-FAQ)
        "commands": {
            "onComplete": false,
            "onFail": true
        },
        "ping": false,
        "purge": true,
        "restart": false,
        "stats": {
            "global": false,
            "guild": false
        },
        "version": false,
        "addserver": false,
        "deleteserver": false,
        "giveaccess": false,
        "notify": {
            "list": true,
            "clear": false,
            "add": false
        },
        "revokeaccess": false,
        "servers": true,
        "editserver": false
    },
    "build": 0
}
```