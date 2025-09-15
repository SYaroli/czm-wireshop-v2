const express = require('express');
const router = express.Router();
const { getDB } = require('../db');

async function ensureSchema(db) {
  db.serialize(() => {
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

router.get('/:pn/logs', async (req, res) => {
  const pn = req.params.pn;
  try {
    const db = await getDB();
    await ensureSchema(db);
    db.all(
      `SELECT id, pn, delta, source, ts
         FROM inventory_logs
        WHERE pn = ?
        ORDER BY id DESC
        LIMIT 200`, [pn],
      (err, rows) => {
        if (err) return res.status(500).json({ ok:false, error: err.message });
        res.json({ ok:true, logs: rows });
      }
    );
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

router.post('/:pn/adjust', async (req, res) => {
  const pn = req.params.pn;
  const delta = Number(req.body?.delta || 0);
  const source = (req.body?.source || 'qr').toString();
  if (!Number.isInteger(delta) || delta === 0) return res.status(400).json({ ok:false, error:'bad delta' });

  try {
    const db = await getDB();
    await ensureSchema(db);
    db.serialize(() => {
      db.run(`INSERT INTO inventory_logs (pn, delta, source) VALUES (?,?,?)`, [pn, delta, source]);
      db.run(`INSERT INTO inventory (pn, qty) VALUES (?,0) ON CONFLICT(pn) DO NOTHING`, [pn]);
      db.run(`UPDATE inventory SET qty = qty + ? WHERE pn = ?`, [delta, pn], function(err){
        if (err) return res.status(500).json({ ok:false, error: err.message });
        db.get(`SELECT qty FROM inventory WHERE pn = ?`, [pn], (e,row)=>{
          if (e) return res.status(500).json({ ok:false, error: e.message });
          res.json({ ok:true, pn, qty: row?.qty ?? 0 });
        });
      });
    });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

module.exports = router;
