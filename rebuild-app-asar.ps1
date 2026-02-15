# rebuild-app-asar.ps1
$installedAsar = 'C:\Users\Silem\AppData\Local\Programs\al-arabia-inventory-pro\resources\app.asar'
$backupAsar = $installedAsar + '.bak'
if(-not (Test-Path $installedAsar)){
  Write-Error "installed app.asar not found at $installedAsar"
  exit 1
}
Write-Output "Backing up app.asar -> $backupAsar"
Copy-Item -LiteralPath $installedAsar -Destination $backupAsar -Force

$tmp = Join-Path $env:TEMP 'app_asar_work'
Write-Output "Preparing temp folder $tmp"
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
New-Item $tmp -ItemType Directory | Out-Null
$appDir = Join-Path $tmp 'app'

Write-Output "Extracting app.asar (needs npx/asar; this will auto-install if missing)"
npx --yes asar extract $installedAsar $appDir
if(-not (Test-Path $appDir)){
  Write-Error "Extraction failed"
  exit 2
}

Write-Output "Replacing main.js with patched version from your project"
$patched = 'C:\Users\Silem\Downloads\al-arabia-inventory-v1.1 (1)\main.js'
if(-not (Test-Path $patched)){
  Write-Error "Patched main.js not found at $patched"
  exit 3
}
Copy-Item -LiteralPath $patched -Destination (Join-Path $appDir 'main.js') -Force

Write-Output "Packing new app.asar"
$nnew = Join-Path $tmp 'app.asar.new'
npx --yes asar pack $appDir $nnew
if(-not (Test-Path $nnew)){
  Write-Error "Packing failed"
  exit 4
}

Write-Output "Replacing installed app.asar (may fail if file locked)"
Try {
  Move-Item -LiteralPath $nnew -Destination $installedAsar -Force -ErrorAction Stop
  Write-Output "Replaced app.asar successfully"
} Catch {
  Write-Error "Failed to replace app.asar: $($_.Exception.Message)"
  Write-Output "If file is locked, close the app or run this script as Administrator."
  exit 5
}

Write-Output "Cleaning temp"
Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
Write-Output "DONE - please start the app and check for errors"