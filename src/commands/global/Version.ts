import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { config, version } from "../..";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("version")
        .setDescription("Checks the bot's version.")
        .setDefaultPermission(true),
    async execute(interaction: CommandInteraction) {
        interaction.reply({ content: "I am currently running build version `" + version + "." + process.env.BUILD_VERSION + "`.", ephemeral: config.ephemeralize.version });
    }
};
