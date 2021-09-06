import { SlashCommandBuilder, SlashCommandChannelOption } from "@discordjs/builders";
import { SlashCommandStringOption } from "@discordjs/builders/dist/interactions/slashCommands/options/string";
import { CommandInteraction, MessageEmbed } from "discord.js";
import { addUpdater, config, getData, getGuildProfile, getMessenger } from "..";
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
            ["7 Days to Die (2013)", "7d2d"],
            ["Ark: Survival Evolved (2017)", "arkse"],
            ["ARMA 3 (2013)", "arma3"],
            ["Battlefield: Bad Company 2 (2010)", "bfbc2"],
            ["Call of Duty: Modern Warfare 3 (2011)", "codmw3"],
            ["Counter-Strike: Global Offensive (2012)", "csgo"],
            ["Counter-Strike: Source (2004)", "css"],
            ["DayZ (2018)", "dayz"],
            ["Deus Ex (2000)", "deusex"],
            ["Doom 3 (2004)", "doom3"],
            ["Dota 2 (2013)", "dota2"],
            ["Garry's Mod (2004)", "garrysmod"],
            ["Grand Theft Auto V - FiveM (2013)", "fivem"],
            ["Minecraft (2009)", "minecraft"],
            ["Minecraft Bedrock", "minecraftpe"],
            ["Mordhau (2019)", "mordhau"],
            ["Rainbow Six", "r6"],
            ["Space Engineers", "spaceengineers"],
            ["Team Fortress 2", "tf2"],
            ["Teamspeak 3", "teamspeak3"],
            ["Terraria - TShock (2011)", "terraria"]
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
        let type = interaction.options.getString("type");
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
            type: type ? type : undefined
        });

        let update = new Updater(data);
        update.start(config.sourceDelay * 1000, config.sourceRate * 1000);
        addUpdater(update);
        getMessenger(interaction.guildId).add(data);
        let profile = getGuildProfile(interaction.guildId);
        profile.servers.push(data);
        profile.save();

        let embed = new MessageEmbed();
        embed.setTitle("Success");
        embed.setDescription("Added " + data.name + " (" + data.ip + ")  to _" + channel.name + "_.")
        embed.addField("Game", data.type, true);
        embed.addField("Color", data.color ? data.color : "Dynamic", true);
        if (data.image)
            embed.addField("Image", data.image, true);
        embed.setColor("GREEN");
        await interaction.reply({ embeds: [embed] });
    },
};

async function checkParam(name: string, interaction: CommandInteraction): Promise<boolean> {
    if (!interaction.options.get(name)) {
        await interaction.reply("Must specify " + name);
        return false;
    }
    return true;
}