const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');

let Database;
try {
  Database = require('better-sqlite3');
} catch (err) {
  parentPort.postMessage({ ready: false, error: 'better-sqlite3 not available: ' + err.message });
  throw err;
}

const dbPath = workerData && workerData.dbPath ? workerData.dbPath : path.join(process.cwd(), 'db.sqlite');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

let db;
try {
  db = new Database(dbPath, { fileMustExist: false });
  // Recommended pragmas for performance
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');

  // Ensure core tables exist and indexes for performance
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, name TEXT, qty REAL DEFAULT 0, meta TEXT);
    CREATE TABLE IF NOT EXISTS invoices (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, customer TEXT, date TEXT, total REAL, meta TEXT);
    CREATE INDEX IF NOT EXISTS idx_items_code ON items(code);
    CREATE INDEX IF NOT EXISTS idx_invoices_code ON invoices(code);
    CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer);
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date);
  `);

  parentPort.postMessage({ ready: true });
} catch (err) {
  parentPort.postMessage({ ready: false, error: err.message });
  throw err;
}

const pending = new Map();

function handleQuery(msg) {
  const { id, action, sql, params } = msg;
  const started = Date.now();
  try {
    if (!db) throw new Error('DB not opened');
    if (action === 'run' || action === 'exec') {
      const stmt = db.prepare(sql);
      const info = stmt.run(params);
      parentPort.postMessage({ id, success: true, info, duration: Date.now() - started });
      return;
    }
    if (action === 'get') {
      const stmt = db.prepare(sql);
      const row = stmt.get(params);
      parentPort.postMessage({ id, success: true, row, duration: Date.now() - started });
      return;
    }
    if (action === 'all') {
      const stmt = db.prepare(sql);
      const rows = stmt.all(params);
      parentPort.postMessage({ id, success: true, rows, duration: Date.now() - started });
      return;
    }
    parentPort.postMessage({ id, success: false, error: 'Unknown action', duration: Date.now() - started });
  } catch (err) {
    parentPort.postMessage({ id, success: false, error: err.message, duration: Date.now() - started });
  }
}

parentPort.on('message', (msg) => {
  if (!msg || typeof msg !== 'object') return;
  if (msg.type === 'ping') {
    parentPort.postMessage({ type: 'pong' });
    return;
  }
  handleQuery(msg);
});
