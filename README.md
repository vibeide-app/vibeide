# VibeIDE

**The AI agent terminal orchestrator for vibe coders.**

Run Claude, Gemini, Aider, and 9 more AI agents side by side — in split panes, with voice input and git worktree isolation.

## Features

- **12 AI agents** — Claude Code, Gemini, Codex, Aider, OpenCode, Cline, Copilot, Amp, Continue, Cursor, Crush, Qwen
- **Multi-project management** — sidebar with project groups, status badges, instant switching
- **Git worktree isolation** — each agent works in its own branch, review and merge with one click
- **Smart status detection** — knows when agents need input, complete, or errored
- **Toast notifications** — configurable sound, toast, and desktop alerts per event type
- **Voice input** — push-to-talk dictation (F3) and voice commands (F4)
- **File viewer** — CodeMirror 6 with syntax highlighting, git diff, pop-out to separate window
- **Source control** — commit graph, changes list, stage/unstage/discard
- **Command palette** — fuzzy search, context-aware filtering, agent-specific commands
- **Launch Workspace** — guided setup: pick project, choose agents, select layout, launch
- **12 themes** — 9 dark + 3 light (Tokyo Night, Dracula, Nord, Solarized, GitHub, Catppuccin, etc.)
- **Session persistence** — layout, agents, and scrollback restored on relaunch

## Install

### Linux

Download from [Releases](https://github.com/nandadevaiah/vibeide/releases):

```bash
# Debian/Ubuntu
sudo dpkg -i vibeide_0.1.0_amd64.deb

# AppImage (any distro)
chmod +x VibeIDE-0.1.0-x86_64.AppImage
./VibeIDE-0.1.0-x86_64.AppImage
```

### macOS

Download the `.dmg` from [Releases](https://github.com/nandadevaiah/vibeide/releases), open it, and drag VibeIDE to Applications.

**Important:** VibeIDE is not yet code-signed. macOS will show "VibeIDE is damaged" on first open. Run this once to fix:

```bash
xattr -cr /Applications/VibeIDE.app
```

Then open VibeIDE normally.

### Windows

Download the `.exe` installer from [Releases](https://github.com/nandadevaiah/vibeide/releases) and run it.

## Quick Start

1. Open VibeIDE — the onboarding wizard detects installed agents
2. Add a project directory
3. Click **+** on a project to spawn an agent, or use **Launch Workspace** (sidebar play button) for multi-agent setup
4. Agents run in isolated git worktrees — review and merge changes when done

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+Shift+N` | New shell terminal |
| `Ctrl+Shift+D` | Split pane vertically |
| `Ctrl+P` | Quick open file |
| `Ctrl+Shift+E` | Open file viewer |
| `Ctrl+Shift+F2` | File viewer in new window |
| `Ctrl+Shift+G` | Git changes |
| `Ctrl+B` | Toggle sidebar |
| `F3` | Voice dictation (hold) |
| `F4` | Voice commands (hold) |

## Build from Source

```bash
git clone https://github.com/nandadevaiah/vibeide.git
cd vibeide
npm install
npm run dev        # development
npm run dist:linux # build .deb + .AppImage
npm run dist:mac   # build .dmg
npm run dist:win   # build .exe
```

## Tech Stack

- **Electron** + **electron-vite** + **TypeScript** (vanilla DOM, no React)
- **xterm.js 6** with WebGL addon for terminal rendering
- **node-pty** for PTY management
- **CodeMirror 6** for code viewing and editing
- **Web Audio API** for notification sounds
- **MediaRecorder** + Groq Whisper for voice-to-text

## License

[AGPL-3.0](LICENSE) — free for individual use. See [monetization strategy](docs/monetization-strategy.md) for details on the open-core model.
