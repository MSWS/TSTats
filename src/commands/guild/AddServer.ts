import { SlashCommandBuilder, SlashCommandChannelOption } from "@discordjs/builders";
import { SlashCommandStringOption } from "@discordjs/builders/dist/interactions/slashCommands/options/string";
import { CommandInteraction, GuildChannel, MessageEmbed, PermissionString } from "discord.js";
import { addUpdater, client, config, GAME_TYPES, getData, getGuildProfile, getMessenger, setMessenger, VALID_COLORS } from "../..";
import { Messenger } from "../../Messenger";
import { ServerData } from "../../ServerData";
import { Updater } from "../../Updater";
import { getTextChannel, respond } from "../../Utils";

module.exports = {
    data: new SlashCommandBuilder().setName("addserver")
        .setDescription("Adds a server to the bot")
        .addStringOption((option: SlashCommandStringOption) => option.setName("name").setDescription("The name of the server").setRequired(true))
        .addStringOption((option: SlashCommandStringOption) => option.setName("ip").setDescription("The IP of the server").setRequired(true))
        .addStringOption((option: SlashCommandStringOption) => option.setName("type").setDescription("The type of game").addChoices(GAME_TYPES).setRequired(false))
        .addChannelOption((option: SlashCommandChannelOption) => option.setName("channel").setDescription("The channel to log server status to").setRequired(false))
        .addStringOption((option: SlashCommandStringOption) => option.setName("image").setDescription("Graph link if available").setRequired(false))
        .addStringOption((option: SlashCommandStringOption) => option.setName("color").setDescription("Hex color if desired").setRequired(false).addChoices(VALID_COLORS))
        .setDefaultPermission(false),
    async execute(interaction: CommandInteraction) {
        if (!interaction.guildId || !interaction.inGuild()) {
            respond(interaction, { content: "This must be used in a guild.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        let channel = interaction.options.getChannel("channel");
        if (!channel && interaction.channel)
            channel = interaction.channel as GuildChannel;
        if (!channel) {
            respond(interaction, { content: "Unknown channel.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        if (!getTextChannel(channel?.id)) {
            respond(interaction, { content: "Invalid channel: <#" + channel.id + "> is not a text channel.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }

        if (!interaction.guild?.channels.cache.get(channel.id)?.permissionsFor(interaction.user)?.has(config.addServerPermission as PermissionString)) {
            respond(interaction, { content: "You require the `" + config.addServerPermission + "` permission for <#" + channel.id + ">.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }

        if (!client.user)
            return;
        let me = interaction.guild.members.cache.get(client.user.id);
        if (!me)
            me = await interaction.guild.members.fetch({ user: client.user.id });
        if (!interaction.guild.channels.cache.get(channel.id)?.permissionsFor(me)?.has("SEND_MESSAGES")) {
            respond(interaction, { content: "I do not have permission to manage messages in <#" + channel.id + ">.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }

        const name = interaction.options.getString("name");

        if (!name) {
            respond(interaction, { content: "You must specify a server name.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }
        if (getData(interaction.guildId, name, true)) {
            respond(interaction, { content: "A server already exists by that name.", ephemeral: config.ephemeralize.commands.onFail });
            return;
        }

        const ip = interaction.options.getString("ip");
        let image: string | undefined = interaction.options.getString("image") ?? undefined;
        const type = interaction.options.getString("type");
        if (!image)
            image = undefined;
        if (!ip)
            return;
        const data = new ServerData({
            guild: interaction.guildId,
            name: name,
            ip: ip,
            channel: channel.id,
            image: image,
            type: type ?? undefined,
            color: interaction.options.getString("color") === "NONE" ? undefined : interaction.options.getString("color") ?? undefined
        });

        const update = new Updater(data);
        update.start(config.sourceDelay * 1000, config.sourceRate * 1000);
        addUpdater(data.guild, data.channel, update);
        const msg = getMessenger(interaction.guildId) ?? new Messenger([]);
        msg.add(data);
        setMessenger(interaction.guildId, msg);
        const profile = getGuildProfile(interaction.guildId);
        profile.servers.push(data);
        profile.save();

        const embed = new MessageEmbed();
        embed.setTitle("Success");
        embed.setDescription("Added " + data.name + " (" + data.ip + ")  to <#" + channel.id + ">.");
        embed.addField("Game", data.type, true);
        embed.addField("Color", data.color ?? "Dynamic", true);
        if (data.image)
            embed.addField("Image", data.image, true);
        embed.setColor("GREEN");
        respond(interaction, { embeds: [embed], ephemeral: config.ephemeralize.addserver });
    },
};