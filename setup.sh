#!/usr/bin/env bash
# setup.sh - macOS/Linux bootstrap for opencode setup
# Ensures Node.js (with npm) exists, then runs setup-opencode.mjs.
# Usage:  bash setup.sh   (or: chmod +x setup.sh && ./setup.sh)

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MJS="$SCRIPT_DIR/setup-opencode.mjs"

have() { command -v "$1" >/dev/null 2>&1; }

echo "=== opencode setup bootstrap (Unix) ==="

if [ ! -f "$MJS" ]; then
  echo "setup-opencode.mjs not found next to setup.sh ($MJS)" >&2
  exit 1
fi

install_node() {
  local os
  os="$(uname -s)"

  if [ "$os" = "Darwin" ]; then
    if have brew; then echo "installing node via brew..."; brew install node && return 0; fi
  else
    # Linux: try common package managers (need sudo)
    if have apt-get; then
      echo "installing node via apt..."
      sudo apt-get update && sudo apt-get install -y nodejs npm && return 0
    elif have dnf; then
      echo "installing node via dnf..."; sudo dnf install -y nodejs && return 0
    elif have pacman; then
      echo "installing node via pacman..."; sudo pacman -S --noconfirm nodejs npm && return 0
    elif have zypper; then
      echo "installing node via zypper..."; sudo zypper install -y nodejs && return 0
    elif have apk; then
      echo "installing node via apk..."; sudo apk add --no-cache nodejs npm && return 0
    fi
  fi

  # fallback: fnm (no sudo, user-local)
  echo "package manager path failed; trying fnm..."
  if ! have fnm; then
    curl -fsSL https://fnm.vercel.app/install | bash || return 1
    export PATH="$HOME/.local/share/fnm:$HOME/.fnm:$PATH"
    if have fnm; then eval "$(fnm env)"; fi
  fi
  if have fnm; then
    fnm install --lts && fnm use --lts && eval "$(fnm env)" && return 0
  fi
  return 1
}

# 1. ensure node
if have node; then
  echo "node found: $(node --version)"
else
  echo "node not found, installing..."
  install_node || true
  # try to pick up fnm-managed node in this shell
  if ! have node && have fnm; then eval "$(fnm env)"; fi
fi

if ! have node; then
  echo "Could not install Node.js automatically. Install from https://nodejs.org and re-run." >&2
  exit 1
fi

# 2. run the cross-platform installer
echo "running setup-opencode.mjs ..."
node "$MJS"
