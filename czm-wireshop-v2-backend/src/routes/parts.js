const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

async function ensureSchema(db) {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS parts (
      pn TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      expected_hours REAL DEFAULT 0,
      notes TEXT DEFAULT ''
    );`);
    db.run(`CREATE TABLE IF NOT EXISTS inventory (
      pn TEXT PRIMARY KEY,
      qty INTEGER NOT NULL DEFAULT 0
    );`);
    db.run(`CREATE TABLE IF NOT EXISTS inventory_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pn TEXT NOT NULL,
      delta INTEGER NOT NULL,
      source TEXT DEFAULT 'manual',
      ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`);
  });
}

router.get('/:pn', async (req, res) => {
  const pn = req.params.pn;
  try {
    const db = await getDB();
    await ensureSchema(db);
    db.get(
      `SELECT p.pn, p.name, p.location, p.expected_hours, p.notes,
              COALESCE(i.qty,0) AS qty
         FROM parts p
         LEFT JOIN inventory i ON i.pn = p.pn
        WHERE p.pn = ?`, [pn],
      (err, row) => {
        if (err) return res.status(500).json({ ok:false, error: err.message });
        if (!row) return res.status(404).json({ ok:false, error: 'part not found' });
        res.json({ ok:true, part: row });
      }
    );
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

module.exports = router;
