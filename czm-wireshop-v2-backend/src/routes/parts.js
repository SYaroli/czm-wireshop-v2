const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const vm = require('vm');

// make sure tables exist
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
  });
}

// server-side fallback: read catalog.js from the live frontend
async function fetchFromCatalog(pn) {
  const url = process.env.CATALOG_JS_URL || 'https://www.czm-us-wireshop.com/catalog.js';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`catalog ${res.status}`);
  const code = await res.text();
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  new vm.Script(code).runInContext(sandbox);
  const list = Array.isArray(sandbox.window.catalog) ? sandbox.window.catalog : [];
  const getPN = r => (r?.pn ?? r?.part_number ?? r?.['Part Number'] ?? '').toString().trim();
  const getName = r => (r?.print_name ?? r?.['Print Name'] ?? r?.name ?? '').toString().trim();
  const getLoc = r => (r?.location ?? r?.['Location'] ?? r?.bin ?? '').toString().trim();
  const row = list.find(r => getPN(r) === pn) || list.find(r => getPN(r).replace(/\./g,'') === pn.replace(/\./g,''));
  if (!row) return null;
  return {
    pn,
    name: getName(row) || pn,
    location: getLoc(row) || '',
    expected_hours: Number(row?.expected_hours ?? 0) || 0,
    notes: (row?.notes || '').toString()
  };
}

// GET /api/parts/:pn  -> merged part + qty
router.get('/:pn', async (req, res) => {
  const pn = req.params.pn;
  try {
    const db = await getDB();
    await ensureSchema(db);

    db.get(
      `SELECT p.pn, p.name, p.location, p.expected_hours, p.notes, COALESCE(i.qty,0) AS qty
         FROM parts p
         LEFT JOIN inventory i ON i.pn = p.pn
        WHERE p.pn = ?`,
      [pn],
      async (err, row) => {
        if (err) return res.status(500).json({ ok:false, error: err.message });

        if (row) return res.json({ ok:true, part: row });

        // not in DB — fall back to catalog.js, but still stitch qty if it exists
        const cat = await fetchFromCatalog(pn);
        if (!cat) return res.status(404).json({ ok:false, error: 'part not found' });

        db.get(`SELECT qty FROM inventory WHERE pn = ?`, [pn], (e,qrow) => {
          const qty = e ? 0 : (qrow?.qty ?? 0);
          res.json({ ok:true, part: { ...cat, qty } });
        });
      }
    );
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

module.exports = router;
