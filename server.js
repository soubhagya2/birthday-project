const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fsp = require("fs").promises;
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Render persistent storage
 * Local = project directory
 */
const DB_DIR = process.env.NODE_ENV === "production" ? "/data" : __dirname;
const LOCAL_API_DB = path.join(__dirname, "api", "media", "db.json");
let DB_PATH = path.join(DB_DIR, "db.json");

// If a project-local `api/media/db.json` exists, prefer it (developer convenience)
if (fs.existsSync(LOCAL_API_DB)) {
  DB_PATH = LOCAL_API_DB;
}
const SEED_DB_PATH = path.join(__dirname, "db.seed.json");

console.log("Using DB path:", DB_PATH);

// ---------------- MIDDLEWARE ----------------
app.use(cors()); // allow all origins
app.use(bodyParser.json());

// ---------------- DB INIT ----------------
async function ensureDB() {
  try {
    await fsp.mkdir(DB_DIR, { recursive: true });

    try {
      await fsp.access(DB_PATH);
    } catch (err) {
      if (err.code === "ENOENT") {
        // DB_PATH does not exist, so we create it.
        // This is the perfect time to seed it with initial data.
        console.log(
          `'${DB_PATH}' not found. Creating and seeding from '${SEED_DB_PATH}'...`
        );
        try {
          // Read the seed data
          const seedData = await fsp.readFile(SEED_DB_PATH, "utf8");
          // Write the seed data to the new DB file
          await fsp.writeFile(DB_PATH, seedData);
          console.log("db.json created and seeded successfully.");
        } catch (seedError) {
          // If seed file doesn't exist, create an empty DB
          console.warn(
            `Warning: Could not read seed file '${SEED_DB_PATH}'. Creating an empty database.`
          );
          await fsp.writeFile(
            DB_PATH,
            JSON.stringify({ images: [], videos: [] }, null, 2)
          );
          console.log("Empty db.json created.");
        }
      }
    }
  } catch (err) {
    console.error("DB init error:", err);
  }
}

ensureDB();

// ---------------- HELPERS ----------------
async function readDB() {
  try {
    const data = await fsp.readFile(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Read DB error:", err);
    return { images: [], videos: [] };
  }
}

async function writeDB(data) {
  try {
    await fsp.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Write DB error:", err);
  }
}

// ---------------- ROUTES ----------------

// Health check
app.get("/", (req, res) => {
  res.send("🎂 Birthday API running");
});

// Get all media
app.get("/api/media", async (req, res) => {
  const db = await readDB();
  res.json(db);
});

// Add media
app.post("/api/media", async (req, res) => {
  const { url, type } = req.body;

  if (!url || !["image", "video"].includes(type)) {
    return res.status(400).json({ message: "Invalid payload" });
  }

  const db = await readDB();

  if (type === "image" && !db.images.includes(url)) {
    db.images.push(url);
  }

  if (type === "video" && !db.videos.includes(url)) {
    db.videos.push(url);
  }

  await writeDB(db);
  res.status(201).json({ message: "Media added", url });
});

// Delete media
app.delete("/api/media", async (req, res) => {
  const { url, type } = req.body;

  if (!url || !type) {
    return res.status(400).json({ message: "Invalid request" });
  }

  const db = await readDB();
  let removed = false;

  if (type === "image") {
    const len = db.images.length;
    db.images = db.images.filter((i) => i !== url);
    removed = db.images.length < len;
  }

  if (type === "video") {
    const len = db.videos.length;
    db.videos = db.videos.filter((v) => v !== url);
    removed = db.videos.length < len;
  }

  if (!removed) {
    return res.status(404).json({ message: "Media not found" });
  }

  await writeDB(db);
  res.json({ message: "Media deleted" });
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
