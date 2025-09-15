const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const { getDB } = require('./src/db');
const authRoutes = require('./src/routes/auth');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
  try {
    const db = await getDB();
    db.get('SELECT COUNT(*) AS users FROM users', (err, row) => {
      if (err) return res.status(500).json({ ok: false, error: err.message });
      res.json({ ok: true, users: row.users, env: 'up' });
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Routes
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`WireShop API running on port ${PORT}`);
});
