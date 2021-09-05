import { ApplicationCommandPermissionData, Client, Intents } from "discord.js";
import { EmbedGenerator } from "./Generator";
import { Messenger } from "./Messenger";
import { ClientProfile } from "./ClientProfile";
import { ServerData } from "./ServerData";
import { Updater } from "./Updater";
import { GuildProfile } from "./GuildProfile";
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require("path");

// Create the directories before we fetch them
fs.mkdir(path.resolve(__dirname, "./profiles"), () => { });
fs.mkdir(path.resolve(__dirname, "./configs"), () => { });

export const clientProfiles = new Map<string, ClientProfile>();

const commandFiles = fs.readdirSync(path.resolve(__dirname, './commands')).filter((file: string) => file.endsWith('.js')); // Command Directory
const profileFile = fs.readdirSync(path.resolve(__dirname, "./profiles")).filter((file: string) => file.endsWith(".json")); // Client Profiles Directory
const configFiles = fs.readdirSync(path.resolve(__dirname, "./configs")).filter((file: string) => file.endsWith(".json")); // Guild Profiles Directory

const commands = new Map<string, any>(); // Map for execution
const commandArray: any[] = []; // Array for registrating commands

export let config = require(path.resolve(__dirname, "./config.json")); // Main config
export let generator = new EmbedGenerator();
export const client = new Client({
  allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
});

export let start: number;

const rest = new REST({ version: '9' }).setToken(config.token);
const messengerMap = new Map<string, Messenger>();
const guildProfiles = new Map<string, GuildProfile>();

export let guilds = loadGuildConfigs();


loadClientProfiles();
loadCommands();
registerCommands();

client.once("ready", () => {
  start = Date.now();
  let serverCount = getServers().length;

  for (let [guild, data] of guilds.entries()) {
    let msg = new Messenger(data);
    messengerMap.set(guild, msg);
    msg.start(config.discordDelay * 1000, config.discordRate * 1000);
  }

  for (let server of getServers())
    new Updater(server).start(config.sourceDelay * 1000, config.sourceRate * 1000);

  setInterval(() => {
    let count = getPlayerCount();
    client.user?.setPresence({
      status: "online",
      activities: [{
        name: count + " player" + (count == 1 ? "" : "s") + " across " + serverCount + " server" + (serverCount == 1 ? "" : "s"), type: "WATCHING"
      }]
    });
  }, config.topicRate * 1000);
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

client.login(config.token);

/**
 * Returns all the servers that are loaded
 * @returns Array of servers across all guilds
 */
export function getServers(): ServerData[] {
  let result: ServerData[] = [];

  for (let server of guildProfiles.keys()) {
    for (let s of getGuildServers(server))
      result.push(s);
  }
  return result;
}

/**
 * Returns the servers that belong to the specified guild
 * @param guild The guild whose servers to get
 * @returns An array of servers, or empty if none
 */
export function getGuildServers(guild: string): ServerData[] {
  let profile = guildProfiles.get(guild);
  if (!profile)
    return new GuildProfile(guild).servers;
  return profile.servers;
}

/**
 * Returns the total amount of players online on the given servers
 * @param servers The servers to get online player count from
 * @returns The total amount of online players
 */
export function getPlayerCount(servers?: ServerData[]): number {
  let total = 0;
  for (let server of (servers ? servers : getServers()))
    total += server.getOnline();
  return total;
}

/**
 * Returns the max amount of players online on the given servers
 * @param servers The servers to get max online players from
 * @returns The max amount of online players
 */
export function getMaxPlayerCount(servers?: ServerData[]): number {
  let total = 0;
  for (let server of (servers ? servers : getServers()))
    total += server.max;
  return total;
}

/**
 * Saves the bot's config.
 */
export function saveConfig() {
  fs.writeFile("./config.json", JSON.stringify(config), { flag: "w+" }, (e: Error) => {
    if (e)
      console.error(e);
  });
}

/**
 * Loads guild profiles and assigns server arrays
 * Populates guildProfiles map
 * @returns Map of guild IDs to server data array
 */
function loadGuildConfigs(): Map<string, ServerData[]> {
  for (let file of configFiles as string) {
    let id = file.substring(0, file.length - ".json".length);
    let profile = new GuildProfile(id);
    profile.load();
    guildProfiles.set(id, profile);
  }
  let result = new Map<string, ServerData[]>();
  for (let profile of guildProfiles.values()) {
    result.set(profile.id, profile.servers);
  }
  return result;
}

/**
 * Loads client profiles from the profileFile, and populates the clientProfiles map
 */
function loadClientProfiles() {
  for (let file of profileFile as string) {
    let id = file.substring(0, file.length - ".json".length);
    let profile = new ClientProfile(id);
    profile.load();
    clientProfiles.set(id, profile);
  }
}

/**
 * Loads and populates both the commands map (for execution) and commandArray (for registration).
 */
function loadCommands() {
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.set(command.data.name, command);
    console.log("Registering command %s (data: %s)", command.data.name, command.data);
    commandArray.push(command.data.toJSON());
  }
}


/**
 * Registers commands and updates the permissions via updatePermissions.
 * @param guild The guild to update commands for, if not specified, updates all guild's commands
 */
export function registerCommands(guild?: string) {
  (async () => {
    if (guild) {
      client.guilds.cache.get(guild)?.fetch().then(g => {
        rest.put(
          Routes.applicationGuildCommands(config.clientId, guild[0]), { body: commandArray },
        );
      });
      return;
    }
    for (let guild of await client.guilds.fetch()) {
      registerCommands(guild[0]);
    }
  })();
  updatePermissions(guild);
}

/**
 * Updates the specified guild's command permissions. By default, the highest role has access to all commands. Any role that has access to manage the guild also has access to all commands.
 * @param guild The guild to update permissions for, if not specified, updates all guild's permissions
 */
export function updatePermissions(guild?: string) {
  (async () => {
    if (guild) {
      client.guilds.cache.get(guild)?.fetch().then(async g => {
        let serverPerm: ApplicationCommandPermissionData[] = [];
        g.roles.fetch().then(roles => {
          for (let role of roles) {
            if (!role[1].permissions.has("MANAGE_GUILD") && !getGuildProfile(g.id).elevated.includes(role[0]))
              continue;
            serverPerm.push({
              id: role[0],
              permission: true,
              type: "ROLE"
            })
          }
        });
        let commands = g.commands.fetch();
        for (let cmd of await commands) {
          await cmd[1].permissions.set({ permissions: serverPerm });
        }
      });
      return;
    }
    for (let guild of await client.guilds.fetch()) {
      updatePermissions(guild[0]);
    }
  })();
}

/**
 * Gets the ServerData given the guild and name.
 * @param guild The guild to search.
 * @param name The server name. Names should be unique.
 * @param strict If true, will find the closest match. If false, will only return exact matches.
 * @returns The ServerData, or undefined if none is found.
 */
export function getData(guild: string, name: string, strict: boolean = false): ServerData | undefined {
  let servers = getGuildServers(guild);
  for (let server of servers) {
    if (server.name == name)
      return server;
  }
  if (strict)
    return undefined;
  for (let server of servers) {
    if (server.name.toLowerCase() == name.toLowerCase())
      return server;
  }
  for (let server of servers) {
    if (server.name.toLowerCase().includes(name.toLowerCase()))
      return server;
  }
  return undefined;
}

/**
 * Gets the messenger attached to the specified guild
 * @param guild Guild whose messenger to fetch
 * @returns The guild's messenger. If none exists, a new one is creeated and initizlied, and then returned.
 */
export function getMessenger(guild: string): Messenger {
  let messenger = messengerMap.get(guild);
  if (!messenger) {
    messenger = new Messenger([]);
    messenger.start(config.discordDelay * 1000, config.discordRate * 1000);
    messengerMap.set(guild, messenger);
  }
  return messenger;
}

/**
 * Gets the guild's profile.
 * @param guild Guild whose profile to fetch
 * @returns The guild's profile, or a new one if none exists.
 */
export function getGuildProfile(guild: string) {
  let profile = guildProfiles.get(guild);
  if (!profile) {
    profile = new GuildProfile(guild);
    guildProfiles.set(guild, profile);
  }
  return profile;
}

/**
 * Gets the client's profile.
 * @param client Client whose profile to fetch
 * @returns The client's profile, or a new one if none exists.
 */
export function getClientProfile(client: string) {
  let profile = clientProfiles.get(client);
  if (!profile) {
    profile = new ClientProfile(client);
    clientProfiles.set(client, profile);
  }
  return profile;
}