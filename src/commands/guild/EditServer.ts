import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { CommandInteraction, PermissionString } from "discord.js";
import { config, GAME_TYPES, getGuildProfile, getMessenger, selectData, VALID_COLORS } from "../..";
import { Messenger } from "../../Messenger";
import { apost, getTextChannel, respond } from "../../Utils";

const sopt = (sub: SlashCommandStringOption) => sub.setName("server").setDescription("The server to edit").setRequired(true);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("edit")
        .setDescription("Edits a specified server. Specify \"none\" to reset.")
        .setDefaultPermission(false)
        .addSubcommand(sub => sub.setName("ip").setDescription("Edits the IP of the server")
            .addStringOption(sopt)
            .addStringOption(sub => sub.setName("ip").setDescription("The IP to change to").setRequired(true)))
        .addSubcommand(sub => sub.setName("channel").setDescription("Edits the channel that the server is logged to")
            .addStringOption(sopt)
            .addChannelOption(option => option.setName("channel").setDescription("The channel to log to").setRequired(true)))
        .addSubcommand(sub => sub.setName("type").setDescription("Edits the type of server")
            .addStringOption(sopt)
            .addStringOption(option => option.setName("type").setDescription("The type of game").addChoices(GAME_TYPES).setRequired(true)))
        .addSubcommand(sub => sub.setName("color").setDescription("Sets the color of the embed (overrides auto-coloring)")
            .addStringOption(sopt)
            .addStringOption(option => option.setName("color").setDescription("The color to change to").addChoices(VALID_COLORS).setRequired(true)))
        .addSubcommand(sub => sub.setName("image").setDescription("Sets the image is embedded")
            .addStringOption(sopt)
            .addStringOption(option => option.setName("image").setDescription("The link to the image").setRequired(true)))
    ,
    async execute(interaction: CommandInteraction) {
        const type = interaction.options.getSubcommand();
        if (!type) {
            return;
        }
        if (!interaction.guildId || !interaction.inGuild()) {
            respond(interaction, { content: "This must be used in a guild.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        const server = await selectData(interaction.guildId, interaction.options.getString("server") ?? undefined, interaction, true);
        if (!server) {
            respond(interaction, { content: "Unknown server.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }

        const value = interaction.options.get(type);
        let channel;
        let key, vs;
        let msg;
        switch (type) {
            case "ip":
                if (!value?.value)
                    return;
                server.ip = value.value as string;
                key = "IP";
                vs = "`" + value.value + "`";
                break;
            case "channel":
                if (!value?.channel)
                    return;
                channel = value.channel;
                if (!getTextChannel(channel.id)) {
                    respond(interaction, { content: "Invalid channel: <#" + channel.id + "> is not a text channel.", ephemeral: config.ephemeralize.commands.onFail });
                    return;
                }
                if (!interaction.guild?.channels.cache.get(channel.id)?.permissionsFor(interaction.user)?.has(config.addServerPermission as PermissionString)) {
                    respond(interaction, { content: "You require the `" + config.addServerPermission + "` permission for <#" + channel.id + ">.", ephemeral: config.ephemeralize.commands.onFail });
                    return;
                }
                key = "Logging Channel";
                server.channel = channel.id;
                vs = "<#" + channel.id + ">";

                msg = getMessenger(interaction.guildId) ?? new Messenger([]);
                msg.remove(server); // Delete in old channel and re-send in new
                msg.add(server);
                break;
            case "type":
                server.type = value?.value as string ?? undefined;
                key = "Game Type";
                vs = "`" + server.type + "`";
                break;
            case "color":
                key = "Embed Color";
                if (value?.value === "NONE") {
                    server.color = undefined;
                    vs = "Dynamic";
                } else {
                    server.color = value?.value as string ?? undefined;
                    vs = value?.value as string;
                }
                break;
            case "image":
                key = "Embed Image";
                if (value?.value?.toString().toUpperCase() === "NONE") {
                    server.image = undefined;
                    vs = "None";
                } else {
                    server.image = value?.value as string ?? undefined;
                    vs = value?.value as string;
                }
                break;
            default:
                return;
        }
        const profile = getGuildProfile(interaction.guildId);
        profile.servers = profile.servers.filter(s => s.name !== server.name);
        profile.servers.push(server);
        profile.save();
        respond(interaction, { content: "Successfully changed " + apost(server.name) + " " + key + " to " + vs + ".", ephemeral: config.ephemeralize.editserver });
    }
};