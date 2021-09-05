import { SlashCommandBuilder, SlashCommandChannelOption } from "@discordjs/builders";
import { SlashCommandStringOption } from "@discordjs/builders/dist/interactions/slashCommands/options/string";
import { CommandInteraction } from "discord.js";
import { config, getData, getGuildProfile, getMessenger } from "..";
import { ServerData } from "../ServerData";
import { Updater } from "../Updater";
import { getTextChannel } from "../Utils";

module.exports = {
    data: new SlashCommandBuilder().setName("addserver")
        .setDescription("Adds a server to the bot")
        .addChannelOption((option: SlashCommandChannelOption) => option.setName("channel").setDescription("The channel to log server status to").setRequired(true))
        .addStringOption((option: SlashCommandStringOption) => option.setName("name").setDescription("The name of the server").setRequired(true))
        .addStringOption((option: SlashCommandStringOption) => option.setName("ip").setDescription("The IP of the server").setRequired(true))
        .addStringOption((option: SlashCommandStringOption) => option.setName("type").setDescription("The type of game").addChoices([
            ["Minecraft", "minecraft"], ["CS:GO", "csgo"], ["Grand Theft Auto V", "fivem"], ["7 Days to Die", "7d2d"], ["Age of Chivalry", "ageofchivalry"], ["Age of Empires 2", "aoe2"], ["Arma 3", "arma3"], ["Call of Duty 3", "cod3"]
        ]).setRequired(true))
        .addStringOption((option: SlashCommandStringOption) => option.setName("image").setDescription("Graph link if available")).setDefaultPermission(false)
        .setDefaultPermission(false),
    async execute(interaction: CommandInteraction) {
        let channel = interaction.options.getChannel("channel");
        if (!channel) {
            await interaction.reply({ content: "No channel exists by that name.", ephemeral: true });
            return;
        }
        if (!getTextChannel(channel?.id)) {
            await interaction.reply({ content: "Invalid channel: <#" + channel.id + "> is not a text channel.", ephemeral: true });
            return;
        }
        if (!interaction.guildId || !interaction.inGuild()) {
            await interaction.reply({ content: "This must be used in a guild.", ephemeral: true });
            return;
        }
        if (!interaction.guild?.channels.cache.get(channel.id)?.permissionsFor(interaction.user)?.has("MANAGE_CHANNELS")) {
            await interaction.reply({ content: "You require the `MANAGE_CHANNELS` permission for <#" + channel.id + ">.", ephemeral: true });
            return;
        }
        let name = interaction.options.getString("name");

        if (!name) {
            await interaction.reply({ content: "You must specify a server name.", ephemeral: true });
            return;
        }
        if (getData(interaction.guildId, name, true)) {
            await interaction.reply({ content: "A server already exists by that name.", ephemeral: true });
            return;
        }

        let ip = interaction.options.getString("ip");
        let image: any = interaction.options.getString("image");
        if (!image)
            image = undefined;
        if (!checkParam("name", interaction) || !checkParam("ip", interaction) || !checkParam("channel", interaction))
            return;
        if (!ip)
            return;

        let data = new ServerData({
            guild: interaction.guildId,
            name: name,
            ip: ip,
            channel: channel.id,
            image: image,
        });

        new Updater(data).start(config.sourceDelay * 1000, config.sourceRate * 1000);
        getMessenger(interaction.guildId).add(data);
        let profile = getGuildProfile(interaction.guildId);
        profile.servers.push(data);
        profile.save();

        await interaction.reply({ content: "Successfully added " + data.name + " to <#" + channel.id + ">." });
    },
};

function checkParam(name: string, interaction: CommandInteraction): boolean {
    if (!interaction.options.get(name)) {
        interaction.reply("Must specify " + name);
        return false;
    }
    return true;
}