const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs").promises; // Use the promise-based version of fs
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(process.env.DATA_DIR || __dirname, "db.json");

// --- Security Configuration ---
const SECRET_KEY = process.env.SECRET_KEY || "your-super-secret-key"; // Use an environment variable for production!

// Restrict CORS to your Netlify app's URL in production
const whitelist = [
  "http://localhost:3000",
  "https://your-netlify-app-name.netlify.app",
]; // <-- IMPORTANT: REPLACE WITH YOUR NETLIFY URL
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests) and whitelisted origins
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());

// Authentication middleware to protect POST and DELETE routes
const authenticate = (req, res, next) => {
  const providedKey = req.headers["x-secret-key"];
  if (providedKey === SECRET_KEY) {
    next();
  } else {
    res.status(403).json({ message: "Forbidden: Invalid secret key." });
  }
};

// --- Helper Functions ---
async function readDB() {
  try {
    const data = await fs.readFile(DB_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    // If file doesn't exist or is corrupted, return a default structure
    return { images: [], videos: [] };
  }
}

async function writeDB(data) {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing to database:", error);
    // In a real app, you might want to throw the error to be caught by the route handler
  }
}

// --- API Routes ---

// Get all media
app.get("/api/media", async (req, res) => {
  const db = await readDB();
  res.json(db);
});

// Add new media
app.post("/api/media", authenticate, async (req, res) => {
  const { url, type } = req.body;

  if (!url || !type || (type !== "image" && type !== "video")) {
    return res
      .status(400)
      .json({
        message:
          'Invalid request. "url" and "type" (image/video) are required.',
      });
  }

  const db = await readDB();
  if (type === "image" && !db.images.includes(url)) {
    db.images.push(url);
  } else if (type === "video" && !db.videos.includes(url)) {
    db.videos.push(url);
  }

  await writeDB(db);
  res.status(201).json({ message: "Media added successfully", url });
});

// Delete media
app.delete("/api/media", authenticate, async (req, res) => {
  const { url, type } = req.body;

  if (!url || !type) {
    return res
      .status(400)
      .json({ message: 'Invalid request. "url" and "type" are required.' });
  }

  const db = await readDB();
  let found = false;

  if (type === "image") {
    const initialLength = db.images.length;
    db.images = db.images.filter((imgUrl) => imgUrl !== url);
    if (db.images.length < initialLength) found = true;
  } else if (type === "video") {
    const initialLength = db.videos.length;
    db.videos = db.videos.filter((vidUrl) => vidUrl !== url);
    if (db.videos.length < initialLength) found = true;
  }

  if (found) {
    await writeDB(db);
    res.status(200).json({ message: "Media deleted successfully" });
  } else {
    res.status(404).json({ message: "Media not found" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
