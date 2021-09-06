const path = require("path");
const fs = require('fs');

let dir = path.resolve(__dirname, "./config.json");
const config = require(dir);

let build = config["build"];
if (!build)
    build = 0;
build++;

config["build"] = build;

fs.writeFile(dir, JSON.stringify(config), { flag: "w+" }, (e: Error) => {
    if (e)
        console.error(e);
});