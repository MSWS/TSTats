import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { config, version } from "..";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("version")
        .setDescription("Checks the bot's version."),
    async execute(interaction: CommandInteraction) {
        await interaction.reply({ content: "I am currently running build version `" + version + "." + config.build + "`.", ephemeral: true });
    }
};