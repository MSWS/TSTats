const fs = require('fs');
const path = require("path");

export class Profile {
    id: string;
    file: string;
    options: Option[];

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
                this.options.push(new Option(o));
    }

    save() {
        let data = JSON.stringify({ id: this.id, options: this.options });
        fs.writeFile(this.file, data, { flag: "w+" }, (e: Error) => {
            if (e)
                console.error(e);
        });
    }
}

export class Option {
    server: string;
    type: string;
    value: string | null;

    constructor(data: { server: string, type: string, value: string | null }) {
        this.server = data.server;
        this.type = data.type;
        this.value = data.value;
    }
}