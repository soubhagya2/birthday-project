const fs = require("fs");
const path = require("path");

const PROJECT_DIR = path.resolve(__dirname, "..");
const DB_DIR = process.env.NODE_ENV === "production" ? "/data" : PROJECT_DIR;
const LOCAL_API_DB = path.join(PROJECT_DIR, "api", "media", "db.json");
let DB_PATH = path.join(DB_DIR, "db.json");
if (fs.existsSync(LOCAL_API_DB)) DB_PATH = LOCAL_API_DB;

console.log("Resolved DB_PATH:", DB_PATH);
console.log("LOCAL_API_DB exists:", fs.existsSync(LOCAL_API_DB));
