const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, 'choirai.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    composer TEXT,
    file_path TEXT,
    parts_data TEXT,
    tempo INTEGER DEFAULT 72,
    key_sig TEXT DEFAULT 'C大调',
    time_signature TEXT DEFAULT '4/4',
    total_measures INTEGER DEFAULT 2,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    attachments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
  );

  CREATE TABLE IF NOT EXISTS training_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    title TEXT NOT NULL,
    plan_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id)
  );

  CREATE TABLE IF NOT EXISTS rehearsal_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    score_id INTEGER,
    start_time DATETIME,
    end_time DATETIME,
    settings TEXT,
    issues TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (score_id) REFERENCES scores(id)
  );
`);

// Migration: add columns if not exist (SQLite doesn't support ADD COLUMN IF NOT EXISTS)
try { db.exec('ALTER TABLE scores ADD COLUMN tempo INTEGER DEFAULT 72'); } catch(e) {}
try { db.exec('ALTER TABLE scores ADD COLUMN key_sig TEXT DEFAULT "C大调"'); } catch(e) {}
try { db.exec('ALTER TABLE scores ADD COLUMN time_signature TEXT DEFAULT "4/4"'); } catch(e) {}
try { db.exec('ALTER TABLE scores ADD COLUMN total_measures INTEGER DEFAULT 2'); } catch(e) {}

module.exports = db;
