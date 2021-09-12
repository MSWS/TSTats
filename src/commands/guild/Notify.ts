import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { client, config, getClientProfile, selectData } from "../..";
import { ClientOption, ClientProfile, getSummary, NotifyType } from "../../ClientProfile";
import { ServerData } from "../../ServerData";
import { respond } from "../../Utils";

module.exports = {
    data: new SlashCommandBuilder().setName("notify")
        .setDescription("Toggles notification for when a server's status changes")
        .addStringOption(o => o.setName("server").setDescription("The server whose status will be monitored").setRequired(true))
        .addStringOption(o => o.setName("type").setDescription("The thing to monitor").addChoices([
            ["Map Change", "MAP"], ["Online/Offline Status", "STATUS"], ["Player Session", "PLAYER"], ["No Admins", "ADMIN"], ["Debug", "DEBUG"], ["List", "LIST"], ["Clear", "CLEAR"]
        ]).setRequired(true))
        .addStringOption(o => o.setName("value").setDescription("The name of the map / player to notify")),
    async execute(interaction: CommandInteraction) {
        const sn = interaction.options.getString("server");
        if (!sn) {
            interaction.reply({ content: "Invalid server.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        if (!interaction.guildId || !interaction.inGuild()) {
            interaction.reply({ content: "This must be used in a guild.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }

        const type = interaction.options.getString("type");
        if (!type) {
            interaction.reply({ content: "Unknown type.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }

        const id = interaction.user.id;
        const profile = getClientProfile(id);
        const value = interaction.options.getString("value");

        if (!profile) {
            interaction.reply({ content: "Unable to fetch profile.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }

        let server: ServerData | undefined;
        if (sn.toLowerCase() !== "list" && sn.toLowerCase() !== "all") {
            server = await selectData(interaction.guildId, sn, interaction);

            if (!server) {
                respond(interaction, { content: "Unknown server.", ephemeral: config.ephemeralize.commands.onFail });
                return;
            }
        }

        if (type === "LIST" || value?.toLowerCase() === "list" || sn.toLowerCase() === "list" || sn.toLowerCase() === "all") {
            let embeds;
            if (value) {
                embeds = getEmbed(profile, interaction.guildId, server ? server.name : undefined, type as NotifyType);
            } else {
                embeds = getEmbed(profile, interaction.guildId, server ? server.name : undefined);
            }
            if (!embeds || !embeds.length) {
                respond(interaction, { content: "You do not have any " + (value ? getSummary(type as NotifyType) + " " : "") + "notifications for " + (server ? server.name : "any server") + ".", ephemeral: config.ephemeralize.notify.list });
                return;
            }

            while (embeds.length) {
                respond(interaction, { embeds: embeds.slice(0, Math.min(embeds.length, 10)), ephemeral: config.ephemeralize.notify.list });
                embeds = embeds.slice(Math.min(embeds.length, 10), embeds.length);
            }

            return;
        }

        if (!server) {
            respond(interaction, { content: "Unknown server.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }

        if (type === "CLEAR") {
            if (profile?.options)
                profile.options = profile?.options.filter(opt => opt.server !== server?.name);
            respond(interaction, { content: "Successfully cleared your notification preferences for " + server.name + ".", ephemeral: config.ephemeralize.notify.clear });
            profile?.save();
            return;
        }

        const opt = new ClientOption({ guild: interaction.guildId, server: server.name, type: type as NotifyType, value: interaction.options.getString("value") });

        if (value === "CLEAR") {
            if (profile.options)
                profile.options = profile.options.filter(opt => opt.server !== server?.name || opt.type !== type);
            respond(interaction, { content: "Successfully cleared your " + type + " preferences for " + getSummary(opt.type) + ".", ephemeral: config.ephemeralize.notify.clear });
            profile?.save();
            return;
        }

        if (profile.options.includes(opt)) {
            respond(interaction, { content: "You are already being notified about that.", ephemeral: true });
            return;
        }
        if (profile.options.some(e => e.guild === opt.guild && e.server === opt.server && e.type === opt.type && e.value === opt.value)) {
            respond(interaction, { content: "You are already being notified about that.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }

        profile.options.push(opt);
        profile.save();
        respond(interaction, { content: "You will now be notified " + opt.getDescription(), ephemeral: config.ephemeralize.notify.add });
    },
};

function getEmbed(profile: ClientProfile, guild?: string, server?: string, type?: NotifyType): MessageEmbed[] {
    const result = [];
    const options = profile.options.filter(opt => (opt.guild === guild || !guild) && (opt.server === server || !server) && (opt.type === type || !type));
    const map = new Map<string, MessageEmbed>();
    const descriptions = new Map<string, string[]>();
    for (const option of options) {
        let embed = map.get(option.guild + option.server);
        if (!embed) {
            embed = new MessageEmbed();
            map.set(option.guild + option.server, embed);
            if (!guild || option.guild !== guild) {
                const guild = client.guilds.cache.get(option.guild)?.name;
                embed.setFooter("From " + (guild ? guild : option.guild));
            }
            embed.setTitle(option.server);
        }

        let desc = descriptions.get(option.guild + option.server);
        if (!desc)
            desc = [];
        let index = desc.indexOf("**" + getSummary(option.type) + "**");
        if (index === -1) {
            desc.push("");
            desc.push("**" + getSummary(option.type) + "**");
            index = desc.length;
        }

        desc.splice(index + 1, 0, "Notifying you " + option.getDescription());
        descriptions.set(option.guild + option.server, desc);
        embed.setColor(option.getColor());
    }
    for (const [id, description] of descriptions.entries()) {
        const embed = map.get(id);
        if (!embed)
            continue;
        embed.setDescription(description.join("\n"));
        result.push(embed);
    }
    return result;
}