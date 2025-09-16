// czm-wireshop-v2-backend/server.js — single-file backend with CORS + working API
const express = require('express');
const cors = require('cors');
const { getDB } = require('./src/db');

const app = express();

// CORS: allow your prod site (and Render preview if you ever use it)
app.use(cors({
  origin: ['https://www.czm-us-wireshop.com','https://czm-wireshop-v2-frontend.onrender.com'],
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: false
}));
app.use(express.json({ limit: '1mb' }));

// Ensure tables exist (safe if already there)
async function ensureSchema(db) {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS parts(
      pn TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT,
      expected_hours REAL DEFAULT 0,
      notes TEXT DEFAULT ''
    );`);
    db.run(`CREATE TABLE IF NOT EXISTS inventory(
      pn TEXT PRIMARY KEY,
      qty INTEGER NOT NULL DEFAULT 0
    );`);
    db.run(`CREATE TABLE IF NOT EXISTS inventory_logs(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pn TEXT NOT NULL,
      delta INTEGER NOT NULL,
      source TEXT DEFAULT 'manual',
      ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`);
  });
}

// Sanity routes so we know THIS file is actually running
app.get('/health', async (_req, res) => res.json({ ok:true, users:1 }));
app.get('/api/_ping', (_req, res) => res.json({ ok:true, ts: Date.now() }));

// GET /api/inventory  -> whole list (parts + qty)
app.get('/api/inventory', async (_req, res) => {
  try {
    const db = await getDB(); await ensureSchema(db);
    db.all(
      `SELECT p.pn, p.name, p.location, p.expected_hours, p.notes, COALESCE(i.qty,0) AS qty
         FROM parts p
         LEFT JOIN inventory i ON i.pn = p.pn
         ORDER BY p.pn`,
      (err, rows) => err ? res.status(500).json({ ok:false, error: err.message })
                         : res.json(rows)
    );
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// GET /api/parts/:pn  -> single item (catalog fields + qty)
app.get('/api/parts/:pn', async (req, res) => {
  const pn = req.params.pn;
  try {
    const db = await getDB(); await ensureSchema(db);
    db.get(
      `SELECT p.pn, p.name, p.location, p.expected_hours, p.notes, COALESCE(i.qty,0) AS qty
         FROM parts p
         LEFT JOIN inventory i ON i.pn = p.pn
        WHERE p.pn = ?`,
      [pn],
      (err, row) => {
        if (err) return res.status(500).json({ ok:false, error: err.message });
        if (!row) return res.status(404).json({ ok:false, error: 'part not found' });
        res.json({ ok:true, part: row });
      }
    );
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// GET /api/inventory/:pn/logs  -> recent changes
app.get('/api/inventory/:pn/logs', async (req, res) => {
  const pn = req.params.pn;
  try {
    const db = await getDB(); await ensureSchema(db);
    db.all(
      `SELECT id, pn, delta, source, ts
         FROM inventory_logs
        WHERE pn = ?
        ORDER BY id DESC
        LIMIT 200`,
      [pn],
      (err, rows) => err ? res.status(500).json({ ok:false, error: err.message })
                         : res.json({ ok:true, logs: rows })
    );
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

// POST /api/inventory/:pn/adjust  -> +/- qty (used by QR and +/- buttons)
app.post('/api/inventory/:pn/adjust', async (req, res) => {
  const pn = req.params.pn;
  const delta = Number(req.body?.delta || 0);
  const source = (req.body?.source || 'qr').toString();
  if (!Number.isInteger(delta) || delta === 0) return res.status(400).json({ ok:false, error:'bad delta' });

  try {
    const db = await getDB(); await ensureSchema(db);
    db.serialize(() => {
      db.run(`INSERT INTO inventory (pn, qty) VALUES (?,0) ON CONFLICT(pn) DO NOTHING`, [pn]);
      db.run(`UPDATE inventory SET qty = qty + ? WHERE pn = ?`, [delta, pn]);
      db.run(`INSERT INTO inventory_logs (pn, delta, source) VALUES (?,?,?)`, [pn, delta, source], function (err) {
        if (err) return res.status(500).json({ ok:false, error: err.message });
        db.get(`SELECT qty FROM inventory WHERE pn = ?`, [pn], (e,row)=>{
          if (e) return res.status(500).json({ ok:false, error: e.message });
          res.json({ ok:true, pn, qty: row?.qty ?? 0 });
        });
      });
    });
  } catch (e) { res.status(500).json({ ok:false, error: e.message }); }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`WireShop API running on ${PORT}`));
