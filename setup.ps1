# setup.ps1 - Windows bootstrap for opencode setup
# Ensures Node.js (with npm) exists, then runs setup-opencode.mjs.
# Usage:  powershell -ExecutionPolicy Bypass -File setup.ps1

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$mjs = Join-Path $scriptDir "setup-opencode.mjs"

function Have($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}

Write-Host "=== opencode setup bootstrap (Windows) ==="

if (-not (Test-Path $mjs)) {
  Write-Error "setup-opencode.mjs not found next to setup.ps1 ($mjs)"
  exit 1
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
    if (-not (Have "fnm")) {
      if (Have "winget") { winget install --id Schniz.fnm -e --accept-source-agreements --accept-package-agreements; Refresh-Path }
    }
    if (Have "fnm") {
      fnm install --lts
      fnm use --lts
      $env:Path = "$(fnm env --json | ConvertFrom-Json | Select-Object -ExpandProperty PATH);$env:Path" 2>$null
    }
  }
  Refresh-Path
}

if (-not (Have "node")) {
  Write-Error "Could not install Node.js automatically. Install it from https://nodejs.org and re-run."
  exit 1
}

# 2. run the cross-platform installer
Write-Host "running setup-opencode.mjs ..."
node $mjs
exit $LASTEXITCODE
