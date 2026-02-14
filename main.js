
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const { dialog } = require('electron');
const path = require('path');
const LicenseManager = require('./license-manager');
// settings store for persisting small key/value options (printerName, etc.)
let Store;
try { Store = require('electron-store'); } catch (e) { Store = null; }
const settingsStore = Store ? new Store() : null;

// Load optional runtime modules (`db`, `backup`) with resilient resolution so
// packaged `app.asar` or unpacked installations can locate them.
const tryRequire = (relPath) => {
  try {
    return require(relPath);
  } catch (e) {
    try {
      const appPath = app && typeof app.getAppPath === 'function' ? app.getAppPath() : null;
      if (appPath) {
        try { return require(path.join(appPath, relPath)); } catch (e2) {}
        try { return require(path.join(process.resourcesPath || '', 'app', relPath)); } catch (e3) {}
        try { return require(path.join(process.resourcesPath || '', relPath)); } catch (e4) {}
      }
    } catch (ee) {}
    return null;
  }
};

let mainWindow = null;
let licenseWindow = null;
const lm = new LicenseManager();
const backup = tryRequire('./backup.js');
const dbModule = tryRequire('./db.js');

function createLicenseWindow() {
  if (licenseWindow) return;
  licenseWindow = new BrowserWindow({
    width: 720,
    height: 520,
    resizable: false,
    modal: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    backgroundColor: '#020617',
    icon: path.join(__dirname, 'icon.ico')
  });

  licenseWindow.loadFile(path.join(__dirname, 'license.html'));
  licenseWindow.once('ready-to-show', () => {
    licenseWindow.show();
    const status = lm.checkStatus();
    licenseWindow.webContents.send('setup-ui', status);
  });

  licenseWindow.on('closed', () => { licenseWindow = null; });
}

function createWindow() {
  if (mainWindow) return;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 750,
    title: "العربية لصهر وتشكيل المعادن - نظام إدارة المخازن الاحترافي",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    backgroundColor: '#0f172a',
    icon: path.join(__dirname, 'icon.ico')
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    // In development, prefer Vite dev server. Support env override `VITE_DEV_URL` or common ports.
    const envUrl = process.env.VITE_DEV_URL;
    const tryUrls = [];
    if (envUrl) tryUrls.push(envUrl);
    tryUrls.push('http://localhost:5173');
    tryUrls.push('http://localhost:5174');

    const tryLoad = async () => {
      for (const u of tryUrls) {
        try {
          await mainWindow.loadURL(u);
          return;
        } catch (e) {
          // continue
        }
      }
      // last resort: load local file
      await mainWindow.loadFile(path.join(__dirname, 'index.html'));
    };

    tryLoad();
  } else {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    mainWindow.loadFile(indexPath).catch(() => {
      mainWindow.loadFile(path.join(__dirname, 'index.html'));
    });
  }

  // إرسال حالة الترخيص للواجهة فور التحميل
  mainWindow.webContents.on('did-finish-load', () => {
    const status = lm.checkStatus();
    mainWindow.webContents.send('license-info', status);
  });
  
  Menu.setApplicationMenu(null);
  mainWindow.on('closed', () => mainWindow = null);
}

// فحص نوع الكود أثناء الكتابة
ipcMain.on('check-key-type', (event, key) => {
    const type = lm.validateKey(key);
    event.reply('key-type-result', type);
});

// معالجة طلب التفعيل النهائي
ipcMain.on('submit-activation', (event, data) => {
    const type = lm.validateKey(data.key);
    let success = false;

    if (type === 'PERMANENT') {
        success = lm.activatePermanent();
    } else if (type === 'TRIAL') {
        if (data.days && parseInt(data.days) > 0) {
            success = lm.activateTrial(data.days);
        } else {
            event.reply('activation-error', 'يرجى تحديد عدد أيام التجربة');
            return;
        }
    }

    if (success) {
        if (licenseWindow) {
            licenseWindow.close();
            licenseWindow = null;
        }
        createWindow();
    } else {
        event.reply('activation-error', 'كود التنشيط غير صحيح لهذا الجهاز');
    }
});

// معالج للتحقق من الترخيص في أي وقت (يستدعى من الـ renderer)
ipcMain.handle('check-license-status', async (event) => {
  const status = lm.checkStatus();
  return status;
});

// معالج لإعادة فتح نافذة الترخيص (عند انتهاء الترخيص)
ipcMain.handle('reopen-license-window', async (event) => {
  try {
    if (mainWindow) {
      mainWindow.close();
      mainWindow = null;
    }
    createLicenseWindow();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Handler to update backup schedule (called from renderer when saving settings)
ipcMain.handle('update-backup-schedule', (event, cfg) => {
  try {
    if (backup && backup.updateSchedule && typeof backup.updateSchedule === 'function') {
      return backup.updateSchedule(cfg);
    }
    return { success: false, error: 'Backup module not available' };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

app.whenReady().then(() => {
  // Ensure database file exists in the user data folder (so app is fully offline and writable)
  try {
    const fs = require('fs');
    const userDataPath = app.getPath('userData');
    const userDbPath = path.join(userDataPath, 'db.sqlite');
    // First-run cache cleanup: if this is the first run of the new build, remove legacy cache folders
    const firstRunMarker = path.join(userDataPath, '.firstRunDone');
    if (!fs.existsSync(firstRunMarker)) {
      // legacy product names/paths to consider
      const legacyNames = [
        'العربية للمخازن Pro',
        'al-arabia-inventory-pro',
        'com.alarabia.inventory'
      ];
      const appData = app.getPath('appData');
      const localAppData = app.getPath('localData') || process.env.LOCALAPPDATA;
      const tryRemoveCache = (base, name) => {
        try {
          const candidate = path.join(base, name);
          if (fs.existsSync(candidate)) {
            // remove cache folders only
            const cacheFolders = ['Cache', 'GPUCache', 'cache', 'Local Storage', 'Code Cache'];
            cacheFolders.forEach(cf => {
              const cfPath = path.join(candidate, cf);
              if (fs.existsSync(cfPath)) {
                try { fs.rmSync(cfPath, { recursive: true, force: true }); console.log('Removed cache:', cfPath); } catch(e) {}
              }
            });
          }
        } catch (e) { }
      };
      legacyNames.forEach(n => { tryRemoveCache(appData, n); tryRemoveCache(localAppData, n); });
      try { fs.writeFileSync(firstRunMarker, new Date().toISOString()); } catch (e) {}
    }

    if (!fs.existsSync(userDbPath)) {
      // Try to copy a packaged template DB first
      let templatePath = path.join(__dirname, 'data', 'template.db');
      if (!fs.existsSync(templatePath) && process.resourcesPath) {
        templatePath = path.join(process.resourcesPath, 'data', 'template.db');
      }
      fs.mkdirSync(userDataPath, { recursive: true });
      if (fs.existsSync(templatePath)) {
        fs.copyFileSync(templatePath, userDbPath);
        console.log('Copied template DB to', userDbPath);
      } else {
        // Create an empty file (the DB layer will initialize it on first use)
        fs.writeFileSync(userDbPath, '');
        console.log('Created empty DB file at', userDbPath);
      }
    }
  } catch (err) {
    console.error('Error initializing user DB:', err && err.message ? err.message : err);
  }

  // initialize local DB and backup IPC handlers
  try { if (dbModule && dbModule.init) dbModule.init(ipcMain, app); } catch (e) {}
  try { if (backup && backup.init) backup.init(ipcMain, app); } catch (e) {}
  const status = lm.checkStatus();
  if (status.status === 'ACTIVATED' || status.status === 'TRIAL') {
    createWindow();
  } else {
    createLicenseWindow();
  }
});

// allow renderer to open folder picker for backup destination
ipcMain.handle('choose-backup-dest', async (event) => {
  try {
    const parentWindow = mainWindow || licenseWindow || null;
    const res = await dialog.showOpenDialog(parentWindow, { 
      properties: ['openDirectory', 'createDirectory'],
      title: 'اختر مجلد النسخ الاحتياطية',
      buttonLabel: 'اختيار'
    });
    return { success: true, canceled: res.canceled, paths: res.filePaths };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Printing helper (renderer can call via ipcRenderer.invoke('print'))
ipcMain.handle('print', async (event, options) => {
  try {
    const wc = (mainWindow || licenseWindow).webContents;
    return await new Promise((resolve) => {
      wc.print(options || {}, (success, failureReason) => {
        resolve({ success, failureReason });
      });
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Print ZPL directly to a networked Zebra printer (host:port)
ipcMain.handle('print-zpl', async (event, payload) => {
  try {
    const { zpl, host, port } = payload || {};
    if (!zpl) return { success: false, error: 'Missing ZPL payload' };
    // If host provided, attempt raw TCP send (accepted by Zebra printers on port 9100)
    if (host) {
      const net = require('net');
      const p = port || 9100;
      return await new Promise((resolve) => {
        const client = new net.Socket();
        let resolved = false;
        client.setTimeout(5000);
        client.connect(p, host, () => {
          client.write(Buffer.from(zpl, 'utf8'));
          client.end();
        });
        client.on('close', () => { if (!resolved) { resolved = true; resolve({ success: true }); } });
        client.on('error', (err) => { if (!resolved) { resolved = true; resolve({ success: false, error: err.message }); } });
        client.on('timeout', () => { if (!resolved) { resolved = true; resolve({ success: false, error: 'Connection timed out' }); client.destroy(); } });
      });
    }
    // No host provided — first try native printer module (optional), then try USB-connected printer via PowerShell
    try {
      const printer = require('printer'); // optional native dependency
      if (payload.printerName) {
        const buf = Buffer.from(zpl, 'utf8');
        printer.printDirect({ data: buf, printer: payload.printerName, type: 'RAW', success: function(jobID){}, error: function(err){} });
        return { success: true };
      }
    } catch (e) {
      // native module not available — proceed to PowerShell-based USB detection
    }

    // Attempt to find a USB-connected Zebra-like printer using PowerShell (Windows).
    try {
      const { execFile } = require('child_process');
      // Find a printer with PortName starting with USB or name containing Zebra/ZD
      const findArgs = ['-NoProfile', '-Command', "Get-Printer | Where-Object { $_.PortName -like 'USB*' -or $_.Name -like '*Zebra*' -or $_.Name -like '*ZD*' } | Select-Object -First 1 -ExpandProperty Name"];
      const printerName = await new Promise((resolve) => {
        execFile('powershell', findArgs, { windowsHide: true, encoding: 'utf8', maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
          if (err || !stdout) return resolve(null);
          const name = stdout.toString().trim();
          resolve(name || null);
        });
      });

      if (!printerName) {
        return { success: false, error: 'الطابعة غير متوصلة بالحاسوب' };
      }

      // Use PowerShell Out-Printer to send the ZPL to the found printer.
      // Embed ZPL in a here-string to preserve newlines.
      const safeCmd = `powershell -NoProfile -Command "$z=@'
${zpl}
'@; $z | Out-Printer -Name \"${printerName.replace(/\"/g, '')}\""`;
      const result = await new Promise((resolve) => {
        exec(safeCmd, { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
          if (err) return resolve({ success: false, error: err.message || stderr });
          resolve({ success: true });
        });
      });
      return result;
    } catch (err) {
      return { success: false, error: err && err.message ? err.message : String(err) };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Open folder helper
ipcMain.handle('open-path', (event, targetPath) => {
  try { shell.openPath(targetPath); return { success: true }; } catch (e) { return { success: false, error: e.message }; }
});

// Settings get/set via electron-store (optional)
ipcMain.handle('settings-get', (event, key) => {
  try {
    if (!settingsStore) return { success: false, error: 'store-not-available' };
    const v = settingsStore.get(key);
    return { success: true, value: v };
  } catch (e) { return { success: false, error: e && e.message ? e.message : String(e) }; }
});

ipcMain.handle('settings-set', (event, key, value) => {
  try {
    if (!settingsStore) return { success: false, error: 'store-not-available' };
    settingsStore.set(key, value);
    return { success: true };
  } catch (e) { return { success: false, error: e && e.message ? e.message : String(e) }; }
});

// Export localStorage snapshot (called from renderer before creating backup)
ipcMain.handle('export-user-data-snapshot', async (event, data) => {
  try {
    if (!data) return { success: false, error: 'no data provided' };
    const fs = require('fs');
    const path = require('path');
    const userData = app.getPath('userData');
    const snapshotPath = path.join(userData, 'data-snapshot.json');
    fs.writeFileSync(snapshotPath, JSON.stringify(data, null, 2));
    return { success: true, path: snapshotPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// Small modal input for asking the printer IP (renderer calls via electronAPI.askPrinterIp)
ipcMain.handle('ask-printer-ip', async (event) => {
  return await new Promise((resolve) => {
    const promptWin = new BrowserWindow({
      width: 420,
      height: 160,
      resizable: false,
      parent: mainWindow || null,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Printer IP</title><style>body{font-family:Arial,Helvetica,sans-serif;background:#0f172a;color:#fff;margin:0} .wrap{padding:14px} label{display:block;margin-bottom:8px} input{width:100%;padding:8px;border-radius:6px;border:1px solid #444;background:#0b1220;color:#fff} .actions{margin-top:12px;display:flex;gap:8px;justify-content:flex-end} button{padding:6px 12px;border-radius:6px;border:none;cursor:pointer} .ok{background:#0ea5a8;color:#012}</style></head><body><div class="wrap"><label>أدخل عنوان الطابعة الشبكية (IP) أو اتركه فارغاً:</label><input id="ip" autofocus placeholder="e.g. 192.168.1.50" /><div class="actions"><button id="cancel">إلغاء</button><button id="ok" class="ok">موافق</button></div></div><script>const {ipcRenderer} = require('electron'); document.getElementById('ok').addEventListener('click', ()=>{ const v=document.getElementById('ip').value || ''; ipcRenderer.send('printer-ip-response', v); }); document.getElementById('cancel').addEventListener('click', ()=>{ ipcRenderer.send('printer-ip-response', null); }); document.getElementById('ip').addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ document.getElementById('ok').click(); } });</script></body></html>`;

    ipcMain.once('printer-ip-response', (evt, value) => {
      try { promptWin.close(); } catch (e) {}
      resolve(value);
    });

    promptWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    promptWin.once('ready-to-show', () => promptWin.show());
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
