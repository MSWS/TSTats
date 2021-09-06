import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { getClientProfile, getData } from "..";
import { ClientOption } from "../ClientProfile";

module.exports = {
    data: new SlashCommandBuilder().setName("notify")
        .setDescription("Toggles notification for when a server's status changes")
        .addStringOption(o => o.setName("server").setDescription("The server whose status will be monitored").setRequired(true))
        .addStringOption(o => o.setName("type").setDescription("The thing to monitor").addChoices([
            ["Map Change", "map"], ["Online/Offline Status", "status"], ["Player Join/Leave", "player"], ["Reset", "reset"], ["Clear", "reset"]
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
        let server = getData(interaction.guildId, sn);
        if (!server) {
            await interaction.reply({ content: "Unknown server.", ephemeral: true });
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

        if (type == "reset") {
            if (profile?.options)
                profile.options = profile?.options.filter(opt => opt.server != server?.name);
            await interaction.reply({ content: "Successfully cleared your notification preferences for " + server.name + "." })
            profile?.save();
            return;
        }

        if (value == "reset" || value == "clear") {
            if (profile.options)
                profile.options = profile.options.filter(opt => opt.server != server?.name && opt.type != type);
            await interaction.reply({ content: "Successfully cleared your " + type + " preferences for " + server.name + "." })
            profile?.save();
            return;
        }

        let opt = new ClientOption({ server: server.name, type: type, value: interaction.options.getString("value") });

        if (type === "player" && !opt.value) {
            await interaction.reply({ content: "You must specify a player to watch.", ephemeral: true });
            return;
        }

        profile.options.push(opt);
        profile.save();

        let str = "";
        switch (type) {
            case "map":
                str = "when the map changes" + (value ? " to " + value : "") + " on " + server.name;
                break;
            case "player":
                str = "when " + (value ? value : "any player") + " joins on " + server.name;
                break;
            case "status":
                str = "when " + server.name + " goes offline/online";
                break;
            default:
                break;
        }
        await interaction.reply({ content: "You will now be notified " + str + ".", ephemeral: true });
    },
};
