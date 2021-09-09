import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { ApplicationCommandPermissionData, Client, CommandInteraction, Intents, Interaction, MessageActionRow, MessageSelectMenu, MessageSelectOptionData, SelectMenuInteraction } from "discord.js";
import { ClientProfile } from "./ClientProfile";
import { EmbedGenerator } from "./Generator";
import { GuildProfile } from "./GuildProfile";
import { Messenger } from "./Messenger";
import { ServerData } from "./ServerData";
import { Updater } from "./Updater";
import fs = require('fs');
import path = require("path");

// Create the directories before we fetch them
fs.mkdir(path.resolve(__dirname, "./profiles"), (e) => { if (e?.errno !== -17) console.error("Unable to make profiles directory: ", e); });
fs.mkdir(path.resolve(__dirname, "./configs"), (e) => { if (e?.errno !== -17) console.error("Unable to make configs directory: ", e); });

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
export const version = "1.0.1";

export let start: number;
export let guilds: Map<string, ServerData[]>;

let rest: REST;
const messengerMap = new Map<string, Messenger>();
const guildProfiles = new Map<string, GuildProfile>();
const updateMap = new Map<string, Updater>();

import(path.resolve(__dirname, "./config.json")).then(c => {
  config = c;
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
          name: count + " player" + (count === 1 ? "" : "s") + " across " + serverCount + " server" + (serverCount === 1 ? "" : "s"), type: "WATCHING"
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
      command.execute(interaction);
    } catch (error) {
      console.error(error);
      if (interaction.replied)
        interaction.followUp({ content: 'There was an error while executing this command! ```' + error + "```", ephemeral: true });
      else
        interaction.reply({ content: 'There was an error while executing this command! ```' + error + "```", ephemeral: true });
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
  for (const server of servers ? servers : getServers())
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
  for (const server of servers ? servers : getServers())
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
      guildCommands.push(command.data.toJSON());
    });

  }
  for (const file of globalCommandFiles) {
    import(`./commands/global/${file}`).then(command => {
      commands.set(command.data.name, command);
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
    const id = client.user?.id;
    if (!id)
      throw "No client ID found";
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

    rest.put(Routes.applicationGuildCommands(id, guildId), { body: guildCommands }).then(() => { updatePermissions(guildId) });
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
      });
    }
    const commands = guild.commands.fetch();
    for (const cmd of await commands) {
      cmd[1].permissions.set({ permissions: serverPerm });
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
export function getData(guild: string, name: string, strict = false): ServerData | undefined {
  const servers = getGuildServers(guild);
  for (const server of servers) {
    if (server.name === name)
      return server;
  }
  if (strict)
    return undefined;
  for (const server of servers) {
    if (server.name.toLowerCase() === name.toLowerCase())
      return server;
  }
  for (const server of servers) {
    if (server.name.toLowerCase().includes(name.toLowerCase()))
      return server;
  }
  return undefined;
}

export async function selectData(guild: string, name: string, interaction: CommandInteraction, mustSee = true): Promise<Promise<ServerData> | undefined> {
  const possible = [];
  const g = client.guilds.cache.get(guild);
  for (const data of getGuildServers(guild)) {
    if (data.name.toLowerCase() === name.toLowerCase())
      return data;
    if (similarity(name, data.name) === 0)
      continue;
    if (mustSee) {
      const channel = g?.channels.cache.get(data.channel);
      if (!channel?.permissionsFor(interaction.user)?.has("VIEW_CHANNEL"))
        continue;
    }
    possible.push(data);
  }

  if (!possible.length)
    return undefined;
  if (possible.length === 1)
    return possible[0];
  possible.sort((a, b) => similarity(name, b.name) - similarity(name, a.name));
  possible.length = Math.min(possible.length, 5);
  const options: MessageSelectOptionData[] = [];

  for (const data of possible)
    options.push({ label: data.name, value: data.name, description: data.sourceName });

  const id = Math.random() + "";
  const row = new MessageActionRow().addComponents(new MessageSelectMenu().setCustomId(id).addOptions(options));
  await interaction.reply({ content: "More than one server matched, which one did you mean?", ephemeral: true, components: [row] });
  return interaction.channel?.awaitMessageComponent({ componentType: "SELECT_MENU" }).then(click => {
    const c = click as SelectMenuInteraction;
    const data = getData(guild, c.values.join(" "));
    click.update({ content: "Selected " + data?.name, components: [] });
    return data;
  }).catch(e => {
    if (e)
      console.warn("Interaction erroed out: ", e);
    return undefined;
  });
}

function similarity(s1: string, s2: string): number {
  let longer = s1;
  let shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  if (longer.length === 0) {
    return 1.0;
  }
  return (longer.length - editDistance(longer, shorter)) / longer.length;
}

function editDistance(s1: string, s2: string) {
  s1 = s1.toLowerCase();
  s2 = s2.toLowerCase();

  const costs = new Array<number>();
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0)
        costs[j] = j;
      else {
        if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1))
            newValue = Math.min(Math.min(newValue, lastValue),
              costs[j]) + 1;
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
    }
    if (i > 0)
      costs[s2.length] = lastValue;
  }
  return costs[s2.length];
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