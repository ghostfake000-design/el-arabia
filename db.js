const path = require('path');
const fs = require('fs');
const { Worker } = require('worker_threads');

function init(ipcMain, app) {
  const userData = app.getPath('userData');
  const dbPath = path.join(userData, 'db.sqlite');
  const legacyDbPath = path.join(userData, 'data.sqlite');
  fs.mkdirSync(userData, { recursive: true });

  try {
    if (fs.existsSync(legacyDbPath) && !fs.existsSync(dbPath)) {
      try { fs.copyFileSync(legacyDbPath, dbPath); } catch (e) { /* ignore */ }
    }
  } catch (e) { /* ignore permission errors */ }

  const workerFile = path.join(__dirname, 'worker.js');
  const worker = new Worker(workerFile, { workerData: { dbPath } });
  let ready = false;
  let readyError = null;

  const pending = new Map();

  worker.on('message', (msg) => {
    if (msg && msg.ready !== undefined) {
      ready = !!msg.ready;
      if (!ready) readyError = msg.error || 'Worker failed to init DB';
      return;
    }
    if (!msg || typeof msg !== 'object' || !msg.id) return;
    const resolver = pending.get(msg.id);
    if (!resolver) return;
    pending.delete(msg.id);
    try {
      if (msg.duration && msg.duration > 200) {
        console.warn(`Slow DB query detected: ${msg.duration}ms`, { id: msg.id, sqlSample: (msg.info && msg.info.sql) || 'n/a' });
      }
    } catch (e) {}
    resolver(msg);
  });

  worker.on('error', (err) => {
    ready = false;
    readyError = err.message;
    console.error('DB worker error', err);
  });

  function ensureReady() {
    return new Promise((resolve, reject) => {
      if (ready) return resolve();
      if (readyError) return reject(new Error(readyError));
      const t = setInterval(() => {
        if (ready) { clearInterval(t); resolve(); }
        if (readyError) { clearInterval(t); reject(new Error(readyError)); }
      }, 50);
      setTimeout(() => { clearInterval(t); reject(new Error('DB worker init timeout')); }, 10000);
    });
  }

  function sendToWorker(action, sql, params) {
    return new Promise((resolve) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      pending.set(id, (res) => resolve(res));
      const started = Date.now();
      worker.postMessage({ id, action, sql, params });
      // safety timeout
      setTimeout(() => {
        if (pending.has(id)) { pending.delete(id); resolve({ success: false, error: 'timeout' }); }
      }, 15000);
    });
  }

  ipcMain.handle('db-run', async (event, sql, params) => {
    try {
      await ensureReady();
      const res = await sendToWorker('run', sql, params);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db-get', async (event, sql, params) => {
    try {
      await ensureReady();
      const res = await sendToWorker('get', sql, params);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db-all', async (event, sql, params) => {
    try {
      await ensureReady();
      const res = await sendToWorker('all', sql, params);
      return res;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('db-file-path', () => ({ path: dbPath }));
}

module.exports = { init };
