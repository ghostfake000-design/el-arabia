const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

function init(ipcMain, app) {
  const userData = app.getPath('userData');
  // Canonical DB filename: db.sqlite (legacy installers may have used data.sqlite)
  const dbPath = path.join(userData, 'db.sqlite');
  const legacyDbPath = path.join(userData, 'data.sqlite');
  fs.mkdirSync(userData, { recursive: true });

  // If a legacy file exists and the canonical one does not, prefer the legacy file
  try {
    if (fs.existsSync(legacyDbPath) && !fs.existsSync(dbPath)) {
      try { fs.copyFileSync(legacyDbPath, dbPath); } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore permission errors */ }

  let SQL = null;
  let db = null;
  let ready = false;

  // Initialize SQL.js and load DB file if exists. Force locateFile to look in __dirname
  initSqlJs({ locateFile: (file) => path.join(__dirname, file) }).then((SQLlib) => {
    SQL = SQLlib;
    if (fs.existsSync(dbPath)) {
      const filebuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(new Uint8Array(filebuffer));
    } else {
      db = new SQL.Database();
      // create basic tables
      db.run(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);`);
      db.run(`CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, name TEXT, qty REAL DEFAULT 0, meta TEXT);`);
      persist();
    }
    ready = true;
  }).catch((err) => {
    console.error('Failed to init sql.js', err);
  });

  function persist() {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (e) {
      console.error('Persist error', e);
    }
  }

  function ensureReady() {
    return new Promise((resolve, reject) => {
      const t = setInterval(() => {
        if (ready) { clearInterval(t); resolve(); }
      }, 50);
      setTimeout(() => { clearInterval(t); reject(new Error('DB init timeout')); }, 10000);
    });
  }

  ipcMain.handle('db-run', async (event, sql, params) => {
    try {
      await ensureReady();
      const stmt = db.prepare(sql);
      if (params && Array.isArray(params)) stmt.bind(params);
      else if (params && typeof params === 'object') stmt.bind(params);
      const info = {};
      // for run-only statements
      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        stmt.step();
        stmt.free();
        persist();
        info.success = true;
        return { success: true, info };
      } else {
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return { success: true, rows };
      }
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db-get', async (event, sql, params) => {
    try {
      await ensureReady();
      const stmt = db.prepare(sql);
      if (params && Array.isArray(params)) stmt.bind(params);
      else if (params && typeof params === 'object') stmt.bind(params);
      let row = null;
      if (stmt.step()) row = stmt.getAsObject();
      stmt.free();
      return { success: true, row };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db-all', async (event, sql, params) => {
    try {
      await ensureReady();
      const stmt = db.prepare(sql);
      if (params && Array.isArray(params)) stmt.bind(params);
      else if (params && typeof params === 'object') stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db-file-path', () => ({ path: dbPath }));
}

module.exports = { init };
