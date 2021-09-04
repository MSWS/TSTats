import { generator } from ".";
import { ServerData } from "./ServerData";
import { getTextChannel, sendMessageID } from "./Utils";

export class Messenger {

    data = new Map<string, ServerData[]>();
    cancelled = false;

    public constructor(servers: ServerData[]) {
        servers.forEach(c => {
            let channels = this.data.get(c.channel);
            if (channels == null)
                channels = [];
            channels.push(c);
            this.data.set(c.channel, channels);
        });
        if (this.data.size > 1) {
            console.warn("Timer was created with " + this.data.size + " channels.");
            console.warn("This is usually unintended, each timer should only have 1 channel.")
        }

        for (let c of this.data.keys()) {
            this.purge(c);
        }
    }

    add(data: ServerData) {
        let channels = this.data.get(data.channel);
        if (channels == null)
            channels = [];
        channels.push(data);
        this.data.set(data.channel, channels);
        this.update(data);
        setTimeout(() => this.send(data), 1000);
    }

    async purge(channel: string) {
        getTextChannel(channel)?.bulkDelete(50).catch(error => {
            console.error('Failed to delete the message:', error);
        });
    }

    send(data: ServerData) {
        if (!this.getServerData(data))
            console.warn("Sending server data " + data.channel + " that we aren't responsible for it!");
        sendMessageID(data.channel, generator.generateMessage(data), data);
    }

    getServers(channel: string): ServerData[] {
        let d = this.data.get(channel);
        return d ? d : [];
    }

    getChannels(): string[] {
        return Array.from(this.data.keys());
    }

    public getServerData(data: ServerData): ServerData | null {
        for (let svs of this.data.values()) {
            for (let server of svs) {
                if (server.name == data.name)
                    return server;
            }
        }
        return null;
    }

    public cancel() {
        this.cancelled = true;
    }

    public update(data: ServerData) {
        let dat = this.getServerData(data);
        if (!dat) {
            console.warn("Attempted to save " + data.channel + " when we aren't responsible for it.");
            return;
        }
        dat.update(data);
    }

    

    public start(cooldown: number, rate: number) {
        if (this.cancelled)
            return;
        setTimeout(() => {
            if (this.cancelled)
                return;
            for (let data of this.data.values())
                data.forEach(d => this.send(d));
            for (let channel of this.data.keys())
                this.updateTopic(channel);
            this.start(rate, rate);
        }, cooldown);
    }

    updateTopic(channel: string) {
        let servers = this.data.get(channel);
        if (servers == undefined) {
            console.warn("Attempted to set %s's topic but there are no servers linked to it", channel);
            return;
        }
        let players = 0, max = 0;
        for (let server of servers) {
            players += server.players.length;
            max += server.max;
        }

        getTextChannel(channel)?.setTopic(players + "/" + max + " (" + Math.round(players / max * 1000) / 10 + "%) players across " + servers.length + " server" + (servers.length == 1 ? "" : "s"));
    }


}