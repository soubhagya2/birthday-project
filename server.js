const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Render persistent storage
 * Local = project directory
 */
const DB_DIR = process.env.NODE_ENV === "production" ? "/data" : __dirname;
const DB_PATH = path.join(DB_DIR, "db.json");

console.log("Using DB path:", DB_PATH);

// ---------------- MIDDLEWARE ----------------
app.use(cors()); // allow all origins
app.use(bodyParser.json());

// ---------------- DB INIT ----------------
async function ensureDB() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });

    try {
      await fs.access(DB_PATH);
    } catch {
      await fs.writeFile(
        DB_PATH,
        JSON.stringify({ images: [], videos: [] }, null, 2)
      );
      console.log("db.json created");
    }
  } catch (err) {
    console.error("DB init error:", err);
  }
}

ensureDB();

// ---------------- HELPERS ----------------
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Read DB error:", err);
    return { images: [], videos: [] };
  }
}

async function writeDB(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
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
