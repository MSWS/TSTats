import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { getClientProfile, getData } from "..";
import { ClientOption, ClientProfile, getSummary, NotifyType } from "../ClientProfile";

module.exports = {
    data: new SlashCommandBuilder().setName("notify")
        .setDescription("Toggles notification for when a server's status changes")
        .addStringOption(o => o.setName("server").setDescription("The server whose status will be monitored").setRequired(true))
        .addStringOption(o => o.setName("type").setDescription("The thing to monitor").addChoices([
            ["Map Change", "MAP"], ["Online/Offline Status", "STATUS"], ["Player Session", "PLAYER"], ["No Admins", "ADMIN"], ["List", "LIST"], ["Clear", "CLEAR"]
        ]).setRequired(true))
        .addStringOption(o => o.setName("value").setDescription("The name of the map / player to notify")),
    async execute(interaction: CommandInteraction) {
        let sn = interaction.options.getString("server");
        if (!sn) {
            await interaction.reply({ content: "Invalid server.", ephemeral: true });
            return;
        }
        if (!interaction.guildId || !interaction.inGuild()) {
            await interaction.reply({ content: "This must be used in a guild.", ephemeral: true });
            return;
        }

        let type = interaction.options.getString("type");
        if (!type) {
            await interaction.reply({ content: "Unknown type.", ephemeral: true });
            return;
        }

        let id = interaction.user.id;
        let profile = getClientProfile(id);
        let value = interaction.options.getString("value");

        if (!profile) {
            await interaction.reply({ content: "Unable to fetch profile.", ephemeral: true });
            return;
        }

        let server = getData(interaction.guildId, sn);

        if (type == "LIST" || value?.toLowerCase() == "list" || sn.toLowerCase() == "list" || sn.toLowerCase() == "all") {
            let embeds;
            if (value) {
                embeds = getEmbed(profile, interaction.guildId, server ? server.name : undefined, type as NotifyType);
            } else {
                embeds = getEmbed(profile, interaction.guildId, server ? server.name : undefined);
            }
            if (!embeds || !embeds.length) {
                await interaction.reply({ content: "You do not have any " + (value ? getSummary(type as NotifyType) + " " : "") + "notifications for " + (server ? server.name : "any server") + ".", ephemeral: true });
                return;
            }
            await interaction.reply({ embeds: embeds, ephemeral: true });
            return;
        }

        if (!server) {
            await interaction.reply({ content: "Unknown server.", ephemeral: true });
            return;
        }

        if (type == "CLEAR") {
            if (profile?.options)
                profile.options = profile?.options.filter(opt => opt.server != server?.name);
            await interaction.reply({ content: "Successfully cleared your notification preferences for " + server.name + ".", ephemeral: true })
            profile?.save();
            return;
        }

        let opt = new ClientOption({ guild: interaction.guildId, server: server.name, type: type as NotifyType, value: interaction.options.getString("value") });

        if (value == "CLEAR") {
            if (profile.options)
                profile.options = profile.options.filter(opt => opt.server != server?.name || opt.type != type);
            await interaction.reply({ content: "Successfully cleared your " + type + " preferences for " + getSummary(opt.type) + ".", ephemeral: true });
            profile?.save();
            return;
        }

        if (profile.options.includes(opt)) {
            await interaction.reply({ content: "You are already being notified about that.", ephemeral: true });
            return;
        }
        if (profile.options.some(e => e.guild == opt.guild && e.server == opt.server && e.type == opt.type && e.value == opt.value)) {
            await interaction.reply({ content: "You are already being notified about that.", ephemeral: true });
            return;
        }

        profile.options.push(opt);
        profile.save();
        await interaction.reply({ content: opt.getDescription("You will now be notified "), ephemeral: true });
    },
};

function getEmbed(profile: ClientProfile, guild?: string, server?: string, type?: NotifyType): MessageEmbed[] {
    let result = [];
    let options = profile.options.filter(opt => opt.guild == guild && (opt.server == server || !server) && (opt.type == type || !type));
    for (let option of options) {
        let embed = new MessageEmbed();
        embed.setTitle(getSummary(option.type));
        embed.setDescription(option.getDescription("Currently notifying you "));
        embed.setColor(option.getColor());
        result.push(embed);
    }
    return result;
}