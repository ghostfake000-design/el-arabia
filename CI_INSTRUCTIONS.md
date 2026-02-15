CI build and signing instructions

1) Create a clean branch and commit the changes:

```bash
git checkout -b ci/build-windows
git add .
git commit -m "ci: add windows build workflow and ci prune scripts; use better-sqlite3 worker"
git push origin ci/build-windows
```

2) Open a Pull Request to `main` and merge, or push directly to `main` if permitted.

3) Configure repository secrets in GitHub (Repository Settings → Secrets):
- `CSC_LINK` - a URL to your code signing certificate (PFX) or base64-encoded PFX
- `CSC_KEY_PASSWORD` - password for the PFX

4) Manually trigger the workflow from Actions → Build Windows EXE, or push to `main`.

Notes:
- The workflow runs on `windows-latest`, installs dependencies with `npm ci`, runs `electron-rebuild` for `better-sqlite3`, builds the renderer and then runs `electron-builder`.
- The `scripts/ci-prune.ps1` script removes known large artifacts to keep the prepared repository small for CI.
- If you want me to push the branch for you, I can run the git commands locally (requires your credentials configured on this machine).
