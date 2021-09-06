import { Channel, Message, MessageEmbed, MessagePayload, TextChannel } from "discord.js";
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

export function sendDM(id: string, msg: any) {
    client.users.fetch(id).then(user => {
        user.createDM().then(channel => {
            channel.send(msg);
        })
    });
}