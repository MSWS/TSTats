import { SlashCommandBuilder } from '@discordjs/builders';
import { Routes } from 'discord-api-types/v9';
import { ApplicationCommandPermissionData, CommandInteractionOption, Interaction } from "discord.js";
import { client, getGuildProfile, rest } from ".";
import fs = require('fs');
import path = require("path");

const commands = new Map<string, Command>(); // Map for execution
const guildCommands: Command[] = []; // Array for registering commands
const globalCommands: Command[] = [];

export interface Command {
    data: SlashCommandBuilder,
    execute: (interaction: Interaction) => void
}

/**
 * Loads and populates both the commands map (for execution) and commandArray (for registration).
 */
export function loadCommands(): void {
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

            client.on('interactionCreate', async interaction => {
                if (!interaction.isCommand()) return;

                const command: Command | undefined = commands.get(interaction.commandName);

                if (!command)
                    return;

                console.log(interaction.user.username + "#" + interaction.user.discriminator + " (" + interaction.user.id + ") executed command /" + interaction.commandName + " " + interaction.options.data.map(opt => opt.name + ":" + toString(opt)).join(" ") + "");

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
            return;
        }
        const guild = await client.guilds.fetch(guildId);
        const gCommands = await guild.commands.fetch();

        for (const cmd of gCommands) {
            if (commands.has(cmd[1].name))
                continue;
            cmd[1].delete();
        }

        rest.put(Routes.applicationGuildCommands(id, guildId), { body: guildCommands }).then(() => { updatePermissions(guildId) });
    })();
}

function toString(opt: CommandInteractionOption): string {
    switch (opt.type) {
        case 'BOOLEAN':
        case "STRING":
        case "INTEGER":
            return opt.value?.toString() + "";
        case "CHANNEL":
            return opt.channel?.name.toString() + "";
        case "MENTIONABLE":
        case "USER":
        case "ROLE":
            return (opt.member ?? opt.role?.name)?.toString() + "";
        default:
            return opt + "";
    }
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