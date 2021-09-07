import { SlashCommandBuilder } from "@discordjs/builders";
import { SlashCommandStringOption } from "@discordjs/builders/dist/interactions/slashCommands/options/string";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { getData, getGuildProfile, getMessenger, removeUpdater } from "../..";
import { ServerData } from "../../ServerData";

module.exports = {
    data: new SlashCommandBuilder().setName("deleteserver")
        .setDescription("Deletes a server from the bot")
        .addStringOption((option: SlashCommandStringOption) => option.setName("name").setDescription("The name of the server to delete").setRequired(true))
        .setDefaultPermission(false),
    async execute(interaction: CommandInteraction) {
        let name = interaction.options.getString("name");
        if (!name) {
            await interaction.reply({ content: "You must specify the name of the server.", ephemeral: true });
            return;
        }
        if (!interaction.guildId || !interaction.inGuild()) {
            await interaction.reply({ content: "This must be used in a guild.", ephemeral: true });
            return;
        }
        let server = getData(interaction.guildId, name);
        if (!server || !interaction.guild?.channels.cache.get(server.channel)) {
            await interaction.reply({ content: "Unknown server specified.", ephemeral: true });
            return;
        }
        let profile = getGuildProfile(interaction.guildId);
        profile.servers = profile.servers.filter((data: ServerData) => data.name != server?.name);
        profile.save();
        let embed = new MessageEmbed();

        embed.setTitle("Success");
        embed.setDescription("Deleted " + server.name + " (" + server.ip + ").");
        let url = interaction.user.avatarURL();
        embed.setFooter("Called by " + interaction.user.username + "#" + interaction.user.discriminator, url ? url : undefined);

        getMessenger(interaction.guildId).remove(server);
        removeUpdater(interaction.guildId, server.name);

        embed.setColor("RED");
        await interaction.reply({ embeds: [embed] });
    },
};
