// czm-wireshop-v2-backend/src/db.js
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

let dbInstance = null;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function getDB() {
  if (dbInstance) return dbInstance;

  // Choose DB path:
  // - If DB_PATH is set and relative -> resolve under backend root.
  // - If DB_PATH is absolute -> use as-is (NOT recommended on Render).
  // - Else -> use repo file ./data/wireshop.db
  const backendRoot = path.join(__dirname, '..');
  let dbPath = process.env.DB_PATH || process.env.DATABASE_PATH;

  if (!dbPath) {
    dbPath = path.join(backendRoot, 'data', 'wireshop.db');
  } else if (!path.isAbsolute(dbPath)) {
    dbPath = path.join(backendRoot, dbPath);
  }

  ensureDir(path.dirname(dbPath));
  dbInstance = new sqlite3.Database(dbPath);
  return dbInstance;
}

module.exports = { getDB };
