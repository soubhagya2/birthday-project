const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(process.env.DATA_DIR || __dirname, 'db.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files from the root directory

// --- Helper Functions ---
function readDB() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Error reading database:", error);
        // If file doesn't exist or is corrupted, return a default structure
        return { images: [], videos: [] };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error("Error writing to database:", error);
    }
}

// --- API Routes ---

// Get all media
app.get('/api/media', (req, res) => {
    const db = readDB();
    res.json(db);
});

// Add new media
app.post('/api/media', (req, res) => {
    const { url, type } = req.body;

    if (!url || !type || (type !== 'image' && type !== 'video')) {
        return res.status(400).json({ message: 'Invalid request. "url" and "type" (image/video) are required.' });
    }

    const db = readDB();
    if (type === 'image' && !db.images.includes(url)) {
        db.images.push(url);
    } else if (type === 'video' && !db.videos.includes(url)) {
        db.videos.push(url);
    }

    writeDB(db);
    res.status(201).json({ message: 'Media added successfully', url });
});

// Delete media
app.delete('/api/media', (req, res) => {
    const { url, type } = req.body;

    if (!url || !type) {
        return res.status(400).json({ message: 'Invalid request. "url" and "type" are required.' });
    }

    const db = readDB();
    let found = false;

    if (type === 'image') {
        const initialLength = db.images.length;
        db.images = db.images.filter(imgUrl => imgUrl !== url);
        if (db.images.length < initialLength) found = true;
    } else if (type === 'video') {
        const initialLength = db.videos.length;
        db.videos = db.videos.filter(vidUrl => vidUrl !== url);
        if (db.videos.length < initialLength) found = true;
    }

    if (found) {
        writeDB(db);
        res.status(200).json({ message: 'Media deleted successfully' });
    } else {
        res.status(404).json({ message: 'Media not found' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT} to see the birthday page!`);
});