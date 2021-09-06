import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { client, getGuildServers, getMaxPlayerCount, getPlayerCount, getServers, start } from "..";
import { ServerData } from "../ServerData";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Retreives the bot's stats"),
    async execute(interaction: CommandInteraction) {
        let globalPlayers = getPlayerCount(), globalMax = getMaxPlayerCount();
        let guildServers, guildPlayers, guildMax;
        if (interaction.inGuild() && interaction.guildId) {
            guildServers = getGuildServers(interaction.guildId);
            guildPlayers = getPlayerCount(guildServers);
            guildMax = getMaxPlayerCount(guildServers);
        }
        let servers = getServers();
        let uptime = Date.now() - start;

        let globalPopular: ServerData | undefined, globalUnpopular: ServerData | undefined;
        let guildPopular: ServerData | undefined, guildUnpopular: ServerData | undefined;
        for (let s of servers) {
            if (!globalPopular || !globalUnpopular) {
                globalPopular = s;
                globalUnpopular = s;
                if (s.guild == interaction.guildId) {
                    guildPopular = s;
                    guildUnpopular = s;
                }
                continue;
            }
            if (s.getOnline() > globalPopular.getOnline()) {
                globalPopular = s;
                if (s.guild == interaction.guildId)
                    guildPopular = s;
            }
            if (s.getOnline() < globalUnpopular.getOnline()) {
                globalUnpopular = s;
                if (s.guild == interaction.guildId)
                    guildUnpopular = s;
            }
        }


        if (!globalPopular || !globalUnpopular) {
            await interaction.reply("There is insufficient data to calculate statistics.");
            return;
        }

        let globalPopularGuild = client.guilds.cache.get(globalPopular.guild)?.name, globalUnpopularGuild = client.guilds.cache.get(globalUnpopular?.guild)?.name;

        let embed = new MessageEmbed();
        let date = new Date(0);
        date.setSeconds(uptime / 1000);

        embed.setTitle("Global Statistics");
        embed.setColor("BLUE");
        embed.addField("Players", globalPlayers + "/" + globalMax + " (" + (Math.round(globalPlayers / globalMax * 1000) / 10) + "%)", true);
        embed.addField("Servers", servers.length + "", true);

        if (globalUnpopular != globalPopular && globalUnpopular && globalPopular) {
            embed.addField("Most Popular", globalPopular.name + " from " + globalPopularGuild + " (" + (Math.round(globalPopular.getOnline() / globalPlayers * 1000) / 10) + "%)");
            embed.addField("Least Popular", globalUnpopular.name + " from " + globalUnpopularGuild + " (" + (Math.round(globalUnpopular.getOnline() / globalPlayers * 1000) / 10) + "%)");
        }

        embed.addField("Uptime", date.toISOString().substring(11, 19));
        embed.setFooter("Requested by " + interaction.member?.user.username);
        await interaction.reply({ embeds: [embed] });

        if (guildServers && guildPlayers && guildMax) {
            embed = new MessageEmbed();
            embed.setTitle(interaction.guild?.name + " Statistics");
            embed.setColor("GREEN");
            embed.addField("Players", guildPlayers + "/" + guildMax + " (" + (Math.round(guildPlayers / guildMax * 1000) / 10) + "%)", true);
            embed.addField("Servers", guildServers.length + "", true);

            if (guildUnpopular != guildPopular && guildUnpopular && guildPopular) {
                embed.addField("Most Popular", globalPopular.name + " (" + (Math.round(guildPopular.getOnline() / guildPlayers * 1000) / 10) + "%)");
                embed.addField("Least Popular", guildUnpopular.name + " (" + (Math.round(guildUnpopular.getOnline() / guildPlayers * 1000) / 10) + "%)");
            }
            embed.setFooter("Requested by " + interaction.member?.user.username);
            await interaction.followUp({ embeds: [embed] });
        }
    },
};