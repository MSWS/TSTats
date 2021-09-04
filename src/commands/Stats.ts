import { CommandInteraction, MessageEmbed } from "discord.js";
import { getMaxPlayerCount, getPlayerCount, getServers, start } from "..";
import { ServerData } from "../ServerData";

const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Retreives the bot's stats"),
    async execute(interaction: CommandInteraction) {
        let players = getPlayerCount(), max = getMaxPlayerCount();
        let servers = getServers();
        let uptime = Date.now() - start;

        let mp: ServerData | undefined = undefined, lp: ServerData | undefined = undefined;
        for (let s of servers) {
            if (!mp || !lp) {
                mp = s;
                lp = s;
                continue;
            }
            if (s.getOnline() > mp.getOnline()) {
                mp = s;
            }
            if (s.getOnline() < lp.getOnline()) {
                lp = s;
            }
        }

        let embed = new MessageEmbed();

        if (!mp) {
            await interaction.reply("There is insufficient data to calculate statistics.");
            return;
        }

        let date = new Date(0);
        date.setSeconds(uptime / 1000);

        embed.setTitle("Server Statistics");
        embed.setColor("BLUE");
        embed.addField("Players", players + "/" + max + " (" + (Math.round(players / max * 1000) / 10) + "%)", true);
        embed.addField("Servers", servers.length + "", true);

        if (lp != mp && lp && mp) {
            embed.addField("Most Popular", mp.name + " (" + (Math.round(mp.getOnline() / max * 1000) / 10) + "%)");
            embed.addField("Least Popular", lp.name + " (" + (Math.round(lp.getOnline() / max * 1000) / 10) + "%)");
        }

        embed.addField("Uptime", date.toISOString().substring(11, 19));
        embed.setFooter("Requested by " + interaction.member?.user.username);
        await interaction.reply({ embeds: [embed] });
    },
};
