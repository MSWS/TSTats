import { ApplicationCommandPermissionData, Client, Intents, Interaction } from "discord.js";
import { ClientProfile } from "./ClientProfile";
import { EmbedGenerator } from "./Generator";
import { GuildProfile } from "./GuildProfile";
import { Messenger } from "./Messenger";
import { ServerData } from "./ServerData";
import { Updater } from "./Updater";
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import fs = require('fs');
import path = require("path");

// Create the directories before we fetch them
fs.mkdir(path.resolve(__dirname, "./profiles"), () => console.error("Unable to make profiles directory"));
fs.mkdir(path.resolve(__dirname, "./configs"), () => console.error("Unable to make configs directory"));

export const clientProfiles = new Map<string, ClientProfile>();

interface Command {
  data: { toJSON: () => string, name: string },
  execute: (interaction: Interaction) => void
}

const commands = new Map<string, Command>(); // Map for execution
const guildCommands: Command[] = []; // Array for registrating commands
const globalCommands: Command[] = [];

export let config: { token: string, clientId: string, discordRate: number, sourceRate: number, discordDelay: number, sourceDelay: number, topicRate: number, useServerName: boolean, lineLength: number, cacheRate: number, build: number };
export const generator = new EmbedGenerator();
export let client: Client;
export const version = "0.0.1";

export let start: number;
export let guilds: Map<string, ServerData[]>;

let rest: REST;
const messengerMap = new Map<string, Messenger>();
const guildProfiles = new Map<string, GuildProfile>();
const updateMap = new Map<string, Updater>();


console.log("Loading config...");

import(path.resolve(__dirname, "./config.json")).then(c => {
  config = c;
  console.log("Config loaded: " + c);
  init();
});

export function init(): void {
  client = new Client({
    allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, /*Intents.FLAGS.DIRECT_MESSAGES*/], /*partials: ["CHANNEL"] */
  });

  rest = new REST({ version: '9' }).setToken(config.token);

  guilds = loadGuildConfigs();
  loadClientProfiles();
  loadCommands();

  client.on("ready", () => {
    registerCommands();
    start = Date.now();
    let serverCount = getServers().length;

    for (const server of getServers()) {
      const update = new Updater(server);
      update.start(config.sourceDelay * 1000, config.sourceRate * 1000);
      addUpdater(update.data.guild, update.data.name, update);
    }

    for (const [guild, data] of guilds.entries()) {
      const msg = new Messenger(data);
      messengerMap.set(guild, msg);
      msg.start(config.discordDelay * 1000, config.discordRate * 1000);
    }

    setInterval(() => {
      serverCount = getServers().length;
      const count = getPlayerCount();
      client.user?.setPresence({
        status: "online",
        activities: [{
          name: count + " player" + (count == 1 ? "" : "s") + " across " + serverCount + " server" + (serverCount == 1 ? "" : "s"), type: "WATCHING"
        }]
      });
    }, (config.topicRate ? config.topicRate : 300) * 1000);
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command: Command | undefined = commands.get(interaction.commandName);

    if (!command)
      return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error while executing this command! ```' + error + "```", ephemeral: true }).catch(() => {
        interaction.followUp({ content: 'There was an error while executing this command! ```' + error + "```", ephemeral: true });
      });
    }
  });

  client.login(config.token);
}

export function restart(): void {
  for (const msg of messengerMap.values())
    msg.stop();
  for (const update of updateMap.values())
    update.stop();
  updateMap.clear();
  messengerMap.clear();

  client.destroy();
  // init();
  process.exit();
}

/**
 * Returns all the servers that are loaded
 * @returns Array of servers across all guilds
 */
export function getServers(): ServerData[] {
  const result: ServerData[] = [];

  for (const server of guildProfiles.keys()) {
    for (const s of getGuildServers(server))
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
  const profile = guildProfiles.get(guild);
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
  for (const server of (servers ? servers : getServers()))
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
  for (const server of (servers ? servers : getServers()))
    total += server.max;
  return total;
}

/**
 * Saves the bot's config.
 */
export function saveConfig(): void {
  fs.writeFile("./config.json", JSON.stringify(config), { flag: "w+" }, (e) => { if (e) console.error("Failed to save config: ", e); });
}

/**
 * Loads guild profiles and assigns server arrays
 * Populates guildProfiles map
 * @returns Map of guild IDs to server data array
 */
function loadGuildConfigs(): Map<string, ServerData[]> {
  const configFiles = fs.readdirSync(path.resolve(__dirname, "./configs")).filter((file: string) => file.endsWith(".json"));
  for (const file of configFiles) {
    const id = file.substring(0, file.length - ".json".length);
    const profile = new GuildProfile(id);
    profile.load();
    guildProfiles.set(id, profile);
  }
  const result = new Map<string, ServerData[]>();
  for (const profile of guildProfiles.values()) {
    result.set(profile.id, profile.servers);
  }
  return result;
}

/**
 * Loads client profiles from the profileFile, and populates the clientProfiles map
 */
function loadClientProfiles() {
  clientProfiles.clear();
  const profileFile = fs.readdirSync(path.resolve(__dirname, "./profiles")).filter((file: string) => file.endsWith(".json"));
  for (const file of profileFile) {
    const id = file.substring(0, file.length - ".json".length);
    const profile = new ClientProfile(id);
    profile.load();
    clientProfiles.set(id, profile);
  }
}

/**
 * Loads and populates both the commands map (for execution) and commandArray (for registration).
 */
function loadCommands() {
  const guildCommandFiles = fs.readdirSync(path.resolve(__dirname, './commands/guild')).filter((file: string) => file.endsWith('.js'));
  const globalCommandFiles = fs.readdirSync(path.resolve(__dirname, './commands/global')).filter((file: string) => file.endsWith('.js'));
  commands.clear();
  guildCommands.length = 0;
  globalCommands.length = 0;

  for (const file of guildCommandFiles) {
    import(`./commands/guild/${file}`).then(command => {
      commands.set(command.data.name, command);
      console.log("Registering guild command %s (data: %s)", command.data.name, command.data);
      guildCommands.push(command.data.toJSON());
    });

  }
  for (const file of globalCommandFiles) {
    import(`./commands/global/${file}`).then(command => {
      commands.set(command.data.name, command);
      console.log("Registering global command %s (data: %s)", command.data.name, command.data);
      globalCommands.push(command.data.toJSON());
    });
  }
}


/**
 * Registers commands and updates the permissions via updatePermissions.
 * @param guildId The guild to update commands for, if not specified, updates all guild's commands
 */
export function registerCommands(guildId?: string): void {
  (async () => {
    if (!guildId) {
      // let app = await client.application?.fetch();
      // if (app) {
      //   for (let cmd of (await app.commands.fetch()).values()) {
      //     if (globalCommands.some(c => cmd.name == c.name))
      //       continue;
      //     console.log("Deleting " + JSON.stringify(cmd));
      //     cmd.delete();
      //   }
      // }
      for (const guild of await client.guilds.fetch()) {
        registerCommands(guild[0]);
      }
      // rest.put(Routes.applicationCommands(config.clientId), { body: globalCommands });
      return;
    }
    const guild = client.guilds.fetch(guildId);
    const gCommands = await (await guild).commands.fetch();
    for (const cmd of gCommands) {
      if (commands.has(cmd[1].name))
        continue;
      cmd[1].delete();
    }
    rest.put(Routes.applicationGuildCommands(config.clientId, guildId), { body: guildCommands }).then(() => { updatePermissions(guildId); });
  })();
}

/**
 * Updates the specified guild's command permissions. By default, the highest role has access to all commands. Any role that has access to manage the guild also has access to all commands.
 * @param guildId The guild to update permissions for, if not specified, updates all guild's permissions
 */
export function updatePermissions(guildId?: string): void {
  (async () => {
    if (!guildId) {
      for (const guild of await client.guilds.fetch()) {
        updatePermissions(guild[0]);
      }
      return;
    }
    const guild = await client.guilds.fetch(guildId);
    const serverPerm: ApplicationCommandPermissionData[] = [{
      id: guild.roles.highest.id,
      permission: true,
      type: "ROLE"
    }];
    const roles = await guild.roles.fetch();
    for (const role of roles) {
      if (!role[1].permissions.has("MANAGE_GUILD") && !getGuildProfile(guild.id).elevated.includes(role[0]))
        continue;
      serverPerm.push({
        id: role[0],
        permission: true,
        type: "ROLE"
      })
    }
    const commands = guild.commands.fetch();
    for (const cmd of await commands) {
      await cmd[1].permissions.set({ permissions: serverPerm });
    }
    return;
  })();
}

/**
 * Gets the ServerData given the guild and name.
 * @param guild The guild to search.
 * @param name The server name. Names should be unique.
 * @param strict If true, will find the closest match. If false, will only return exact matches.
 * @returns The ServerData, or undefined if none is found.
 */
export function getData(guild: string, name: string, strict = false): ServerData | undefined {
  const servers = getGuildServers(guild);
  for (const server of servers) {
    if (server.name == name)
      return server;
  }
  if (strict)
    return undefined;
  for (const server of servers) {
    if (server.name.toLowerCase() == name.toLowerCase())
      return server;
  }
  for (const server of servers) {
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
 * Adds an updater to track, will be stopped if exited
 * @param updater Updater to add
 */
export function addUpdater(guild: string, name: string, updater: Updater): void {
  updateMap.set(guild + name, updater);
}

/**
 * Gets an updater
 * @param guild Guild that the updater belongs to
 * @param name Server name the updater belongs to
 * @returns The updater linked to the guild + name, or undefined if none
 */
export function getUpdater(guild: string, name: string): Updater | undefined {
  return updateMap.get(guild + name);
}

/**
 * Stops and removes the given updater
 * @param guild Guild that the updater belongs to
 * @param name Server name the updater belongs to
 */
export function removeUpdater(guild: string, name: string): void {
  getUpdater(guild, name)?.stop();
  updateMap.delete(guild + name);
}

/**
 * Gets the guild's profile.
 * @param guild Guild whose profile to fetch
 * @returns The guild's profile, or a new one if none exists.
 */
export function getGuildProfile(guild: string): GuildProfile {
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
export function getClientProfile(client: string): ClientProfile {
  let profile = clientProfiles.get(client);
  if (!profile) {
    profile = new ClientProfile(client);
    clientProfiles.set(client, profile);
  }
  return profile;
}