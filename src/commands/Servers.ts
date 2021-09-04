import { SlashCommandBuilder } from "@discordjs/builders";
import { SlashCommandStringOption } from "@discordjs/builders/dist/interactions/slashCommands/options/string";
import { CommandInteraction } from "discord.js";
import { config, getData, getServers, saveConfig, servers } from "..";
import { ServerData } from "../ServerData";

module.exports = {
    data: new SlashCommandBuilder().setName("servers")
        .setDescription("Lists server in the discord"),
    async execute(interaction: CommandInteraction) {
        let msg = "";
        for (let server of getServers()) {
            if (!interaction.inGuild()) {
                await interaction.reply({ content: "No servers in here!", ephemeral: true });
                return;
            }
            if (interaction.guild?.channels.cache.get(server.channel))
                msg += server.name + ", ";
        }
        if (!msg) {
            await interaction.reply({ content: "No servers in here!", ephemeral: true });
            return;
        }
        msg = msg.substring(0, msg.length - 2);
        await interaction.reply("Servers in here: `" + msg + "`");
    },
};
