import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, TextBasedChannels } from "discord.js";
import { client, config } from "../..";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("purge")
        .setDescription("Purges the bot's DM messages.")
        .setDefaultPermission(true),
    async execute(interaction: CommandInteraction) {
        if (interaction.inGuild() || interaction.guildId) {
            interaction.reply({ content: "This command may only be used in DMs.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        await interaction.deferReply({ ephemeral: config.ephemeralize.purge });
        const channel = await client.channels.fetch(interaction.channelId);
        const text = channel as TextBasedChannels;
        const messages = await text.messages.fetch();
        const deleting = [];
        for (const msg of messages.values()) {
            if (!msg.deletable)
                continue;
            deleting.push(msg.delete());
        }
        if (!deleting.length) {
            interaction.editReply("There were no messages to delete.");
            return;
        }
        await Promise.all(deleting).then(msgs => {
            if (deleting.length === 0) {
                interaction.editReply("There were no messages to delete.");
                return;
            }

            interaction.editReply("Successfully deleted " + msgs.length + " message" + (msgs.length === 1 ? "" : "s") + ".");
        });
    }
};