import { Role } from "discord.js";
import { client } from ".";
import { ServerData } from "./ServerData";

const fs = require('fs');
const path = require("path");

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

    load() {
        let data = require(this.file);
        this.elevated = data["elevated"];
        let servers = data["servers"];
        if (!servers)
            return;
        for (let s of servers) {
            let serverData = new ServerData(s);
            serverData.guild = this.id;
            this.servers.push(serverData);
        }
    }

    save() {
        let data = JSON.stringify({ id: this.id, servers: this.servers, elevated: this.elevated });
        fs.writeFile(this.file, data, { flag: "w+" }, (e: Error) => {
            if (e)
                console.error(e);
        });
    }
}