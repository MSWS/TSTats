import { SlashCommandBuilder } from "@discordjs/builders";
import { SlashCommandStringOption } from "@discordjs/builders/dist/interactions/slashCommands/options/string";
import { CommandInteraction } from "discord.js";
import { config, getData, saveConfig } from "..";
import { ServerData } from "../ServerData";

module.exports = {
    data: new SlashCommandBuilder().setName("deleteserver")
        .setDescription("Deletes a server from the bot")
        .addStringOption((option: SlashCommandStringOption) => option.setName("name").setDescription("The name of the server to delete").setRequired(true))
        .setDefaultPermission(false),
    async execute(interaction: CommandInteraction) {
        let name = interaction.options.getString("name");
        if (!name) {
            await interaction.reply({ content: "You must specify the name of the server.", ephemeral: true });
            return;
        }
        let server = getData(name);
        if (server == null || !interaction.guild?.channels.cache.get(server.channel)) {
            await interaction.reply({ content: "Unknown server specified.", ephemeral: true });
            return;
        }
        config["servers"] = config["servers"].filter((data: ServerData) => data.name != name);
        saveConfig();
        await interaction.reply({ content: "Successfully deleted server", ephemeral: true });
    },
};
