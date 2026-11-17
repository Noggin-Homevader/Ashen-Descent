<# : Ashen Descent installer (double-click me). Batch part: hand the rest of this file to PowerShell.
@echo off
title Ashen Descent installer
set "ASHEN_SELF=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-Expression ([IO.File]::ReadAllText($env:ASHEN_SELF))"
set ERR=%ERRORLEVEL%
if not "%ASHEN_NO_PAUSE%"=="1" pause
exit /b %ERR%
: end of the batch part #>

# ---------------------------------------------------------------------------------------------------------------
# Installs the Ashen Descent launcher without the setup .exe: downloads the launcher zip from the latest GitHub
# release, unpacks it into %LOCALAPPDATA%\Programs\Ashen Descent (no admin rights needed, nothing written to %TEMP%),
# adds desktop and Start menu shortcuts and opens the launcher, which then downloads the game.
# Running it again updates the launcher. Saves are not touched (they live in %APPDATA%\Ashen Descent).
# ---------------------------------------------------------------------------------------------------------------
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12 } catch {}

$Repo    = 'Noggin-Homevader/Ashen-Descent'
$ZipUrl  = "https://github.com/$Repo/releases/latest/download/AshenDescent-win-x64.zip"
$ExeName = 'Ashen Descent.exe'
$SysDrive = ($env:SystemDrive, 'C:' | Where-Object { $_ } | Select-Object -First 1).ToUpper()
$DefaultData = Join-Path $env:APPDATA 'Ashen Descent'
$LocationFile = Join-Path $DefaultData 'location.json'

function Say($m, $c = 'Gray') { Write-Host $m -ForegroundColor $c }

try {
  Say ''
  Say '  ASHEN DESCENT' 'DarkYellow'
  Say '  Installing the launcher...' 'DarkYellow'
  Say ''

  # 1. Which drive? (ASHEN_DRIVE=D: skips the question)
  $drives = @([IO.DriveInfo]::GetDrives() | Where-Object { $_.IsReady -and $_.DriveType -eq 'Fixed' })
  $pickDrive = $null
  if ($env:ASHEN_DRIVE) {
    $pickDrive = ($env:ASHEN_DRIVE.TrimEnd('\').TrimEnd(':') + ':').ToUpper()
  } elseif ($drives.Count -le 1) {
    $pickDrive = $SysDrive
  } else {
    Say '  Where should Ashen Descent be installed? (the launcher, the game and your saves)' 'White'
    Say ''
    $defIndex = 1
    for ($i = 0; $i -lt $drives.Count; $i++) {
      $d = $drives[$i]; $letter = $d.Name.TrimEnd('\').ToUpper()
      $label = if ($d.VolumeLabel) { $d.VolumeLabel } else { 'Local Disk' }
      $tag = if ($letter -eq $SysDrive) { '  (Windows)' } else { '' }
      if ($letter -eq $SysDrive) { $defIndex = $i + 1 }
      Say ('    [{0}]  {1}  {2,-14} {3,8:N1} GB free{4}' -f ($i + 1), $letter, $label, ($d.AvailableFreeSpace / 1GB), $tag)
    }
    # Suggest a roomier drive when the Windows drive is nearly full.
    if ($drives[$defIndex - 1].AvailableFreeSpace -lt 2GB) {
      $best = 0; for ($i = 1; $i -lt $drives.Count; $i++) { if ($drives[$i].AvailableFreeSpace -gt $drives[$best].AvailableFreeSpace) { $best = $i } }
      $defIndex = $best + 1
    }
    Say ''
    while (-not $pickDrive) {
      $ans = Read-Host ("  Type a number and press Enter [{0}]" -f $defIndex)
      if (-not $ans) { $ans = "$defIndex" }
      $n = 0
      if ([int]::TryParse($ans.Trim(), [ref]$n) -and $n -ge 1 -and $n -le $drives.Count) { $pickDrive = $drives[$n - 1].Name.TrimEnd('\').ToUpper() }
      elseif ($ans.Trim() -match '^[A-Za-z]:?$') { $l = ($ans.Trim().TrimEnd(':') + ':').ToUpper(); if ($drives | Where-Object { $_.Name.TrimEnd('\').ToUpper() -eq $l }) { $pickDrive = $l } }
      if (-not $pickDrive) { Say '  Please type one of the numbers above.' 'Yellow' }
    }
  }
  if ($pickDrive -eq $SysDrive) {
    $Dest = Join-Path $env:LOCALAPPDATA 'Programs\Ashen Descent'
    $Work = Join-Path $env:LOCALAPPDATA 'Ashen Descent Setup'
    $DataDir = $DefaultData
  } else {
    $Dest = "$pickDrive\Ashen Descent\Launcher"
    $Work = "$pickDrive\Ashen Descent\Setup"
    $DataDir = "$pickDrive\Ashen Descent"
  }
  Say ''
  Say "  Installing to $Dest"

  # 2. Enough room? (launcher ~300 MB unpacked, the download, and the game itself)
  $root = [IO.Path]::GetPathRoot($Dest)
  $free = (New-Object IO.DriveInfo $root).AvailableFreeSpace
  if ($free -lt 900MB) {
    throw ("Not enough free disk space on {0} ({1:N0} MB free; about 900 MB is needed). Free some space or choose another drive." -f $root, ($free / 1MB))
  }

  # 3. Close a running launcher so its files can be replaced.
  Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($Dest, [StringComparison]::OrdinalIgnoreCase) } | ForEach-Object {
    Say '  Closing the running launcher...'
    $_ | Stop-Process -Force
    Start-Sleep -Seconds 1
  }

  # 4. Download (or use a local zip, for testing).
  New-Item -ItemType Directory -Force -Path $Work | Out-Null
  $zip = Join-Path $Work 'AshenDescent-win-x64.zip'
  if ($env:ASHEN_LOCAL_ZIP) {
    Copy-Item -LiteralPath $env:ASHEN_LOCAL_ZIP -Destination $zip -Force
  } else {
    Say '  Downloading the launcher (about 120 MB)...'
    Invoke-WebRequest -UseBasicParsing -Uri $ZipUrl -OutFile $zip
  }
  if ((Get-Item $zip).Length -lt 10MB) { throw 'The download is incomplete. Check your internet connection and run this again.' }

  # 5. Unpack next to the install folder, then swap it in.
  Say '  Unpacking...'
  $new = Join-Path $Work 'unpacked'
  if (Test-Path $new) { Remove-Item -LiteralPath $new -Recurse -Force }
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [IO.Compression.ZipFile]::ExtractToDirectory($zip, $new)
  $exe = Get-ChildItem -LiteralPath $new -Recurse -Filter $ExeName | Select-Object -First 1
  if (-not $exe) { throw "The download does not contain $ExeName." }
  $appDir = $exe.Directory.FullName

  if (Test-Path $Dest) {
    # Only ever replace a folder that holds our own launcher.
    if (-not (Test-Path (Join-Path $Dest $ExeName))) { throw "$Dest exists but does not contain the Ashen Descent launcher, so it was left alone. Move it and run this again." }
    Remove-Item -LiteralPath $Dest -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $Dest) | Out-Null
  Move-Item -LiteralPath $appDir -Destination $Dest
  Get-ChildItem -LiteralPath $Dest -Recurse -File | Unblock-File -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $Work -Recurse -Force -ErrorAction SilentlyContinue

  # 6. Shortcuts.
  $target = Join-Path $Dest $ExeName
  $shell = New-Object -ComObject WScript.Shell
  foreach ($dir in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {
    if (-not $dir) { continue }
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
    $lnk = $shell.CreateShortcut((Join-Path $dir 'Ashen Descent.lnk'))
    $lnk.TargetPath = $target
    $lnk.WorkingDirectory = $Dest
    $lnk.IconLocation = "$target,0"
    $lnk.Description = 'Ashen Descent'
    $lnk.Save()
  }

  # 7. Tell the launcher where the game and saves go (only if no game is installed yet; an existing install
  #    can be moved with "Change" in the launcher, which also moves the saves).
  $curData = $DefaultData
  if (Test-Path $LocationFile) { try { $j = Get-Content -Raw -LiteralPath $LocationFile | ConvertFrom-Json; if ($j.dataDir) { $curData = $j.dataDir } } catch {} }
  if ((Test-Path (Join-Path $curData 'game\current.json')) -and ($curData.TrimEnd('\') -ne $DataDir.TrimEnd('\'))) {
    Say "  Your game is already installed in $curData; to move it, use Change in the launcher." 'Yellow'
  } else {
    New-Item -ItemType Directory -Force -Path $DefaultData | Out-Null
    $json = @{ dataDir = $DataDir; chosenAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json
    [IO.File]::WriteAllText($LocationFile, $json)   # UTF-8 without BOM
  }

  Say ''
  Say "  Installed to $Dest" 'Green'
  Say "  Game files and saves: $DataDir" 'Green'
  Say '  Shortcuts added to your desktop and Start menu.' 'Green'
  if ($env:ASHEN_NO_LAUNCH -ne '1') {
    Say '  Opening the launcher; it will download the game.' 'Green'
    Start-Process -FilePath $target -WorkingDirectory $Dest
  }
  exit 0
} catch {
  Say ''
  Say '  Installation failed:' 'Red'
  Say ("  " + $_.Exception.Message) 'Red'
  Say ''
  Say '  If your antivirus blocked a file, allow "Ashen Descent" in its settings and run this again.' 'Yellow'
  exit 1
}
