import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { getGuildServers } from "../..";

module.exports = {
    data: new SlashCommandBuilder().setName("servers")
        .setDescription("Lists server in the discord"),
    async execute(interaction: CommandInteraction) {
        let msg = "";
        if (!interaction.guildId || !interaction.inGuild()) {
            await interaction.reply({ content: "There are no servers in here.", ephemeral: true });
            return;
        }
        for (let server of getGuildServers(interaction.guildId)) {
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
