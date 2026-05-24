const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'kron.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error(err.message);
    return;
  }

  console.log('Connected to Kron database');
});

const baseSchema = `
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    priority INTEGER NOT NULL DEFAULT 1,
    symbol TEXT,
    market TEXT,
    category TEXT,
    notes TEXT,
    created_at TEXT,
    updated_at TEXT
  )
`;

const additiveColumns = {
  time: 'TEXT',
  symbol: 'TEXT',
  market: 'TEXT',
  category: 'TEXT',
  notes: 'TEXT',
  created_at: 'TEXT',
  updated_at: 'TEXT',
};

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) {
        reject(err);
        return;
      }

      resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows);
    });
  });
}

async function ensureSchema() {
  await run(baseSchema);

  const columns = await all('PRAGMA table_info(events)');
  const existing = new Set(columns.map((column) => column.name));

  for (const [name, definition] of Object.entries(additiveColumns)) {
    if (!existing.has(name)) {
      await run(`ALTER TABLE events ADD COLUMN ${name} ${definition}`);
    }
  }
}

db.ready = ensureSchema();
db.runAsync = run;
db.allAsync = all;

module.exports = db;
