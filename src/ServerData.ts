/**
 * Represents a server. Its state is not set, and may or may not include many fields.
 */
export class ServerData {
    guild = "";
    name = "";
    sourceName = "";
    ip = "";
    channel = "";
    players: string[] = []; joined: string[] = []; left: string[] = [];
    max = 64;
    message = "";
    map = "";
    ping = -1;
    type = "csgo";
    color = "";
    image = "";
    connect = "";
    raw: unknown;

    public constructor(data: { guild: string, name: string, ip: string, channel: string, type?: string, color?: string, image?: string, raw?: unknown, connect?: string, overrideName?: string }) {
        this.name = data.name;
        this.ip = data.ip;
        this.guild = data.guild;
        this.channel = data.channel;
        if (data.type != undefined)
            this.type = data.type;
        if (data.color)
            this.color = data.color;
        if (data.image)
            this.image = data.image;
        this.raw = data.raw;
        if (data.connect)
            this.connect = data.connect;
        if (data.overrideName)
            this.sourceName = data.overrideName;
    }

    /**
     * Updates our internal data with the given data. Compares online / offline players and updates join/leave list.
     * @param data 
     */
    public update(data: ServerData): void {
        if (this.sourceName.length == 0 && data.sourceName.length != 0)
            this.sourceName = data.sourceName;
        this.map = data.map;
        this.max = data.max;
        this.ping = data.ping;
        this.raw = data.raw;
        this.connect = data.connect;

        this.joined = []; this.left = [];
        for (const p of data.players) {
            if (!this.players.includes(p)) {
                this.joined.push(p);
            }
        }
        for (const p of this.players) {
            if (!data.players.includes(p)) {
                this.left.push(p);
            }
        }
        this.players = data.players;
    }

    getAdmins(): number {
        let admins = 0;
        for (const player of this.players) {
            if (player.startsWith("=(eG"))
                admins++;
        }
        return admins;
    }

    /**
     * Gets the amount of online players. Due to different behavior in Gamedig's API, this should be used to get the amount of online players.
     * @returns 
     */
    getOnline(): number {
        if (!this.raw)
            return this.players.length;
        try {
            return (this.raw as { vanilla: { raw: { players: { online: number } } } }).vanilla.raw.players.online;
        } catch (error) {
            return this.players.length;
        }
    }

    toJSON(): unknown {
        return { guild: this.guild, name: this.name, ip: this.ip, channel: this.channel, type: this.type, color: this.color, image: this.image };
    }
}