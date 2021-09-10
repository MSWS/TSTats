import { SlashCommandBuilder } from "@discordjs/builders";
import { SlashCommandStringOption } from "@discordjs/builders/dist/interactions/slashCommands/options/string";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { clientProfiles, config, getGuildProfile, getMessenger, getUpdater, removeUpdater, selectData } from "../..";
import { Messenger } from "../../Messenger";
import { ServerData } from "../../ServerData";
import { respond } from "../../Utils";

module.exports = {
    data: new SlashCommandBuilder().setName("deleteserver")
        .setDescription("Deletes a server from the bot")
        .addStringOption((option: SlashCommandStringOption) => option.setName("name").setDescription("The name of the server to delete").setRequired(true))
        .setDefaultPermission(false),
    async execute(interaction: CommandInteraction) {
        const name = interaction.options.getString("name");
        if (!name) {
            interaction.reply({ content: "You must specify the name of the server.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        if (!interaction.guildId || !interaction.inGuild()) {
            interaction.reply({ content: "This must be used in a guild.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        const server = await selectData(interaction.guildId, name, interaction);
        if (!server) {
            respond(interaction, { content: "Unknown server specified.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        const guildProfile = getGuildProfile(interaction.guildId);
        guildProfile.servers = guildProfile.servers.filter((data: ServerData) => data.name !== server.name);
        guildProfile.save();

        for (const profile of clientProfiles.values()) {
            profile.options = profile.options.filter(opt => opt.guild !== server.guild || opt.server !== server.name);
        }

        const embed = new MessageEmbed();

        embed.setTitle("Success");
        embed.setDescription("Deleted " + server.name + " (" + server.ip + ").");
        const url = interaction.user.avatarURL();
        embed.setFooter("Called by " + interaction.user.username + "#" + interaction.user.discriminator, url ? url : undefined);

        const msg = getMessenger(interaction.guildId) ?? new Messenger([]);
        msg.remove(server);

        const updater = getUpdater(interaction.guildId, server.name);
        updater?.stop();
        removeUpdater(interaction.guildId, server.name);

        embed.setColor("RED");
        respond(interaction, { embeds: [embed], ephemeral: config.ephemeralize.deleteserver });
    },
};