PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','tech')) DEFAULT 'tech',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parts (
  pn TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  expected_hours REAL DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS inventory (
  pn TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (pn),
  FOREIGN KEY (pn) REFERENCES parts(pn) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pn TEXT NOT NULL,
  assignee INTEGER,
  status TEXT NOT NULL CHECK (status IN ('Open','InProgress','Paused','Completed')) DEFAULT 'Open',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pn) REFERENCES parts(pn),
  FOREIGN KEY (assignee) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS time_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('start','pause','finish')),
  ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  seconds_delta INTEGER DEFAULT 0,
  FOREIGN KEY (job_id) REFERENCES jobs(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_pn ON inventory(pn);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_logs_job ON time_logs(job_id);
