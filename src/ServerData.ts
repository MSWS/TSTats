export class ServerData {
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
    raw: any;

    public constructor(data: { name: string, ip: string, channel: string, type?: string, color?: string, image?: string, raw?: string, connect?: string, overrideName?: string }) {
        this.name = data.name;
        this.ip = data.ip;
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

    public update(data: ServerData) {
        if (this.sourceName.length == 0 && data.sourceName.length != 0)
            this.sourceName = data.sourceName;
        this.map = data.map;
        this.max = data.max;
        this.ping = data.ping;
        this.raw = data.raw;
        this.connect = data.connect;

        this.joined = []; this.left = [];
        for (let p of data.players) {
            if (!this.players.includes(p)) {
                this.joined.push(p);
                console.log("+", p);
            }
        }
        for (let p of this.players) {
            if (!data.players.includes(p)) {
                this.left.push(p);
                console.log("-", p);
            }
        }
        this.players = data.players;
    }

    getOnline(): number {
        if (!this.raw)
            return this.players.length;
        try {
            return this.raw.vanilla.raw.players.online;
        } catch (error) {
            return this.players.length;
        }
    }
}