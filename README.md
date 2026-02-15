<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1s9y23am-NckDGdwonNdT5RbDt2lfCNlc

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Build Windows EXE (installer)

1. Place the program icon you attached into `assets/icon-source.png` (use the provided PNG).
2. (Optional) If you have an existing prepopulated database you want shipped with the installer, place it at `data/template.db`.
3. Create an `.ico` for the installer:

```bash
npm install
npm run make-icon
```

4. Build the Windows installer (NSIS):

```bash
npm run build:win
```

Notes:
- On first run the app will copy `data/template.db` (if present in the installer resources) into the per-user writable folder returned by `app.getPath('userData')` as `db.sqlite`. This makes all runtime data writable and available offline.
- All resources (assets and `data/`) are bundled into the installer via `extraResources` so the app can operate fully offline after installation.

## Direct Zebra ZPL Printing (optional)

The app now supports sending raw ZPL directly to networked Zebra printers (recommended for exact label control):

- In `تكويد وإدارة الأصناف`, click the small `Z` button next to the Print icon and enter the printer IP (e.g. `192.168.1.50`). The app will send a simple ZPL label to port `9100`.
- For USB-connected printers you can either share the printer on the network or use a native print driver module. The main process has a fallback to the optional `printer` native module if installed.

If you need, I can add a settings page to store printer IPs and templates for different label sizes.
