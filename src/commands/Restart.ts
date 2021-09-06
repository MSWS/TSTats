import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { restart } from "..";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("restart")
        .setDescription("Restarts the bot.")
        .setDefaultPermission(false),
    async execute(interaction: CommandInteraction) {
        if (interaction.user.id != "219601562048135168") {
            await interaction.reply({ content: "Sorry! Only my maker (<@219601562048135168>) can execute this.", ephemeral: true });
            return;
        }

        await interaction.reply("Restarting...");
        restart();
    }
};