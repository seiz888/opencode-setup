# setup.ps1 - Windows bootstrap for opencode setup
# Ensures Node.js (with npm) exists, then runs setup-opencode.mjs.
# Works both locally (cloned repo) and piped:
#   irm https://raw.githubusercontent.com/seiz888/opencode-setup/main/setup.ps1 | iex

$ErrorActionPreference = "Stop"
$RawBase = "https://raw.githubusercontent.com/seiz888/opencode-setup/main"

function Have($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}

Write-Host "=== opencode setup bootstrap (Windows) ==="

# resolve setup-opencode.mjs: local next to this script, else download to temp
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot }
             elseif ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path }
             else { $null }
$localMjs = if ($scriptDir) { Join-Path $scriptDir "setup-opencode.mjs" } else { $null }

if ($localMjs -and (Test-Path $localMjs)) {
  $mjs = $localMjs
} else {
  $mjs = Join-Path ([System.IO.Path]::GetTempPath()) "setup-opencode.mjs"
  Write-Host "downloading setup-opencode.mjs ..."
  Invoke-WebRequest -UseBasicParsing "$RawBase/setup-opencode.mjs" -OutFile $mjs
}

# 1. ensure node
if (Have "node") {
  Write-Host "node found: $(node --version)"
} else {
  Write-Host "node not found, installing..."
  if (Have "winget") {
    winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
    Refresh-Path
  }
  if (-not (Have "node")) {
    Write-Host "winget unavailable or failed; trying fnm..."
    if (-not (Have "fnm") -and (Have "winget")) {
      winget install --id Schniz.fnm -e --accept-source-agreements --accept-package-agreements
      Refresh-Path
    }
    if (Have "fnm") {
      fnm install --lts
      fnm use --lts
    }
  }
  Refresh-Path
}

if (-not (Have "node")) {
  Write-Error "Could not install Node.js automatically. Install it from https://nodejs.org and re-run."
  return
}

# 2. run the cross-platform installer
Write-Host "running setup-opencode.mjs ..."
node $mjs
