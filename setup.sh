#!/usr/bin/env bash
# setup.sh - macOS/Linux bootstrap for opencode setup
# Ensures Node.js (with npm) exists, then runs setup-opencode.mjs.
# Works both locally (cloned repo) and piped:
#   curl -fsSL https://raw.githubusercontent.com/seiz888/opencode-setup/main/setup.sh | bash

set -euo pipefail
RAW_BASE="https://raw.githubusercontent.com/seiz888/opencode-setup/main"

have() { command -v "$1" >/dev/null 2>&1; }

echo "=== opencode setup bootstrap (Unix) ==="

# resolve setup-opencode.mjs: local next to this script, else download to temp
SCRIPT_DIR=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]:-}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

if [ -n "$SCRIPT_DIR" ] && [ -f "$SCRIPT_DIR/setup-opencode.mjs" ]; then
  MJS="$SCRIPT_DIR/setup-opencode.mjs"
else
  MJS="$(mktemp -t setup-opencode.XXXXXX.mjs)"
  echo "downloading setup-opencode.mjs ..."
  if have curl; then curl -fsSL "$RAW_BASE/setup-opencode.mjs" -o "$MJS"
  elif have wget; then wget -qO "$MJS" "$RAW_BASE/setup-opencode.mjs"
  else echo "need curl or wget to download the installer" >&2; exit 1; fi
fi

install_node() {
  local os
  os="$(uname -s)"

  if [ "$os" = "Darwin" ]; then
    if have brew; then echo "installing node via brew..."; brew install node && return 0; fi
  else
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
  if ! have node && have fnm; then eval "$(fnm env)"; fi
fi

if ! have node; then
  echo "Could not install Node.js automatically. Install from https://nodejs.org and re-run." >&2
  exit 1
fi

# 2. run the cross-platform installer
# when this script is piped (curl | bash), stdin is the pipe, so attach the
# terminal for the installer's interactive prompts.
echo "running setup-opencode.mjs ..."
if [ -t 0 ]; then
  node "$MJS"
elif [ -e /dev/tty ]; then
  node "$MJS" < /dev/tty
else
  echo "no interactive terminal available; download the repo and run 'node setup-opencode.mjs' directly." >&2
  exit 1
fi
