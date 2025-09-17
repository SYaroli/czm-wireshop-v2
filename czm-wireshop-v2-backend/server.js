// czm-wireshop-v2-backend/server.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// ❗ db.js sits in /src now
const { getDB } = require('./src/db');

const app = express();
app.use(express.json());
app.use(cookieParser());

// CORS — allow your site (and optional extra origins via env)
const corsOrigin = (process.env.CORS_ORIGIN || 'https://www.czm-us-wireshop.com')
  .split(',')
  .map(s => s.trim());
app.use(cors({ origin: corsOrigin, credentials: true }));

// Health check: also proves DB opens
app.get('/health', async (req, res) => {
  try {
    const db = await getDB();
    db.get('SELECT COUNT(*) AS users FROM users', [], (err, row) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json({ ok: true, users: row ? row.users : 0 });
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// -------- Inventory APIs --------

// All inventory (used by inventory.html)
app.get('/api/inventory', async (_req, res) => {
  try {
    const db = await getDB();
    db.all('SELECT * FROM inventory ORDER BY part_number ASC', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Single inventory item by PN (useful for part page)
app.get('/api/inventory/:pn', async (req, res) => {
  try {
    const db = await getDB();
    db.get('SELECT * FROM inventory WHERE part_number = ?', [req.params.pn], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Optional: catalog/part details (top of part page)
app.get('/api/parts/:pn', async (req, res) => {
  try {
    const db = await getDB();
    db.get('SELECT * FROM catalog WHERE part_number = ?', [req.params.pn], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Not found' });
      res.json(row);
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`backend listening on :${PORT}`));
