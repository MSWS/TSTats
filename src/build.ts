import path = require("path");
import fs = require('fs');

const dir = path.resolve(__dirname, "config.json");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const config = require(dir);

let build = config["build"];
if (!build)
    build = 0;
build++;

config.build = build;

fs.writeFile(dir, JSON.stringify(config, null, 2), { flag: "w+" }, (e) => { if (e) console.error("Failed to save config: ", e); });