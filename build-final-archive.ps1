<#
.SYNOPSIS
  Builds the final delivery archive containing the EXE and documentation.

.DESCRIPTION
  - Optionally injects a license code into `license.html` (creates backup).
  - Locates the latest .exe under common build folders.
  - Collects agreed documentation files and extras into a temporary folder.
  - Creates a timestamped ZIP archive.

.PARAMETER LicenseCode
  Optional activation code to insert into `license.html` before packaging.

.PARAMETER OutputZip
  Optional explicit output zip path. If omitted a timestamped zip is created in the cwd.

.EXAMPLE
  .\build-final-archive.ps1 -LicenseCode "ABCDEFG..." 

#>

param(
    [string]$LicenseCode = "",
    [string]$OutputZip = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Push-Location $root

try {
    $time = Get-Date -Format "yyyyMMdd-HHmmss"

    # Optional: inject license into license.html
    if ($LicenseCode -ne "") {
        $licenseFile = Join-Path $root 'license.html'
        if (Test-Path $licenseFile) {
            $bak = "$licenseFile.bak.$time"
            Copy-Item -Path $licenseFile -Destination $bak -Force

            $content = Get-Content -Raw -Path $licenseFile -ErrorAction Stop

            # Replace value="..." for input id="licenseKey" or add value if missing
            $pattern = '(<input[^>]*id=["\']licenseKey["\'][^>]*)(>)'
            if ($content -match $pattern) {
                # try replace existing value attr if present
                $content = [regex]::Replace($content, '(id=["\']licenseKey["\'][^>]*?)value=["\'][^"\']*["\']', "$1")
                $replacement = "`$1 value=\"$LicenseCode\"`$2"
                $content = [regex]::Replace($content, $pattern, $replacement)
            } else {
                Write-Warning "license.html found but no input with id=licenseKey detected. Skipping injection."
            }

            Set-Content -Path $licenseFile -Value $content -Force -Encoding UTF8
            Write-Host "Injected license into license.html and backed up to:`n  $bak"
        } else {
            Write-Warning "license.html not found in project root; skipping injection."
        }
    }

    # Find candidate EXE (search common output folders)
    $searchRoots = @('dist-electron','release','dist','build','out','release-builds')
    $exeCandidates = @()
    foreach ($r in $searchRoots) {
        $full = Join-Path $root $r
        if (Test-Path $full) {
            $exeCandidates += Get-ChildItem -Path $full -Recurse -Include *.exe -File -ErrorAction SilentlyContinue
        }
    }

    if ($exeCandidates.Count -eq 0) {
        # also try root
        $exeCandidates = Get-ChildItem -Path $root -Recurse -Include *.exe -File -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch '\\node_modules\\' }
    }

    if ($exeCandidates.Count -eq 0) {
        throw "No .exe found under common build folders. Build the installer first and re-run this script."
    }

    # pick most recent EXE
    $exe = $exeCandidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    Write-Host "Selected EXE:`n  $($exe.FullName)"

    # Prepare temp folder
    $tempDir = Join-Path $root "release-package-temp-$time"
    New-Item -Path $tempDir -ItemType Directory -Force | Out-Null

    # Files to include (agreed set)
    $docs = @(
        'README_v4.0.1.md',
        'UPDATES_v4.0.1.md',
        'QUICK_FIX_GUIDE.md',
        'COMPLETION_REPORT.md',
        'USER_GUIDE.md',
        'LICENSING_GUIDE.md',
        'PASSWORDS_AND_SECURITY.md',
        'DEVELOPER_GUIDE.md',
        'build-quick.bat',
        'build-final.ps1',
        'ACTIVATION_INSTRUCTIONS.txt',
        'ZPL_PRINTING_INSTRUCTIONS.txt'
    )

    # copy exe and sibling files if needed
    $exeDest = Join-Path $tempDir $exe.Name
    Copy-Item -Path $exe.FullName -Destination $exeDest -Force

    # copy related .blockmap or installer files in same folder
    $siblingFiles = Get-ChildItem -Path $exe.DirectoryName -Filter "*.*" -File | Where-Object { $_.Extension -in '.blockmap','.msi','.nupkg' }
    foreach ($f in $siblingFiles) { Copy-Item -Path $f.FullName -Destination $tempDir -Force }

    # copy docs
    foreach ($d in $docs) {
        $src = Join-Path $root $d
        if (Test-Path $src) {
            Copy-Item -Path $src -Destination $tempDir -Force
        } else {
            Write-Warning "Missing file: $d (skipped)"
        }
    }

    # always include license.html and PASSWORDS_AND_SECURITY (if present)
    $extras = @('license.html','license-manager.js')
    foreach ($e in $extras) {
        $src = Join-Path $root $e
        if (Test-Path $src) { Copy-Item -Path $src -Destination $tempDir -Force }
    }

    # produce output zip
    if ($OutputZip -eq "") { $OutputZip = Join-Path $root "al-arabia-delivery-$time.zip" }
    if (Test-Path $OutputZip) { Remove-Item -Path $OutputZip -Force }

    Compress-Archive -Path (Join-Path $tempDir '*') -DestinationPath $OutputZip -Force
    Write-Host "Created archive:`n  $OutputZip"

    # cleanup temp
    Remove-Item -Path $tempDir -Recurse -Force

    Write-Host "Release package build complete."
    exit 0
}
catch {
    Write-Error "ERROR: $($_.Exception.Message)"
    exit 1
}
finally {
    Pop-Location
}
