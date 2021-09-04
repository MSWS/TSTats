import { ApplicationCommandPermissionData, Client, Intents } from "discord.js";
import { EmbedGenerator } from "./Generator";
import { Messenger } from "./Messenger";
import { Profile } from "./Profile";
import { ServerData } from "./ServerData";
import { Updater } from "./Updater";
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require("path");

fs.mkdir(path.resolve(__dirname, "./profiles"), () => { });
const commandFiles = fs.readdirSync(path.resolve(__dirname, './commands')).filter((file: string) => file.endsWith('.js'));
const profileFile = fs.readdirSync(path.resolve(__dirname, "./profiles")).filter((file: string) => file.endsWith(".json"));
const commands = new Map<string, any>();
let commandArray: any[] = [];

export let config = require(path.resolve(__dirname, "./config.json"));
export let generator = new EmbedGenerator();
export const client = new Client({
  allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
});
export let servers = loadConfig();
export let start: number;
export const profiles = new Map<string, Profile>();

const rest = new REST({ version: '9' }).setToken(config.token);
const messengerMap = new Map<string, Messenger>();

client.once("ready", () => {
  start = Date.now();
  let serverCount = getServers().length;

  for (let channel of servers.keys()) {
    let c = servers.get(channel);
    if (c != undefined) {
      let mn = new Messenger(c);

      for (let server of c)
        messengerMap.set(server.name, mn);

      new Messenger(c).start(config.discordDelay * 1000, config.discordRate * 1000);
    }
  }
  for (let sd of servers.values())
    for (let server of sd)
      new Updater(server).start(config.sourceDelay * 1000, config.sourceRate * 1000);

  setInterval(() => {
    let count = getPlayerCount();
    client.user?.setPresence({
      status: "online",
      activities: [{
        name: count + " player" + (count == 1 ? "" : "s") + " across " + serverCount + " server" + (serverCount == 1 ? "" : "s"), type: "WATCHING"
      }]
    });
  }, 60000);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  let command: any = commands.get(interaction.commandName);

  if (!command)
    return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
  }
});


loadProfiles();
loadCommands();
registerCommands();
client.login(config.token);

export function getServers(): ServerData[] {
  let result: ServerData[] = [];
  for (let server of servers.values()) {
    for (let s of server)
      result.push(s);
  }
  return result;
}

export function getPlayerCount(): number {
  let total = 0;
  for (let server of getServers())
    total += server.getOnline();
  return total;
}

export function getMaxPlayerCount(): number {
  let total = 0;
  for (let server of getServers())
    total += server.max;
  return total;
}

export function saveConfig() {
  fs.writeFile("./config.json", JSON.stringify(config), { flag: "w+" }, (e: Error) => {
    if (e)
      console.error(e);
  });
}

function loadConfig(): Map<string, ServerData[]> {
  let map = new Map<string, ServerData[]>();
  for (let entry of config["servers"]) {
    let data: ServerData = new ServerData(entry);
    let servers: ServerData[];
    let tmp = map.get(data.channel);
    if (tmp != undefined && tmp != null)
      servers = tmp;
    else
      servers = [];
    servers.push(data);
    map.set(data.channel, servers);
  }
  return map;
}

function loadProfiles() {
  for (let file of profileFile as string) {
    let id = file.substring(0, file.length - ".json".length);
    let profile = new Profile(id);
    profiles.set(id, profile);
  }
}

function loadCommands() {
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.set(command.data.name, command);
    console.log("Registering command %s (data: %s)", command.data.name, command.data);
    commandArray.push(command.data.toJSON());
  }
}

function registerCommands() {
  (async () => {
    let serverPerm: ApplicationCommandPermissionData[] = [{
      id: "767728947370524722",
      type: "ROLE",
      permission: true
    }];
    try {
      for (let guild of await client.guilds.fetch()) {
        console.log("Registering commands...");
        console.log("Guild: " + guild[0]);

        await rest.put(
          Routes.applicationGuildCommands(config.clientId, guild[0]), { body: commandArray },
        ).then(async () => {
          let commands = await (await guild[1].fetch()).commands.fetch();
          for (let cmd of commands) {
            await cmd[1].permissions.add({ permissions: serverPerm });
          }
        });
      }
    } catch (error) {
      console.error(error);
    }
  })();
}

export function getData(name: string): ServerData | null {
  for (let server of getServers()) {
    if (server.name == name)
      return server;
  }
  for (let server of getServers()) {
    if (server.name.toLowerCase() == name.toLowerCase())
      return server;
  }
  for (let server of getServers()) {
    if (server.name.toLowerCase().includes(name.toLowerCase()))
      return server;
  }
  return null;
}


export function getMessenger(name: string): Messenger | undefined {
  return messengerMap.get(name);
}

export function getFirstMessenger(channel: string): Messenger {
  for (let msg of messengerMap.values()) {
    let channels = msg.getChannels();
    if (!channels.includes(channel))
      continue;
    return msg;
  }

  return new Messenger([]);
}