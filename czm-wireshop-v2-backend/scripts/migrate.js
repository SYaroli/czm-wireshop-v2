const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { getDB } = require('../src/db');

(async () => {
  try {
    const db = await getDB();
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_init.sql'), 'utf8');
    db.exec(sql, (err) => {
      if (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
      } else {
        console.log('Migration complete.');
        process.exit(0);
      }
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
