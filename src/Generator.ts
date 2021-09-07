import { ColorResolvable, MessageEmbed, MessagePayload } from "discord.js";
import { config } from ".";
import { ServerData } from "./ServerData";

/**
 * Responsible for generating a message based on a given ServerData
 */
export interface Generator {
    /**
     * Generates the message. May be text, embed, etc.
     * @param data ServerData to generate from
     */
    generateMessage(data: ServerData): MessagePayload | MessageEmbed | string;
}

/**
 * Default implementation that generates an embed for a given ServerData
 */
export class EmbedGenerator implements Generator {
    generateMessage(data: ServerData): MessageEmbed {
        const embed = new MessageEmbed();

        embed.setTitle(data.sourceName.length === 0 || !config.useServerName ? data.name : data.sourceName);

        let len = 0;
        let desc = "";
        const sp = data.getOnline();
        for (const player of data.players.sort()) {
            if (len + player.length > config.lineLength) {
                desc = desc.substring(0, desc.length - 2);
                desc += "\n";
                len = 0;
            }
            desc += player + ", ";
            len += (player + ", ").length;
        }
        if (desc.length > 2)
            desc = desc.substring(0, desc.length - 2);

        embed.setDescription(desc ? desc : sp ? "" : "No players");
        embed.setColor(this.getColor(data) as ColorResolvable);

        embed.addField("Players", sp + "/" + data.max, true);
        if (data.map)
            embed.addField("Map", data.map, true);

        let footer = "";

        if (data.image)
            embed.setImage(data.image + "?t=" + Math.round(Date.now() / 1000 / 60 / config.cacheRate));

        // Don't show new players when the server starts up
        if (data.joined.length > 0 && data.joined.length !== sp) {
            footer += "[+] ";
            for (const p of data.joined)
                footer += p + ", ";
            footer = footer.substring(0, footer.length - 2);
        }
        if (data.left.length > 0) {
            footer += (footer ? "\n" : "") + "[-] ";
            for (const p of data.left)
                footer += p + ", ";
            footer = footer.substring(0, footer.length - 2);
        }

        embed.setFooter((footer.length !== 0 ? footer + "\n" : "") + (data.connect ? data.connect : data.ip) + "");
        embed.setTimestamp(Date.now());
        return embed;
    }

    getColor(data: ServerData): string {
        if (data.color)
            return data.color;
        const percent = data.getOnline() / data.max;
        let r = percent * 255;
        let g = Math.cos(data.map.length + 1) * 255;
        let b = Math.sin(data.ping + 1) * 255;
        r = Math.min(Math.max(r, 0), 255);
        g = Math.min(Math.max(g, 0), 255);
        b = Math.min(Math.max(b, 0), 255);
        return this.toHex(Math.round(r), Math.round(g), Math.round(b));
    }

    toHex(r: number, g: number, b: number): string {
        return "#" + this.compToHex(r) + this.compToHex(g) + this.compToHex(b);
    }

    compToHex(c: number): string {
        const hex = c.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    }

}