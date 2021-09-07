import { SlashCommandBuilder, SlashCommandRoleOption } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { getGuildProfile, updatePermissions } from "../..";

module.exports = {
    data: new SlashCommandBuilder().setName("giveaccess")
        .setDescription("Grants a specific role access to elevated commands")
        .addRoleOption((option: SlashCommandRoleOption) => option.setName("role").setDescription("The role to give elevated access to").setRequired(true))
        .setDefaultPermission(false),
    async execute(interaction: CommandInteraction) {
        if (!interaction.guildId || !interaction.inGuild()) {
            await interaction.reply({ content: "This must be used in a guild.", ephemeral: true });
            return;
        }
        if (!interaction.channel) {
            await interaction.reply({ content: "Unable to fetch channel, please try again later.", ephemeral: true });
            return;
        }
        if (!interaction.guild?.channels.cache.get(interaction.channel.id)?.permissionsFor(interaction.user)?.has("MANAGE_GUILD")) {
            await interaction.reply({ content: "You require the `MANAGER_GUILD` permission to use this command.", ephemeral: true });
            return;
        }
        let role = interaction.options.getRole("role");
        if (!role) {
            await interaction.reply({ content: "Unknown role.", ephemeral: true });
            return;
        }
        let profile = getGuildProfile(interaction.guildId);
        if (profile.elevated.includes(role.id)) {
            await interaction.reply({ content: "<@&" + role.id + "> already has access to elevated commands.", ephemeral: true });
            return;
        }
        profile.elevated.push(role.id);
        profile.save();
        updatePermissions(interaction.guildId);
        await interaction.reply("Successfully allowed <@&" + role.id + "> access to elevated commands.");
        return;
    },
};
