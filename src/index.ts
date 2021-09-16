import { REST } from '@discordjs/rest';
import { Client, CommandInteraction, Intents, MessageActionRow, MessageSelectMenu, MessageSelectOptionData, SelectMenuInteraction } from "discord.js";
import { ClientProfile } from "./ClientProfile";
import { EmbedGenerator } from "./Generator";
import { GuildProfile } from "./GuildProfile";
import { Messenger } from "./Messenger";
import { ServerData } from "./ServerData";
import { Updater } from "./Updater";
import fs = require('fs');
import path = require("path");
import { loadCommands, registerCommands } from './CommandManager';

// Create the directories before we fetch them
fs.mkdir(path.resolve(__dirname, "./profiles"), (e) => { if (e?.errno !== -17) console.error("Unable to make profiles directory: ", e); });
fs.mkdir(path.resolve(__dirname, "./configs"), (e) => { if (e?.errno !== -17) console.error("Unable to make configs directory: ", e); });

export const clientProfiles = new Map<string, ClientProfile>();

export const GAME_TYPES: [string, string][] = [["7 Days to Die (2013)", "7d2d"],
["Ark: Survival Evolved (2017)", "arkse"],
["ARMA 3 (2013)", "arma3"],
["Battlefield: Bad Company 2 (2010)", "bfbc2"],
["Call of Duty: Modern Warfare 3 (2011)", "codmw3"],
["Counter-Strike: Global Offensive (2012)", "csgo"],
["Counter-Strike: Source (2004)", "css"],
["DayZ (2018)", "dayz"],
["Deus Ex (2000)", "deusex"],
["Doom 3 (2004)", "doom3"],
["Dota 2 (2013)", "dota2"],
["Garry's Mod (2004)", "garrysmod"],
["Grand Theft Auto V - FiveM (2013)", "fivem"],
["Minecraft (2009)", "minecraft"],
["Minecraft Bedrock", "minecraftpe"],
["Mordhau (2019)", "mordhau"],
["Rainbow Six", "r6"],
["Space Engineers", "spaceengineers"],
["Team Fortress 2", "tf2"],
["Teamspeak 3", "teamspeak3"],
["Terraria - TShock (2011)", "terraria"]];

export const VALID_COLORS: [string, string][] = [["White", "WHITE"],
["Aqua", "AQUA"],
["Green", "GREEN"],
["Blue", "BLUE"],
["Yellow", "YELLOW"],
["Purple", "PURPLE"],
["Luminous Vivid Pink", "LUMINOUS_VIVID_PINK"],
["Fuchsia", "FUCHSIA"],
["Gold", "GOLD"],
["Orange", "ORANGE"],
["Red", "RED"],
["Grey", "GREY"],
["Navy", "NAVY"],
["Dark Aqua", "DARK_AQUA"],
["Dark Green", "DARK_GREEN"],
["Dark Blue", "DARK_BLUE"],
["Dark Purple", "DARK_PURPLE"],
["Dark Vivid Pink", "DARK_VIVID_PINK"],
["Dark Gold", "DARK_GOLD"],
["Dark Orange", "DARK_ORANGE"],
["Dark Red", "DARK_RED"],
["Light Grey", "LIGHT_GREY"],
["Dark Navy", "DARK_NAVY"],
["Blurple", "BLURPLE"],
["Random", "RANDOM"]];

export let config: {
  token: string, clientId: string, discordRate: number, sourceRate: number, discordDelay: number, sourceDelay: number, presenceRate: number,
  useServerName: boolean, lineLength: number, cacheRate: number, addServerPermission: string, elevatedPermission: string,
  ephemeralize: {
    commands: { onComplete: boolean, onFail: boolean }, ping: boolean, purge: boolean, restart: boolean,
    stats: { global: boolean, guild: boolean }, version: boolean, addserver: boolean, deleteserver: boolean, giveaccess: boolean,
    notify: { list: boolean, clear: boolean, add: boolean }, revokeaccess: boolean, servers: boolean, editserver: boolean
  }
};

export const generator = new EmbedGenerator();
export let client: Client;
export const version = "1.0.1";

export let start: number;
export let guilds: Map<string, ServerData[]>;

export let rest: REST;
const messengerMap = new Map<string, Messenger>();
const guildProfiles = new Map<string, GuildProfile>();
const updateMap = new Map<string, Updater>();

init();

export async function init(): Promise<void> {
  config = await import(path.resolve(__dirname, "./config.json"));
  client = new Client({
    allowedMentions: { parse: ['users', 'roles'], repliedUser: true },
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, /*Intents.FLAGS.DIRECT_MESSAGES*/], /*partials: ["CHANNEL"] */
  });

  process.env.BUILD_VERSION = process.env.BUILD_VERSION ?? "0";

  rest = new REST({ version: '9' }).setToken(config.token);

  guilds = loadGuildConfigs();
  loadClientProfiles();
  loadCommands();

  client.on("ready", () => {
    registerCommands();
    start = Date.now();
    let serverCount = getServers().length;

    for (const [guild, data] of guilds.entries()) {
      const msg = getMessenger(guild) ?? new Messenger(data);
      setMessenger(guild, msg);
      msg.start(config.discordDelay * 1000, config.discordRate * 1000);
    }

    for (const server of getServers()) {
      const update = getUpdater(server.guild, server.name) ?? new Updater(server);
      update.start(config.sourceDelay * 1000, config.sourceRate * 1000);
      addUpdater(update.data.guild, update.data.name, update);
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
    }, (config.presenceRate ?? 60) * 1000);
  });

  client.on("guildCreate", async interaction => {
    registerCommands(interaction.id);
  });

  client.on("guildDelete", async guild => {
    getMessenger(guild.id)?.stop();

    const profile = getGuildProfile(guild.id);

    for (const server of profile.servers) {
      getUpdater(guild.id, server.name)?.stop();
      removeUpdater(guild.id, server.name);
    }
    fs.unlink(profile.file, (e) => {
      if (e) console.error("Could not delete file: ", e);
    });
  });

  client.on("error", error => {
    console.error("An error occured: ", error);
  });

  process.on('uncaughtException', error => {
    console.error('A process exception occured:', error);
  });
  process.on('unhandledRejection', error => {
    console.error('A rejection went unhandled:', error);
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
  init();
  // process.exit();
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

export async function selectData(guild: string, name: string | undefined, interaction: CommandInteraction, mustSee = true): Promise<Promise<ServerData> | undefined> {
  const possible = [];
  const g = client.guilds.cache.get(guild);
  for (const data of getGuildServers(guild)) {
    if (name && data.name.toLowerCase() === name.toLowerCase())
      return data;
    if (name && similarity(name, data.name) === 0)
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
  if (name)
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
export function getMessenger(guild: string): Messenger | undefined {
  return messengerMap.get(guild);
}

export function setMessenger(guild: string, messenger: Messenger): void {
  messengerMap.set(guild, messenger);
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
