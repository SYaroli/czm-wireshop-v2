const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const { getDB } = require('./src/db');
const authRoutes = require('./src/routes/auth');
const partsRoutes = require('./src/routes/parts');
const inventoryRoutes = require('./src/routes/inventory');

const app = express();

// CORS: allow your prod site and the Render static preview
app.use(cors({
  origin: [
    'https://www.czm-us-wireshop.com',
    'https://czm-wireshop-v2-frontend.onrender.com'
  ],
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '1mb' }));

// Health
app.get('/health', async (_req, res) => {
  try {
    const db = await getDB();
    db.get('SELECT COUNT(*) AS users FROM users', (err, row) => {
      if (err) return res.status(500).json({ ok:false, error: err.message });
      res.json({ ok:true, users: row?.users ?? 0 });
    });
  } catch (e) {
    res.status(500).json({ ok:false, error: e.message });
  }
});

app.use('/auth', authRoutes);
app.use('/api/parts', partsRoutes);
app.use('/api/inventory', inventoryRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`WireShop API running on ${PORT}`));
