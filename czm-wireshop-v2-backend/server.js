// czm-wireshop-v2-backend/src/server.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { getDB } = require('./db');

const app = express();

app.use(express.json());
app.use(cookieParser());

// CORS: allow your frontends (comma-separated in CORS_ORIGIN)
const allowList = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // curl / same-origin
      if (allowList.length === 0 || allowList.includes(origin)) return cb(null, true);
      return cb(new Error(`Blocked by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// Health
app.get('/health', async (req, res) => {
  try {
    const db = await getDB();
    db.get('SELECT 1 as ok', (err, row) =>
      err ? res.status(500).json({ ok: false, error: err.message }) : res.json({ ok: true, users: 1 })
    );
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// All inventory (used by inventory.html)
app.get('/api/inventory', async (req, res) => {
  try {
    const db = await getDB();
    db.all('SELECT pn, qty, updated_at, updated_by FROM inventory ORDER BY pn', (err, rows) =>
      err ? res.status(500).json({ error: err.message }) : res.json(rows || [])
    );
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Single part inventory (used by part.html)
app.get('/api/inventory/:pn', async (req, res) => {
  const pn = req.params.pn;
  try {
    const db = await getDB();
    db.get('SELECT pn, qty, updated_at, updated_by FROM inventory WHERE pn = ?', [pn], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'not_found' });

      // Try to include recent history if table exists; ignore errors
      db.all(
        'SELECT change, qty_after, user AS updated_by, ts FROM inventory_log WHERE pn = ? ORDER BY ts DESC LIMIT 50',
        [pn],
        (e2, logs) => res.json({ ...row, history: Array.isArray(logs) ? logs : [] })
      );
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`backend listening on ${PORT}`));
