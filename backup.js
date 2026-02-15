const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

function formatTimestamp(d) {
  return d.toISOString().replace(/[:.]/g, '-');
}

function init(ipcMain, app) {
  const userData = app.getPath('userData');
  const docs = app.getPath('documents');
  const backupDir = path.join(docs, 'Al-Arabia-Backups');
  fs.mkdirSync(backupDir, { recursive: true });

  ipcMain.handle('create-backup', (event, destPath) => {
    try {
      const cfg = loadConfig();
      const timestamp = formatTimestamp(new Date());
      const defaultDest = cfg.dest || path.join(backupDir, `backup-${timestamp}.zip`);
      const dest = destPath || defaultDest;
      const zip = new AdmZip();
      
      // Include userData folder (database, cache, etc)
      zip.addLocalFolder(userData, path.basename(userData));
      
      // Create a manifest file with backup metadata
      const manifest = {
        timestamp: new Date().toISOString(),
        version: '4.0.0',
        description: 'Complete backup including all system data'
      };
      zip.addFile('BACKUP_MANIFEST.json', Buffer.from(JSON.stringify(manifest, null, 2'), 'utf8'));
      
      zip.writeZip(dest);
      return { success: true, path: dest };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('list-backups', () => {
    try {
      const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.zip'));
      const full = files.map(f => path.join(backupDir, f));
      return { success: true, backups: full };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('restore-backup', (event, zipPath) => {
    try {
      if (!fs.existsSync(zipPath)) return { success: false, error: 'zip not found' };
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(app.getPath('userData'), true);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // persist simple backup scheduler settings to a json file
  const configPath = path.join(backupDir, 'backup-config.json');
  function saveConfig(cfg) {
    try { fs.writeFileSync(configPath, JSON.stringify(cfg, null, 2)); return true; } catch (e) { return false; }
  }
  function loadConfig() {
    try { if (fs.existsSync(configPath)) return JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) {}
    return { enabled: false, hour: 22 };
  }

  ipcMain.handle('save-backup-settings', (event, cfg) => {
    try { const ok = saveConfig(cfg); return { success: ok }; } catch (e) { return { success: false, error: e.message }; }
  });

  ipcMain.handle('get-backup-settings', () => {
    try { const cfg = loadConfig(); return { success: true, config: cfg }; } catch (e) { return { success: false, error: e.message }; }
  });

  // schedule auto-backup to run at configured frequency and time
  let scheduledTimer = null;

  function calculateNextRunTime(cfg) {
    const now = new Date();
    const target = new Date();
    const hour = Number(cfg.hour) || 22;
    target.setHours(hour, 0, 0, 0);

    // Determine interval based on frequency
    const frequency = cfg.frequency || 'daily'; // 'daily', 'weekly', 'monthly', 'quarterly', 'semi-annual', 'yearly'
    let intervalDays = 1;

    switch (frequency) {
      case 'daily':
        intervalDays = 1;
        break;
      case 'weekly':
        intervalDays = 7;
        break;
      case 'monthly':
        intervalDays = 30;
        break;
      case 'quarterly': // كل 3 شهور
        intervalDays = 90;
        break;
      case 'semi-annual': // كل 6 شهور
        intervalDays = 180;
        break;
      case 'yearly':
        intervalDays = 365;
        break;
      default:
        intervalDays = 1;
    }

    // Get last backup time from config
    const lastBackupTime = cfg.lastBackupTime ? new Date(cfg.lastBackupTime) : null;
    
    if (lastBackupTime) {
      target.setTime(lastBackupTime.getTime());
      target.setHours(hour, 0, 0, 0);
      target.setDate(target.getDate() + intervalDays);
    } else {
      if (target <= now) {
        target.setDate(target.getDate() + 1);
      }
    }

    return { target, intervalDays };
  }

  function scheduleAutoBackup() {
    try {
      const cfg = loadConfig();
      if (scheduledTimer) { clearTimeout(scheduledTimer); scheduledTimer = null; }
      if (!cfg.enabled) return;

      const { target, intervalDays } = calculateNextRunTime(cfg);
      const now = new Date();
      const delay = Math.max(1000, target.getTime() - now.getTime());

      console.log(`Next backup scheduled for: ${target.toISOString()} (in ${Math.round(delay / 1000 / 60)} minutes)`);

      scheduledTimer = setTimeout(() => {
        try {
          const ts = formatTimestamp(new Date());
          const dest = cfg.dest ? path.join(cfg.dest, `auto-backup-${ts}.zip`) : path.join(backupDir, `auto-backup-${ts}.zip`);
          
          // Ensure destination directory exists
          const destDir = path.dirname(dest);
          fs.mkdirSync(destDir, { recursive: true });

          const zip = new AdmZip();
          zip.addLocalFolder(userData, path.basename(userData));
          
          // Include snapshot if it exists
          const snapshotPath = path.join(userData, 'data-snapshot.json');
          if (fs.existsSync(snapshotPath)) {
            const snapshot = fs.readFileSync(snapshotPath, 'utf8');
            zip.addFile('data-snapshot.json', Buffer.from(snapshot, 'utf8'));
          }

          // Include manifest
          const manifest = {
            timestamp: new Date().toISOString(),
            version: '4.0.0',
            type: 'auto-scheduled',
            frequency: cfg.frequency || 'daily'
          };
          zip.addFile('BACKUP_MANIFEST.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));

          zip.writeZip(dest);
          
          // Update last backup time in config
          cfg.lastBackupTime = new Date().toISOString();
          saveConfig(cfg);

          console.log('Auto-backup created:', dest);
        } catch (e) {
          console.error('Auto-backup error:', e.message);
        }
        scheduleAutoBackup(); // Reschedule for next interval
      }, delay);
    } catch (e) {
      console.error('Schedule error:', e.message);
    }
  }

  // Handler to update backup settings
  ipcMain.handle('update-backup-schedule', (event, cfg) => {
    try {
      saveConfig(cfg);
      scheduleAutoBackup(); // Reschedule immediately with new settings
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });

  // start scheduler immediately
  try { scheduleAutoBackup(); } catch (e) {}
}

module.exports = { init, updateSchedule: (cfg) => {
  try {
    saveConfig(cfg);
    scheduleAutoBackup(); 
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
} };
