import { ServerData } from "./ServerData";

import fs = require('fs');
import path = require("path");

/**
 * Data container to hold guild specific settings (servers and permissions)
 */
export class GuildProfile {
    id: string;
    file: string;
    servers: ServerData[];
    elevated: string[];

    constructor(id: string) {
        this.id = id;
        this.servers = [];
        this.elevated = [];
        this.file = path.resolve(__dirname, "./configs/" + id + ".json");
    }

    load(): void {
        import(this.file).then(data => {
            this.elevated = data["elevated"];
            const servers = data["servers"];
            if (!servers)
                return;
            for (const s of servers) {
                const serverData = new ServerData(s);
                serverData.guild = this.id;
                if (this.servers.some(s => s.name === serverData.name)) {
                    console.warn("Prevented duplicate addition of " + serverData.name);
                    continue;
                }
                this.servers.push(serverData);
            }
        });
    }

    save(): void {
        const data = JSON.stringify({ id: this.id, servers: this.servers, elevated: this.elevated }, null, 2);
        fs.writeFile(this.file, data, { flag: "w+" }, e => { if (e) console.error("Failed to save guild profile: ", e); });
    }
}