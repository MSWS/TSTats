import { MessageActionRow, MessageButton, MessageComponentInteraction, MessageEmbed, MessageSelectMenu, SelectMenuInteraction } from "discord.js";
import { client, clientProfiles, getMessenger } from ".";
import { getSummary, NotifyType } from "./ClientProfile";
import { Messenger } from "./Messenger";
import { ServerBase, ServerData } from "./ServerData";
import { apost, plural, sendDM } from "./Utils";

/**
 * Responsible for querying Gamedig's API and updating the responsible messenger.
 */
export class Updater {
    ip: string;
    port: number | undefined;
    data: ServerData;
    Gamedig = require("gamedig");
    stopped = false;
    stopTicks: number;
    everOnline = false;

    public constructor(data: ServerBase) {
        const args = data.ip.split(":");
        this.ip = args[0];
        this.port = args.length !== 2 ? undefined : parseInt(args[1]);
        this.data = new ServerData(data);
        this.stopTicks = 0;
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
                if (this.data.ping === -1 && this.everOnline) {
                    this.notifs.set(NotifyType.ONLINE, true);
                    this.notifs.set(NotifyType.STATUS, true);
                }

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
                if (players.length && !this.data.getAdmins() && (getMessenger(this.data.guild) ?? new Messenger([])).getServerData(this.data)?.getAdmins())
                    this.notifs.set(NotifyType.ADMIN, undefined);
                getMessenger(this.data.guild)?.update(this.data);
                const newData = (getMessenger(this.data.guild) ?? new Messenger([])).getServerData(this.data);
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
                this.stopTicks = 0;
                this.notifs.set(NotifyType.DEBUG, undefined);
                this.notify();
                this.notifs.clear();
            }).catch(() => {
                if (this.data.ping !== -1 && this.everOnline && this.stopTicks > 3) {
                    this.notifs.set(NotifyType.STATUS, false);
                    this.notifs.set(NotifyType.OFFLINE, false);
                }
                this.data.players = [];
                this.data.map = "Offline";
                this.data.ping = -1;
                this.data.sourceName = this.data.name + " (Offline)";
                getMessenger(this.data.guild)?.update(this.data);
                this.notify();
                this.notifs.clear();
                this.stopTicks++;
                this.notifs.set(NotifyType.DEBUG, undefined);
            });
        } catch (error) {
            console.error(error);
        }
    }

    notify(): void {
        for (const profile of clientProfiles.values()) {
            for (const option of profile.options.filter(o => o.guild === this.data.guild && o.server === this.data.name && this.notifs.has(o.type))) {
                const stopId = Math.random() + "", snoozeId = Math.random() + "", selectId = Math.random() + "", unsnoozeId = Math.random() + "", deleteId = Math.random() + "", infoId = Math.random() + "";
                const editId = Math.random() + "", collapseId = Math.random() + "";

                const editRow = new MessageActionRow().addComponents(
                    new MessageButton().setCustomId(editId)
                        .setLabel("").setEmoji("▶️").setStyle("SECONDARY")
                );
                const primaryRow = new MessageActionRow().addComponents(
                    new MessageButton().setCustomId(deleteId)
                        .setLabel("Delete").setStyle("SUCCESS").setEmoji("🗑️"),
                    new MessageButton().setCustomId(snoozeId)
                        .setLabel("Snooze").setStyle("PRIMARY").setEmoji("💤"),
                    new MessageButton().setCustomId(stopId)
                        .setLabel("Stop").setStyle("DANGER").setEmoji("🛑"),
                    new MessageButton().setCustomId(infoId)
                        .setLabel("Info").setStyle("SECONDARY").setEmoji("📖"),
                    new MessageButton().setCustomId(collapseId)
                        .setLabel("").setStyle("SECONDARY").setEmoji("◀️")
                );
                const resumeId = Math.random() + "";
                const resume = new MessageActionRow().addComponents(
                    new MessageButton().setCustomId(deleteId)
                        .setLabel("Delete").setStyle("SUCCESS").setEmoji("🗑️"),
                    new MessageButton().setCustomId(resumeId)
                        .setLabel("Resume").setStyle("PRIMARY").setEmoji("✅"));
                const unsnoozeRow = new MessageActionRow().addComponents(
                    new MessageButton().setCustomId(unsnoozeId)
                        .setLabel("Unsnooze").setStyle("PRIMARY").setEmoji("⏰"));
                const selectRow = new MessageActionRow().addComponents(new MessageSelectMenu().setCustomId(selectId).setPlaceholder("Snooze Duration")
                    .addOptions([{
                        label: "5 Minutes",
                        description: "Snooze this notification for 5 minutes",
                        value: "5"
                    }, {
                        label: "10 Minutes",
                        description: "Snooze this notification for 10 minutes",
                        value: "10"
                    }, {
                        label: "30 Minutes",
                        description: "Snooze this notification for 30 minutes",
                        value: "30"
                    }, {
                        label: "1 Hour",
                        description: "Snooze this notification for 1 hour",
                        value: "60"
                    }, {
                        label: "3 Hours",
                        "description": "Snooze this notification for 3 hours",
                        value: "180"
                    }, {
                        label: "12 Hours",
                        "description": "Snooze this notification for 12 hours",
                        value: "720"
                    }, {
                        label: "1 Day",
                        "description": "Snooze this notification for 1 day",
                        value: "1440"
                    }
                    ]));

                const value = this.notifs.get(option.type);
                let message = "";
                switch (option.type) {
                    case NotifyType.ADMIN:
                        message = "**" + this.data.name + "** has `" + this.data.getOnline() + "` " + plural("player", this.data.getOnline()) + " but no admins online.";
                        break;
                    case NotifyType.MAP:
                        if (!this.matches(option.value, value as string))
                            break;
                        message = "**" + apost(this.data.name) + "** map changed to `" + value + "`.";
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
                    case NotifyType.ONLINE:
                    case NotifyType.OFFLINE:
                        message = "`" + this.data.name + "` is now **" + (value ? "Online" : "Offline") + "**.";
                        break;
                    case NotifyType.DEBUG:
                        message = "**" + this.data.name + "** updated.";
                        break;
                    default:
                        profile.options = profile.options.filter(opt => opt !== option);
                        break;
                }
                if (!message)
                    continue;

                sendDM(profile.id, { content: message, components: [editRow] }).then(msg => {
                    if (!msg)
                        return;
                    const stopFilter = (i: MessageComponentInteraction) => {
                        return i.user.id === profile.id;
                    };
                    const collector = msg.channel.createMessageComponentCollector({ filter: stopFilter });
                    collector?.on("collect", async click => {
                        if (click.customId === editId) {
                            await click.update({ components: [primaryRow] });
                        } else if (click.customId === collapseId) {
                            await click.update({ components: [editRow] });
                        } else if (click.customId === selectId) {
                            if (!profile.options.includes(option)) {
                                await click.followUp({ content: "You already stopped these notifications.", ephemeral: true });
                                return;
                            }
                            const select = click as SelectMenuInteraction;
                            const minutes = parseInt(select.values[0]);
                            profile.options = profile.options.filter(p => p.guild !== option.guild || p.server !== option.server || p.type !== option.type || p.value !== option.value);
                            setTimeout(async function () {
                                const reply = await click.fetchReply();
                                const msg = await click.channel?.messages.fetch(reply.id);
                                if (!msg)
                                    return;
                                msg.edit({ content: "Snooze has expired, notifications have resumed.", components: [] }).catch((e) => { if (e) console.error("Unable to delete message: ", e); });
                                if (profile.options.some(e => e.guild === option.guild && e.server === option.server && e.type === option.type && e.value === option.value))
                                    return;
                                profile.options.push(option);
                            }, minutes * 60 * 1000);
                            const time = Math.round(Date.now() / 1000 + minutes * 60);
                            await click.update({ content: "Successfully snoozed notifications " + option.getDescription() + " They will be re-enabled <t:" + time + ":R>.", components: [unsnoozeRow] });
                        } else if (click.customId === snoozeId) {
                            if (!profile.options.includes(option)) {
                                await click.followUp({ content: "You already stopped these notifications.", ephemeral: true });
                                return;
                            }
                            const used = new MessageButton().setLabel("Snoozed").setEmoji("🛏️").setStyle("PRIMARY").setCustomId("unused").setDisabled(true);
                            await click.update({ components: [new MessageActionRow().addComponents(used)] });
                            await click.followUp({ content: "Snoozing will temporarily disable notifications for " + option.getDescription(), components: [selectRow], fetchReply: true });
                        } else if (click.customId === stopId) {
                            profile.options = profile.options.filter(p => p.guild !== option.guild || p.server !== option.server || p.type !== option.type || p.value !== option.value);
                            profile.save();
                            if (click.message.content.startsWith("You will"))
                                await click.update({ content: "You will no longer be notified " + option.getDescription(), components: [resume] });
                            else {
                                const used = new MessageButton().setLabel("Stopped").setEmoji("❌").setStyle("DANGER").setCustomId("unused").setDisabled(true);
                                await click.update({ components: [new MessageActionRow().addComponents(used)] });
                                await click.followUp({ content: "You will no longer be notified " + option.getDescription(), components: [resume] });
                            }
                        } else if (click.customId === resumeId) {
                            profile.options.push(option);
                            profile.save();

                            await click.update({ content: "Resumed notifications for " + option.getDescription(), components: [primaryRow] });
                        } else if (click.customId === unsnoozeId) {
                            profile.options.push(option);
                            profile.save();

                            const used = new MessageButton().setLabel("Unsnoozed").setEmoji("⏰").setStyle("PRIMARY").setCustomId("unused").setDisabled(true);
                            await click.update({ content: "Successfully re-enabled notifications for " + option.getDescription(), components: [new MessageActionRow().addComponents(used)] });
                        } else if (click.customId === deleteId) {
                            click.channel?.messages.fetch(click.message.id).then(m => m.delete()).catch(e => {
                                if (e) console.error("Could not delete message: ", e);
                            });
                        } else if (click.customId === infoId) {
                            let guild = client.guilds.cache.get(option.guild);
                            if (!guild)
                                guild = await client.guilds.fetch(option.guild);
                            const guildName = guild.name;
                            const embed = new MessageEmbed();
                            embed.setTitle(getSummary(option.type) + " Notification");
                            embed.setDescription("This notification is triggered " + option.getDescription() + "\n\nYou enabled this notification in " + apost(guildName) + " server.\nChannel: <#" + this.data.channel + ">");
                            embed.setColor("AQUA");
                            click.reply({ embeds: [embed], ephemeral: true });
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