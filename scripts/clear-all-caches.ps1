<#
Comprehensive cleanup script for development/build caches and legacy app user-data.
Run as the project user. Close running instances of the app before running.
This script will:
 - Stop common app/electron processes (best-effort)
 - Remove legacy AppData folders
 - Remove project build artifacts: node_modules, dist, dist-electron, .vite
 - Clean npm cache (requires npm in PATH)
 - Print diagnostics useful for ConPTY/terminal issues
#>

Write-Output "Starting comprehensive cleanup: $(Get-Date -Format s)"

# 1) Stop likely running processes (best-effort)
$procPatterns = @('العربية*','al-arabia*','electron','node')
foreach ($p in $procPatterns) {
  try {
    $ps = Get-Process | Where-Object { $_.ProcessName -like $p } -ErrorAction SilentlyContinue
    foreach ($proc in $ps) {
      Write-Output "Stopping process: $($proc.ProcessName) PID:$($proc.Id)"
      Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
    }
  } catch { }
}

# 2) Remove legacy app data (reuses clear-userdata behavior)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$clearUserScript = Join-Path $scriptDir 'clear-userdata.ps1'
if (Test-Path $clearUserScript) { Write-Output 'Running clear-userdata.ps1...'; & $clearUserScript }

# 3) Remove project build artifacts (in repository root)
$repoRoot = (Get-Location).Path
$pathsToRemove = @('node_modules', '.vite', 'dist', 'dist-electron', 'build', 'out', 'dist-electron-unpacked')
foreach ($p in $pathsToRemove) {
  $full = Join-Path $repoRoot $p
  if (Test-Path $full) { Write-Output "Removing $full"; Remove-Item -Recurse -Force -Path $full -ErrorAction SilentlyContinue }
}

# 4) Remove temporary ZPL cleanup folders
Get-ChildItem -Path $env:TEMP -Filter 'al-arabia-zpl-*' -ErrorAction SilentlyContinue | ForEach-Object { Write-Output "Removing temp: $($_.FullName)"; Remove-Item -Recurse -Force -Path $_.FullName -ErrorAction SilentlyContinue }

# 5) Clean npm cache (if npm present)
try {
  $npm = Get-Command npm -ErrorAction SilentlyContinue
  if ($npm) {
    Write-Output 'Running npm cache clean --force'
    npm cache clean --force
  } else { Write-Output 'npm not found in PATH; skipping npm cache clean.' }
} catch { Write-Output 'npm cache clean failed or npm not installed.' }

# 6) Diagnostics for terminal/ConPTY issues
Write-Output "\n--- System diagnostics (for ConPTY) ---"
try {
  $ci = Get-ComputerInfo -Property OsName, OsVersion, OsBuildNumber -ErrorAction SilentlyContinue
  if ($ci) {
    Write-Output "OS: $($ci.OsName)"
    Write-Output "Version: $($ci.OsVersion) (Build: $($ci.OsBuildNumber))"
  } else {
    Write-Output "Get-ComputerInfo not available; trying environment version checks..."
    Write-Output ([Environment]::OSVersion.Version.ToString())
  }
} catch { Write-Output "Failed to collect ComputerInfo: $($_.Exception.Message)" }

# Check PowerShell version and availability of ConPTY support
try {
  $psv = $PSVersionTable.PSVersion
  Write-Output "PowerShell version: $psv"
} catch { }

# 7) Advise next steps
Write-Output "\nCleanup finished. If the terminal 'ConPTY' error persists when running builds from the IDE, try:\n - Restart Windows (clears stuck console hosts)\n - Update Windows to a newer build (ConPTY requires newer Windows 10+ builds)\n - In VS Code: set terminal.integrated.inheritEnv to false or change terminal to 'External Console'\n - Run the build from an elevated PowerShell window outside the IDE:\n     npm install\n     npm run build:win\n"

Write-Output "Completed at: $(Get-Date -Format s)"
