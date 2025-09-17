// src/db.js  (drop-in replacement)
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

let dbInstance = null;

function ensureDir(p) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function getDB() {
  if (dbInstance) return dbInstance;
  const dbPath =
    process.env.DB_PATH ||                // Render env currently set
    process.env.DATABASE_PATH ||          // legacy name
    path.join(__dirname, '..', 'data', 'wireshop.db'); // fallback in repo
  ensureDir(dbPath);
  dbInstance = new sqlite3.Database(dbPath);
  return dbInstance;
}

module.exports = { getDB };
