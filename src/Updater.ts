import { clientProfiles, getMessenger } from ".";
import { ServerData } from "./ServerData";
import { sendDM } from "./Utils";

/**
 * Responsible for querying Gamedig's API and updating the responsible messenger.
 */
export class Updater {
    ip: string;
    port: number | undefined;
    data: ServerData;
    Gamedig = require("gamedig");
    stopped = false;

    public constructor(data: ServerData) {
        let args = data.ip.split(":");
        if (args.length != 2) {
            console.warn("No port defined for %s.", data.name);
        }
        this.ip = args[0];
        this.port = args.length != 2 ? undefined : parseInt(args[1]);
        this.data = new ServerData(data);
    }

    /**
     * Queries Gamedig and updates the ServerData
     */
    async update() {
        try {
            await this.Gamedig.query({
                type: this.data.type,
                host: this.ip,
                port: this.port,
                maxAttempts: 3
            }).then((state: any) => {
                if (this.data.ping == -1)
                    this.notifyStatus(true);
                this.data.sourceName = state.name;
                if (this.data.map != state.map)
                    this.notifyMap(state.map);
                this.data.map = state.map;
                this.data.max = parseInt(state.maxplayers);
                this.data.connect = state.connect;
                this.data.raw = state.raw;
                let players: string[] = [];
                for (let p of state.players) {
                    if (p.name.length == 0)
                        continue;
                    players.push(p.name);
                }
                this.data.ping = state.ping;
                this.data.players = players;
                getMessenger(this.data.guild)?.update(this.data);
                let newData = getMessenger(this.data.name)?.getServerData(this.data);
                if (newData?.joined)
                    for (let p of newData.joined)
                        this.notifyPlayer(p, true);
                if (newData?.left)
                    for (let p of newData.left)
                        this.notifyPlayer(p, false);
            }).catch((error: Error) => {
                if (this.data.ping != -1)
                    this.notifyStatus(false);
                this.data.players = [];
                this.data.map = "Offline";
                this.data.ping = -1;
                this.data.sourceName = this.data.name + " (Offline)";
                getMessenger(this.data.guild)?.update(this.data);
            });
        } catch (error) {
            console.error(error);
        }
    }

    /**
     * Notifies players about the server's status changing.
     * @param status 
     */
    notifyStatus(status: boolean) {
        for (let profile of clientProfiles.values()) {
            for (let option of profile.options) {
                if (option.server != this.data.name || option.type != "status")
                    continue;
                sendDM(profile.id, this.data.name + " is " + (status ? "now online" : "now offline"));
            }
        }
    }

    /**
     * Notifies players about the server's map changing.
     * @param newMap New map that was changed to
     */
    notifyMap(newMap: string) {
        for (let profile of clientProfiles.values()) {
            for (let option of profile.options) {
                if (option.server != this.data.name || option.type != "map")
                    continue;
                if (!this.matches(option.value, newMap))
                    continue;
                sendDM(profile.id, this.data.name + "'s map has changed to " + newMap);
            }
        }
    }

    /**
     * Notifies players about a player joining/leaving the server.
     * @param player Player that joined/left
     * @param online Whether the player is now online
     */
    notifyPlayer(player: string, online: boolean) {
        for (let profile of clientProfiles.values()) {
            for (let option of profile.options) {
                if (option.server != this.data.name || option.type != "player")
                    continue;
                if (!this.matches(option.value, player))
                    continue;
                sendDM(profile.id, player + " has " + (online ? "joined" : "left") + " " + option.server);
            }
        }
    }

    /**
     * Simple wrapper to allow for regex or normal contains queries
     * @param query Query to test
     * @param value Value to query
     * @returns True if the value contains or matches the query, false otherwise
     */
    matches(query?: string | null, value?: string): boolean {
        if (!query || !value)
            return false;
        let reg;
        try {
            reg = new RegExp(query);
        } catch (error) {
        }
        return (reg && reg.test(value)) || value.includes(query);
    }

    stop() {
        this.stopped = true;
    }

    /**
     * Starts the repeating task to send discord messages.
     * @param cooldown Time to wait before starting task
     * @param rate Time between tasks
     */
    public start(cooldown: number, rate: number) {
        setTimeout(() => {
            if (this.stopped)
                return;
            this.update();
            this.start(rate, rate);
        }, cooldown);
    }
}