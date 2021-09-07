import { clientProfiles, getMessenger } from ".";
import { NotifyType } from "./ClientProfile";
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
    everOnline = false;

    public constructor(data: ServerData) {
        let args = data.ip.split(":");
        if (args.length != 2) {
            console.warn("No port defined for %s.", data.name);
        }
        this.ip = args[0];
        this.port = args.length != 2 ? undefined : parseInt(args[1]);
        this.data = new ServerData(data);
    }

    notifs = new Map<NotifyType, any>();

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
                if (this.data.ping == -1 && this.everOnline) {
                    this.notifs.set(NotifyType.STATUS, true);
                }
                // this.notifyStatus(true);
                this.data.sourceName = state.name;
                if (this.data.map != state.map && this.everOnline) {
                    // this.notifyMap(state.map);
                    this.notifs.set(NotifyType.MAP, state.map);
                }
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
                if (players.length && !this.data.getAdmins() && getMessenger(this.data.guild).getServerData(this.data)?.getAdmins()) {
                    this.notifs.set(NotifyType.ADMIN, undefined);
                    // this.notifyAdmins();
                }
                getMessenger(this.data.guild)?.update(this.data);
                let newData = getMessenger(this.data.guild).getServerData(this.data);
                if (this.everOnline) {
                    if (newData?.joined)
                        for (let p of newData.joined) {
                            // this.notifyPlayer(p, true);
                            let joined = this.notifs.get(NotifyType.PLAYER);
                            if (!joined)
                                joined = [];
                            joined.push({ name: p, online: true });
                            this.notifs.set(NotifyType.PLAYER, joined);
                        }
                    if (newData?.left)
                        for (let p of newData.left) {
                            // this.notifyPlayer(p, false);
                            let left = this.notifs.get(NotifyType.PLAYER);
                            if (!left)
                                left = [];
                            left.push({ name: p, online: false });
                            this.notifs.set(NotifyType.PLAYER, left);
                        }
                }

                this.everOnline = true;
                this.notify();
                this.notifs.clear();
            }).catch(() => {
                if (this.data.ping != -1 && this.everOnline)
                    this.notifs.set(NotifyType.STATUS, false);
                // this.notifyStatus(false);
                this.data.players = [];
                this.data.map = "Offline";
                this.data.ping = -1;
                this.data.sourceName = this.data.name + " (Offline)";
                getMessenger(this.data.guild)?.update(this.data);
                this.notify();
                this.notifs.clear();
            });
        } catch (error) {
            console.error(error);
        }
    }

    notify() {
        for (let profile of clientProfiles.values()) {
            for (let option of profile.options.filter(o => o.guild == this.data.guild && o.server == this.data.name && this.notifs.has(o.type))) {
                let value = this.notifs.get(option.type);
                let message = "";
                switch (option.type) {
                    case NotifyType.ADMIN:
                        message = "**" + this.data.name + "** has no admins online.";
                        break;
                    case NotifyType.MAP:
                        if (!this.matches(option.value, value))
                            break;
                        message = "**" + this.data.name + "**'s map has changed to `" + value + "`.";
                        break;
                    case NotifyType.PLAYER:
                        for (let player of value) {
                            if (!this.matches(option.value, player.name))
                                break;
                            message = "`" + player.name + "` " + (player.online ? "joined" : "left") + " **" + this.data.name + "**."
                        }
                        break;
                    case NotifyType.STATUS:
                        message = "`" + this.data.name + "` is now **" + (value ? "Online" : "Offline") + "**.";
                        break;
                }
                if (!message)
                    continue;

                sendDM(profile.id, message);
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
        if (!query)
            return true;
        if (!value)
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