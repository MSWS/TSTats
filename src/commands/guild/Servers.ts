import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, MessageEmbed, TextChannel } from "discord.js";
import { client, config, getGuildServers } from "../..";
import { ServerData } from "../../ServerData";

module.exports = {
    data: new SlashCommandBuilder().setName("servers")
        .setDescription("Lists server in the discord"),
    async execute(interaction: CommandInteraction) {
        if (!interaction.guildId || !interaction.inGuild() || !interaction.guild) {
            await interaction.reply({ content: "There are no servers in here.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        const embed = new MessageEmbed();
        embed.setTitle((await interaction.guild.fetch()).name + " Servers");
        embed.setColor("BLUE");

        const fetch = [];
        const servers: ServerData[] = [];
        const desc: string[] = [];

        for (const server of getGuildServers(interaction.guildId)) {
            fetch.push(interaction.guild.channels.fetch(server.channel).then(channel => {
                if (!channel?.permissionsFor(interaction.user)?.has("VIEW_CHANNEL"))
                    return;
                servers.push(server);
            }));
        }
        await Promise.all(fetch);

        for (const server of servers) {
            const channel = client.channels.cache.get(server.channel) as TextChannel;
            let index = desc.indexOf("**<#" + channel.id + ">**");
            if (index === -1) {
                desc.push("");
                desc.push("**<#" + channel.id + ">**");
                index = desc.length;
            }

            desc.splice(index + 1, 0, server.name + (server.sourceName ? ": " + server.sourceName : ""));
        }
        embed.setDescription(desc.join("\n"));

        if (!servers.length) {
            const embed = new MessageEmbed();
            embed.setTitle("No Servers");
            embed.setColor("DARK_RED");
            embed.setDescription("There are no servers in this guild.");
            interaction.reply({ embeds: [embed], ephemeral: config.ephemeralize.commands.onFail });
            return;
        }

        interaction.reply({ embeds: [embed], ephemeral: config.ephemeralize.servers });
    },
};
