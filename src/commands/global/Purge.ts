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
        await interaction.deferReply({ ephemeral: true });
        const channel = await client.channels.fetch(interaction.channelId);
        const text = channel as TextBasedChannels;
        const messages = await text.messages.fetch();
        let deleted = 0;
        for (const msg of messages.values()) {
            if (!msg.deletable)
                continue;
            await msg.delete();
            deleted++;
        }
        if (!deleted) {
            await interaction.editReply("There were no messages to delete.");
            return;
        }
        await interaction.editReply("Successfully deleted " + deleted + " message" + (deleted == 1 ? "" : "s") + ".");
    }
};