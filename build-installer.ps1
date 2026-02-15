# build-installer.ps1
$projectPath = 'C:\Users\Silem\Downloads\al-arabia-inventory-v1.1 (1)'
Set-Location $projectPath

Write-Output "Step 1: Installing npm dependencies..."
npm install
if($LASTEXITCODE -ne 0){
  Write-Error "npm install failed"
  exit 1
}

Write-Output "Step 2: Building with Vite and Electron Builder..."
npm run build:win
if($LASTEXITCODE -ne 0){
  Write-Error "npm run build:win failed"
  exit 2
}

Write-Output "DONE - Check dist-electron folder for the EXE installer"
$exeFile = Get-ChildItem "$projectPath\dist-electron" -Filter "*.exe" | Select-Object -First 1
if($exeFile){
  Write-Output "Installer created: $($exeFile.FullName)"
}