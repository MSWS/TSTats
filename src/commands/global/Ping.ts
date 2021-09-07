import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

const pings = new Map<string, number>();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Pings the bot.")
        .setDefaultPermission(true),
    async execute(interaction: CommandInteraction) {
        let it = pings.get(interaction.user.id);
        if (!it)
            it = 0;
        pings.set(interaction.user.id, ++it);
        let p = "";
        for (let i = 0; i < it && i < 5; i++)
            p += "🏓";
        interaction.reply({ content: p + " `" + (Date.now() - interaction.createdTimestamp) + " ms` " + p, ephemeral: true });
    }
};