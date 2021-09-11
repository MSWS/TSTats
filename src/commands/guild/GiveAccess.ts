import { SlashCommandBuilder, SlashCommandRoleOption } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { config, getGuildProfile } from "../..";
import { updatePermissions } from "../../CommandManager";

module.exports = {
    data: new SlashCommandBuilder().setName("giveaccess")
        .setDescription("Grants a specific role access to elevated commands")
        .addRoleOption((option: SlashCommandRoleOption) => option.setName("role").setDescription("The role to give elevated access to").setRequired(true))
        .setDefaultPermission(false),
    async execute(interaction: CommandInteraction) {
        if (!interaction.guildId || !interaction.inGuild()) {
            interaction.reply({ content: "This must be used in a guild.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        if (!interaction.channel) {
            interaction.reply({ content: "Unable to fetch channel, please try again later.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        if (!interaction.guild?.channels.cache.get(interaction.channel.id)?.permissionsFor(interaction.user)?.has("MANAGE_GUILD")) {
            interaction.reply({ content: "You require the `MANAGE_GUILD` permission to use this command.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        const role = interaction.options.getRole("role");
        if (!role) {
            interaction.reply({ content: "Unknown role.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        const profile = getGuildProfile(interaction.guildId);
        if (profile.elevated.includes(role.id)) {
            interaction.reply({ content: "<@&" + role.id + "> already has access to elevated commands.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        profile.elevated.push(role.id);
        profile.save();
        updatePermissions(interaction.guildId);
        interaction.reply({ content: "Successfully allowed <@&" + role.id + "> access to elevated commands.", ephemeral: config.ephemeralize.giveaccess });
    },
};
