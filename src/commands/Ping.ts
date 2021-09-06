import { CommandInteraction, Message, MessageEmbed } from "discord.js";
import { client, getGuildServers, getMaxPlayerCount, getPlayerCount, getServers, start } from "..";
import { ServerData } from "../ServerData";

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Pings the bot."),
    async execute(interaction: CommandInteraction) {
        await interaction.reply({ content: "Pong.", ephemeral: true });
    }
};