import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

const pings = new Map<string, number[]>();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Pings the bot.")
        .setDefaultPermission(true),
    async execute(interaction: CommandInteraction) {
        let it = pings.get(interaction.user.id);
        if (!it)
            it = [];
        it.push(Date.now());
        it = it.filter(t => Date.now() - t < 1000 * 60);
        pings.set(interaction.user.id, it);
        let p = "";
        for (let i = 0; i < it.length && i < 5; i++)
            p += "🏓";
        interaction.reply({ content: p + " `" + (Date.now() - interaction.createdTimestamp) + " ms` " + p, ephemeral: true });
    }
};