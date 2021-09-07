import { MessageActionRow, MessageButton, MessageComponentInteraction } from "discord.js";
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
        const args = data.ip.split(":");
        if (args.length !== 2) {
            console.warn("No port defined for %s.", data.name);
        }
        this.ip = args[0];
        this.port = args.length !== 2 ? undefined : parseInt(args[1]);
        this.data = new ServerData(data);
    }

    notifs = new Map<NotifyType, unknown>();

    /**
     * Queries Gamedig and updates the ServerData
     */
    async update(): Promise<void> {
        try {
            await this.Gamedig.query({
                type: this.data.type,
                host: this.ip,
                port: this.port,
                maxAttempts: 3
            }).then((state: { name: string, map: string, maxplayers: string, connect: string, raw: unknown, players: Array<{ name: string, ping: number }>, ping: number }) => {
                if (this.data.ping === -1 && this.everOnline)
                    this.notifs.set(NotifyType.STATUS, true);

                this.data.sourceName = state.name;
                if (this.data.map !== state.map && this.everOnline)
                    this.notifs.set(NotifyType.MAP, state.map);

                this.data.map = state.map;
                this.data.max = parseInt(state.maxplayers);
                this.data.connect = state.connect;
                this.data.raw = state.raw;
                const players: string[] = [];
                for (const p of state.players) {
                    if (p.name.length === 0)
                        continue;
                    players.push(p.name);
                }
                this.data.ping = state.ping;
                this.data.players = players;
                if (players.length && !this.data.getAdmins() && getMessenger(this.data.guild).getServerData(this.data)?.getAdmins())
                    this.notifs.set(NotifyType.ADMIN, undefined);
                getMessenger(this.data.guild)?.update(this.data);
                const newData = getMessenger(this.data.guild).getServerData(this.data);
                if (this.everOnline) {
                    if (newData?.joined)
                        for (const p of newData.joined) {
                            let joined: Array<{ name: string, online: boolean }> = this.notifs.get(NotifyType.PLAYER) as Array<{ name: string, online: boolean }>;
                            if (!joined || !(joined instanceof Array))
                                joined = [];
                            joined.push({ name: p, online: true });
                            this.notifs.set(NotifyType.PLAYER, joined);
                        }
                    if (newData?.left)
                        for (const p of newData.left) {
                            let left: Array<{ name: string, online: boolean }> = this.notifs.get(NotifyType.PLAYER) as Array<{ name: string, online: boolean }>;
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
                if (this.data.ping !== -1 && this.everOnline)
                    this.notifs.set(NotifyType.STATUS, false);
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

    notify(): void {
        for (const profile of clientProfiles.values()) {
            for (const option of profile.options.filter(o => o.guild === this.data.guild && o.server === this.data.name && this.notifs.has(o.type))) {
                const value = this.notifs.get(option.type);
                let message = "";
                switch (option.type) {
                    case NotifyType.ADMIN:
                        message = "**" + this.data.name + "** has no admins online.";
                        break;
                    case NotifyType.MAP:
                        if (!this.matches(option.value, value as string))
                            break;
                        message = "**" + this.data.name + "**'s map has changed to `" + value + "`.";
                        break;
                    case NotifyType.PLAYER:
                        for (const player of value as Array<{ name: string, online: boolean }>) {
                            if (!this.matches(option.value, player.name))
                                break;
                            message = "`" + player.name + "` " + (player.online ? "joined" : "left") + " **" + this.data.name + "**.";
                        }
                        break;
                    case NotifyType.STATUS:
                        message = "`" + this.data.name + "` is now **" + (value ? "Online" : "Offline") + "**.";
                        break;
                    default:
                        message = "You seem to have a broken notification setup.";
                        break;
                }
                if (!message)
                    continue;
                const stopId = Math.random() + "";
                const stop = new MessageActionRow().addComponents(
                    new MessageButton().setCustomId(stopId)
                        .setLabel("Unsubscribe").setStyle("DANGER").setEmoji("🛑"));
                const resumeId = Math.random() + "";
                const resume = new MessageActionRow().addComponents(
                    new MessageButton().setCustomId(resumeId)
                        .setLabel("Re-subscribe").setStyle("SUCCESS").setEmoji("✅"));

                sendDM(profile.id, { content: message, components: [stop] }).then(msg => {
                    const stopFilter = (i: MessageComponentInteraction) => i.customId === stopId || i.customId === resumeId && i.user.id === profile.id;
                    const collector = msg?.channel.createMessageComponentCollector({ filter: stopFilter });
                    collector?.on("collect", async click => {
                        if (click.customId === stopId) {
                            profile.options = profile.options.filter(p => p.guild !== option.guild || p.server !== option.server || p.type !== option.type || p.value !== option.value);
                            profile.save();
                            if (click.message.content.startsWith("You will"))
                                await click.update({ content: "You will no longer be notified " + option.getDescription(), components: [resume] });
                            else {
                                const used = new MessageButton().setLabel("Unsubscribed").setEmoji("❌").setStyle("DANGER").setCustomId("unused").setDisabled(true);
                                await click.update({ components: [new MessageActionRow().addComponents(used)] });
                                await click.followUp({ content: "You will no longer be notified " + option.getDescription(), components: [resume] });
                            }
                        } else if (click.customId === resumeId) {
                            profile.options.push(option);
                            profile.save();

                            await click.update({ content: "You will now be notified " + option.getDescription(), components: [stop] });
                        }
                    });
                });
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
            console.error(error);
        }
        return reg && reg.test(value) || value.includes(query);
    }

    stop(): void {
        this.stopped = true;
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
            this.update();
            this.start(rate, rate);
        }, cooldown);
    }
}