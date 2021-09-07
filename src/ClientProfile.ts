import { ColorResolvable } from "discord.js";

const fs = require('fs');
const path = require("path");

/**
 * Represents a client's notification preferences
 */
export class ClientProfile {
    id: string;
    file: string;
    options: ClientOption[];

    constructor(user: string) {
        this.id = user;
        this.file = path.resolve(__dirname, "./profiles/" + user + ".json");
        this.options = [];
    }

    load() {
        let data = require(this.file);
        let opts = data["options"];
        if (opts)
            for (let o of opts)
                this.options.push(new ClientOption(o));
    }

    save() {
        let data = JSON.stringify({ id: this.id, options: this.options }, null, 2);
        fs.writeFile(this.file, data, { flag: "w+" }, (e: Error) => {
            if (e)
                console.error(e);
        });
    }
}

export enum NotifyType {
    MAP = "MAP", PLAYER = "PLAYER", STATUS = "STATUS", ADMIN = "ADMIN"
}

Object.freeze(NotifyType);

export class ClientOption {
    guild: string;
    server: string;
    type: NotifyType;
    value: string | null;

    constructor(data: { guild: string, server: string, type: NotifyType, value: string | null }) {
        this.guild = data.guild;
        this.server = data.server;
        this.type = data.type;
        this.value = data.value;
    }

    getDescription(): string {
        let str;
        switch (this.type) {
            case NotifyType.MAP:
                str = "when the map changes" + (this.value ? " to " + this.value : "") + " on " + this.server;
                break;
            case NotifyType.PLAYER:
                str = "when " + (this.value ? this.value : "any player") + " joins on " + this.server;
                break;
            case NotifyType.STATUS:
                str = "when " + this.server + " goes offline/online";
                break;
            case NotifyType.ADMIN:
                str = "when there are no admins on " + this.server;
                break;
            default:
                return "Unknown notification setting.";
        }
        return str + ".";
    }

    getColor(): ColorResolvable {
        switch (this.type) {
            case NotifyType.MAP:
                return "BLURPLE";
            case NotifyType.PLAYER:
                return "GREEN";
            case NotifyType.STATUS:
                return "BLUE";
            case NotifyType.ADMIN:
                return "RED";
            default:
                return "DARK_BUT_NOT_BLACK";
        }
    }
}

export function getSummary(type: NotifyType): string {
    switch (type) {
        case NotifyType.MAP:
            return "Map Change";
        case NotifyType.PLAYER:
            return "Player Session";
        case NotifyType.STATUS:
            return "Server Status";
        case NotifyType.ADMIN:
            return "No Admins";
    }
}