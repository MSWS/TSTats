import { Channel, Message, MessageEmbed, MessageOptions, MessagePayload, TextChannel } from "discord.js";
import { client } from ".";
import { ServerData } from "./ServerData";

let messages = new Map<string, Message>();

export function sendMessage(channel: TextChannel, msg: any, data: ServerData) {
    if (messages.has(data.name)) {
        messages.get(data.name)?.fetch().then(m => {
            if (msg instanceof MessagePayload) {
                m.edit(msg);
            } else if (msg instanceof MessageEmbed) {
                m.edit({ embeds: [msg] });
            }
        }).catch(() => {
            forceMessage(channel, msg, data);
        });
        return;
    }
    forceMessage(channel, msg, data);
}

export function deleteMessage(data: ServerData) {
    if (!messages.has(data.name))
        return;
    messages.get(data.name)?.fetch().then(m => m.delete());
}

function forceMessage(channel: TextChannel, msg: any, data: ServerData) {
    if (msg instanceof MessagePayload) {
        channel.send(msg).then(msg => messages.set(data.name, msg));
    } else if (msg instanceof MessageEmbed) {
        channel.send({ embeds: [msg] }).then(m => messages.set(data.name, m));
    }
}

export function sendMessageID(id: string, msg: any, data: ServerData) {
    let chan = getTextChannel(id);
    if (chan != undefined)
        sendMessage(chan, msg, data);
}

export function getChannel(id: string): Channel | undefined {
    let chan = client.channels.cache.get(id);
    if (chan == null)
        return undefined;
    return chan;
}

export function getTextChannel(id: string): TextChannel | undefined {
    let chan = getChannel(id);
    if (!chan?.isText || chan?.type != "GUILD_TEXT")
        return undefined;

    return chan as TextChannel;
}

export async function sendDM(id: string, msg: string | MessagePayload | MessageOptions): Promise<Message | undefined> {
    let user = client.users.fetch(id);
    let channel = (await user).createDM();
    let message = await (await channel).send(msg);
    return message;
}