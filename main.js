// Copied main.js from project root

const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const { dialog } = require('electron');
const path = require('path');
const LicenseManager = require('../license-manager');
let Store;
try { Store = require('electron-store'); } catch (e) { Store = null; }
const settingsStore = Store ? new Store() : null;

// Minimal main.js adapted for packaged app-root layout (adjust paths as needed)
const tryRequire = (relPath) => {
  try { return require(relPath); } catch (e) { return null; }
};

let mainWindow = null;
const lm = new LicenseManager();

function createWindow() {
  if (mainWindow) return;
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });
  const indexPath = path.join(__dirname, 'index.html');
  mainWindow.loadFile(indexPath).catch(() => {});
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
