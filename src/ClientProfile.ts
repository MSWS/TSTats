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

export class ClientOption {
    guild: string;
    server: string;
    type: string;
    value: string | null;

    constructor(data: { guild: string, server: string, type: string, value: string | null }) {
        this.guild = data.guild;
        this.server = data.server;
        this.type = data.type;
        this.value = data.value;
    }
}