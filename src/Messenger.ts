import { generator } from ".";
import { ServerData } from "./ServerData";
import { deleteMessage, getTextChannel, sendMessageID } from "./Utils";

/**
 * Responsible for purging and timing the sending of messages
 */
export class Messenger {
    data: ServerData[] = [];
    stopped = false;

    public constructor(servers: ServerData[]) {
        this.data = servers;
        for (const c of this.data) {
            this.purge(c.channel);
        }
    }

    stop(): void {
        this.stopped = true;
    }

    /**
     * Adds the specified serverdata to be sent
     * @param data ServerData to add
     */
    add(data: ServerData): void {
        this.data.push(data);
        setTimeout(() => this.send(data), 1000);
    }

    remove(data: ServerData): void {
        this.data = this.data.filter(d => d.name !== data.name);
        deleteMessage(data);
    }

    /**
     * Purges the specified channel
     * @param channel 
     */
    async purge(channel: string): Promise<void> {
        getTextChannel(channel)?.bulkDelete(50).catch(error => { if (error) console.error('Failed to delete the message:', error); });
    }

    /**
     * Sends the serverdata to the appropriate channel
     * @param data 
     */
    send(data: ServerData): void {
        if (!this.getServerData(data))
            console.warn("Sending server data " + data.channel + " that we aren't responsible for it!");
        sendMessageID(data.channel, generator.generateMessage(data), data);
    }

    /**
     * Gets the servers linked to the messenger
     * @returns 
     */
    getServers(): ServerData[] {
        return this.data;
    }

    /**
     * Gets the server data instance that matches with the parameter's data
     * @param data ServerData to match
     * @returns The matched server data or null if none
     */
    public getServerData(data: ServerData): ServerData | null {
        for (const server of this.data) {
            if (server.name === data.name)
                return server;
        }
        return null;
    }

    /**
     * Updates our internal data with the provided argument's data
     * @param data New ServerData to update to
     * @returns 
     */
    public update(data: ServerData): void {
        const dat = this.getServerData(data);
        if (!dat) {
            console.warn("Attempted to save " + data.name + " to " + data.channel + " when we aren't responsible for it.");
            return;
        }
        dat.update(data);
    }

    /**
     * Starts the repeating task to send discord messages.
     * @param cooldown Time to wait before starting task
     * @param rate Time between tasks
     */
    public start(cooldown: number, rate: number): void {
        setTimeout(() => {
            if (this.stopped)
                return;
            this.data.forEach(d => this.send(d));
            for (const d of this.data)
                this.updateTopic(d.channel);
            this.start(rate, rate);
        }, cooldown);
    }

    /**
     * Updates channels which we send messages to with a summary of information of servers in that channel
     * @param channel Channel to update
     */
    updateTopic(channel: string): void {
        const servers = this.data.filter(s => s.channel === channel);
        if (servers === undefined) {
            console.warn("Attempted to set %s's topic but there are no servers linked to it", channel);
            return;
        }
        let players = 0, max = 0;
        for (const server of servers) {
            players += server.players.length;
            max += server.max;
        }

        getTextChannel(channel)?.setTopic(players + "/" + max + " (" + Math.round(players / max * 1000) / 10 + "%) players across " + servers.length + " server" + (servers.length === 1 ? "" : "s"));
    }
}