import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { restart, version, config } from "../..";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("restart")
        .setDescription("Restarts the bot.")
        .setDefaultPermission(true),
    async execute(interaction: CommandInteraction) {
        if (interaction.user.id !== "219601562048135168") {
            await interaction.reply({ content: "Sorry! Only my maker (<@219601562048135168>) can execute this.", ephemeral: true });
            return;
        }
        const embed = new MessageEmbed();
        embed.setTitle("Restarting...");
        embed.setColor("DARK_RED");
        embed.setFooter("Build Version " + version + "." + config.build);
        await interaction.reply({ embeds: [embed], ephemeral: true });
        restart();
    }
};