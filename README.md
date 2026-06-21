# opencode-seiz-setup

Cross-platform installer for [opencode](https://opencode.ai) preconfigured with the
[oh-my-opencode-slim](https://github.com/alvinunreal/oh-my-opencode-slim) multi-agent plugin,
the SeizAI provider, MCP servers, the Zellij multiplexer, and bundled skills.

One command takes a clean machine (Windows, macOS, or Linux) to a working opencode setup.

## What it installs

- **opencode** (global, via npm or bun)
- **Zellij** multiplexer (winget / brew / cargo / distro package manager)
- **oh-my-opencode-slim** plugin with a per-agent model preset
- **SeizAI** provider with the full model catalog
- **MCP servers**: context7, grep_app, github, time, and optionally exa, pinchtab, obsidian-webdav
- **Skills**: `multi-brain` and `ocs`, written to `~/.config/opencode/skills/`

## Usage

No clone required. Run the one-liner for your OS.

### Windows (PowerShell)

```powershell
irm https://raw.githubusercontent.com/seiz888/opencode-setup/main/setup.ps1 | iex
```

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/seiz888/opencode-setup/main/setup.sh | bash
```

The launcher ensures Node.js is present (installing it if needed), downloads
`setup-opencode.mjs`, then runs it to prompt for credentials and write the config.

### From a clone

If you prefer to inspect first, clone and run locally:

```bash
git clone https://github.com/seiz888/opencode-setup.git
cd opencode-setup
node setup-opencode.mjs        # if Node.js is already installed
# or use the bootstrap launcher: bash setup.sh  /  powershell -ExecutionPolicy Bypass -File setup.ps1
```

## Prompts

The installer asks for:

| Prompt | Required | Notes |
| --- | --- | --- |
| SeizAI API key | yes | provider auth |
| Exa MCP api-key | no | leave blank to skip |
| PinchTab MCP token | no | leave blank to skip |
| WebDAV URL / user / password | no | for the `obsidian-webdav` MCP + `multi-brain` skill |

No secrets are hardcoded; everything is entered at runtime and written only to your
local `~/.config/opencode/` files.

## Idempotent behavior

- If opencode is already installed, it asks before upgrading.
- If a config file already exists, it asks before overwriting (a timestamped `.bak` is kept).

## After install

Open a fresh terminal, then start opencode inside Zellij with a port (required for the
multiplexer integration):

```bash
zellij
# inside zellij:
OPENCODE_PORT=4096 opencode --port 4096
```

Then run `opencode models --refresh` and `ping all agents` to verify.

## Files

| File | Purpose |
| --- | --- |
| `setup.ps1` | Windows bootstrap (installs Node, runs the installer) |
| `setup.sh` | macOS/Linux bootstrap (installs Node, runs the installer) |
| `setup-opencode.mjs` | Cross-platform core installer |

## License

MIT
