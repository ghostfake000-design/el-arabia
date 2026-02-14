// Lightweight renderer helper for calling Electron IPC safely.
// Usage (in renderer):
// const { dbRun, dbAll, createBackup, listBackups, print } = window.electronAPI || require('../electron-api');

const isRenderer = typeof window !== 'undefined' && window.process && window.process.type === 'renderer';

function makeApi(ipcRenderer) {
  return {
    dbRun: (sql, params) => ipcRenderer.invoke('db-run', sql, params),
    dbGet: (sql, params) => ipcRenderer.invoke('db-get', sql, params),
    dbAll: (sql, params) => ipcRenderer.invoke('db-all', sql, params),
    dbFilePath: () => ipcRenderer.invoke('db-file-path'),
    createBackup: (dest) => ipcRenderer.invoke('create-backup', dest),
    listBackups: () => ipcRenderer.invoke('list-backups'),
    restoreBackup: (zipPath) => ipcRenderer.invoke('restore-backup', zipPath),
    print: (options) => ipcRenderer.invoke('print', options),
    printZpl: (payload) => ipcRenderer.invoke('print-zpl', payload),
    askPrinterIp: () => ipcRenderer.invoke('ask-printer-ip'),
    getSetting: (key) => ipcRenderer.invoke('settings-get', key),
    setSetting: (key, value) => ipcRenderer.invoke('settings-set', key, value),
    openPath: (p) => ipcRenderer.invoke('open-path', p)
  };
}

// If running inside Electron renderer with nodeIntegration, expose API via module.exports
try {
  if (isRenderer && window.require) {
    const { ipcRenderer } = window.require('electron');
    module.exports = makeApi(ipcRenderer);
  } else if (typeof require !== 'undefined') {
    // allow requiring from main process or bundler during SSR/build-time
    try {
      const electron = require('electron');
      if (electron && electron.ipcRenderer) {
        module.exports = makeApi(electron.ipcRenderer);
      }
    } catch (e) {
      module.exports = {};
    }
  } else {
    module.exports = {};
  }
} catch (e) {
  module.exports = {};
}
