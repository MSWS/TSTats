import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, TextBasedChannels } from "discord.js";
import { client } from "../..";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Purges the bot's DM messages.")
        .setDefaultPermission(true),
    async execute(interaction: CommandInteraction) {
        if (interaction.inGuild() || interaction.guildId) {
            await interaction.reply({ content: "This command may only be used in DMs.", ephemeral: true });
            return;
        }

        let channel = await client.channels.fetch(interaction.channelId) as TextBasedChannels;
        if (!channel)
            throw "Unable to fetch channel from " + interaction.channelId;

        let messages = channel.awaitMessages({ filter: msg => msg.author.id == client.user?.id });
        (await messages).forEach(m => m.delete());
        await interaction.reply({ content: "Purged messages.", ephemeral: true });
    }
};