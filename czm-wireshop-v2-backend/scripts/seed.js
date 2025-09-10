require('dotenv').config();
const bcrypt = require('bcryptjs');
const { getDB } = require('../src/db');

(async () => {
  const db = await getDB();
  const name = process.env.ADMIN_NAME || 'admin';
  const pin = process.env.ADMIN_PIN || '1234';
  const hash = await bcrypt.hash(pin, 10);

  db.run(
    `INSERT OR IGNORE INTO users (name, pin_hash, role) VALUES (?, ?, 'admin')`,
    [name, hash],
    function (err) {
      if (err) {
        console.error('Seed failed:', err.message);
        process.exit(1);
      }
      console.log(`Seeded admin user "${name}". Change the PIN now.`);
      process.exit(0);
    }
  );
})();
