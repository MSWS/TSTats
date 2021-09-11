import { SlashCommandBuilder, SlashCommandRoleOption } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { config, getGuildProfile } from "../..";
import { registerCommands } from "../../CommandManager";

module.exports = {
    data: new SlashCommandBuilder().setName("revokeaccess")
        .setDescription("Revokes a specific role access to elevated commands")
        .addRoleOption((option: SlashCommandRoleOption) => option.setName("role").setDescription("The role to revoke elevated access to").setRequired(true))
        .setDefaultPermission(false),
    async execute(interaction: CommandInteraction) {
        if (!interaction.guildId || !interaction.inGuild()) {
            await interaction.reply({ content: "This must be used in a guild.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        if (!interaction.channel) {
            await interaction.reply({ content: "Unable to fetch channel, please try again later.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        if (!interaction.guild?.channels.cache.get(interaction.channel.id)?.permissionsFor(interaction.user)?.has("MANAGE_GUILD")) {
            await interaction.reply({ content: "You require the `MANAGE_GUILD` permission to use this command.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }

        const role = interaction.options.getRole("role");
        if (!role) {
            await interaction.reply({ content: "Unknown role.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        const profile = getGuildProfile(interaction.guildId);
        if (!profile.elevated.includes(role.id)) {
            await interaction.reply({ content: "<@&" + role.id + "> does not have access to elevated commands.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        profile.elevated = profile.elevated.filter(id => id !== role?.id);
        profile.save();
        registerCommands();
        await interaction.reply({ content: "Successfully revoked <@&" + role.id + ">'s access to elevated commands.", ephemeral: config.ephemeralize.revokeaccess });
        return;
    },
};
