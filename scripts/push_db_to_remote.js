const fs = require("fs");
const path = require("path");

const PROJECT_DIR = path.resolve(__dirname, "..");
const DB_FILE = path.join(PROJECT_DIR, "api", "media", "db.json");
const REMOTE = "https://birthday-project-7ks7.onrender.com/api/media";

const args = process.argv.slice(2);
const doPush = args.includes("--push");

async function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.error("DB file not found:", DB_FILE);
    process.exit(1);
  }

  const raw = fs.readFileSync(DB_FILE, "utf8");
  const db = JSON.parse(raw);

  const items = [];
  for (const url of db.images || []) items.push({ url, type: "image" });
  for (const url of db.videos || []) items.push({ url, type: "video" });

  if (items.length === 0) {
    console.log("No media to push.");
    return;
  }

  console.log(
    doPush
      ? "PUSH MODE: sending to remote"
      : "DRY RUN: showing requests (use --push to actually send)"
  );

  for (const item of items) {
    console.log("-", JSON.stringify(item));
    if (doPush) {
      try {
        const res = await fetch(REMOTE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item),
        });
        const text = await res.text();
        console.log("  =>", res.status, text);
      } catch (err) {
        console.error("  ERROR:", err.message);
      }
      // small delay to avoid spamming
      await new Promise((r) => setTimeout(r, 200));
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
