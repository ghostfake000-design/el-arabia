# Clear app user-data for Al-Arabia Inventory Pro
# Run this script from PowerShell as the current user. For best results, close the app before running.

function Remove-IfExists($p) {
  if (Test-Path $p) { Write-Output "Removing: $p"; Remove-Item -Recurse -Force -Path $p -ErrorAction SilentlyContinue } else { Write-Output "Not found: $p" }
}

$legacyNames = @(
  'al-arabia-inventory-pro',
  'العربية للمخازن Pro',
  'com.elnoamany.al-arabia.inventory',
  'elnoamany_',
  'العربية-للمخازن-Pro'
)

$appData = $env:APPDATA
$localAppData = $env:LOCALAPPDATA

Write-Output "Clearing legacy application data folders..."
foreach ($n in $legacyNames) {
  Remove-IfExists (Join-Path $appData $n)
  Remove-IfExists (Join-Path $localAppData $n)
}

# Also remove known cache folders inside current app data if present
$current = Join-Path $appData 'al-arabia-inventory-pro'
if (Test-Path $current) {
  $caches = @('Cache','GPUCache','cache','Local Storage','Code Cache')
  foreach ($cf in $caches) { Remove-IfExists (Join-Path $current $cf) }
}

Write-Output "Done. You may also run the 'clear-all-caches.ps1' script to remove build artifacts and npm caches."
