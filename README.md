# VibeIDE

**The AI agent terminal orchestrator for vibe coders.**

Run Claude, Gemini, Aider, and 9 more AI agents side by side — in split panes, with voice input and git worktree isolation.

## Features

- **12 AI agents** — Claude Code, Gemini, Codex, Aider, OpenCode, Cline, Copilot, Amp, Continue, Cursor, Crush, Qwen
- **AI Skills integration** — install pre-packaged coding standards, TDD workflows, security patterns, and agent definitions during onboarding
- **Multi-project management** — sidebar with project groups, status badges, instant switching
- **Git worktree isolation** — each agent works in its own branch, review and merge with one click
- **Smart status detection** — knows when agents need input, complete, or errored
- **Toast notifications** — configurable sound, toast, and desktop alerts per event type
- **Voice input** — push-to-talk dictation (F3) and voice commands (F4)
- **File viewer** — CodeMirror 6 with syntax highlighting, git diff, pop-out to separate window
- **Source control** — commit graph, changes list, stage/unstage/discard
- **Command palette** — fuzzy search, context-aware filtering, agent-specific commands
- **Launch Workspace** — guided setup: pick project, choose agents, select layout, launch
- **Copy-paste** — smart Ctrl+C (copies if selected, SIGINT if not), right-click context menu
- **12 themes** — 9 dark + 3 light (Tokyo Night, Dracula, Nord, Solarized, GitHub, Catppuccin, etc.)
- **Session persistence** — layout, agents, and scrollback restored on relaunch
- **First-run onboarding** — guided wizard: detect agents, install AI skills, select project

## AI Skills

VibeIDE bundles pre-packaged skills from the [AISkills](https://github.com/NandaDevaiah/AISkills) repository. During onboarding (or later from the command palette), you can install:

- **Coding standards** — universal best practices, language-specific rules
- **TDD workflow** — test-driven development with 80%+ coverage enforcement
- **Security scanning** — AI regression testing, vulnerability detection
- **API design** — REST patterns, status codes, pagination, error responses
- **Agent definitions** — planner, code reviewer, security reviewer, architect, TDD guide
- **Language rules** — TypeScript, Python, Go, Rust, Kotlin, Java, Swift, C++, PHP, Perl

Skills are installed to each agent's config directory (`~/.claude/skills/`, `~/.gemini/rules/`, etc.) so your agents are effective out of the box.

## Install

### Linux

```bash
# Debian/Ubuntu — download and install .deb
curl -sLO https://github.com/nandadevaiah/vibeide/releases/latest/download/vibeide_0.1.0_amd64.deb
sudo dpkg -i vibeide_0.1.0_amd64.deb

# AppImage (any distro, no install needed)
curl -sLO https://github.com/nandadevaiah/vibeide/releases/latest/download/VibeIDE-0.1.0-x86_64.AppImage
chmod +x VibeIDE-0.1.0-x86_64.AppImage
./VibeIDE-0.1.0-x86_64.AppImage
```

Or with GitHub CLI:

```bash
gh release download --repo nandadevaiah/vibeide --pattern "*.deb" && sudo dpkg -i vibeide_*_amd64.deb
```

### macOS

```bash
curl -sLO https://github.com/nandadevaiah/vibeide/releases/latest/download/VibeIDE-0.1.0-arm64.dmg
```

Open the `.dmg` and drag VibeIDE to Applications.

**Note:** VibeIDE is not yet code-signed for macOS. On first open, run:

```bash
xattr -cr /Applications/VibeIDE.app
```

### Windows

```powershell
curl -sLO https://github.com/nandadevaiah/vibeide/releases/latest/download/VibeIDE-0.1.0-x64.exe
```

Run the downloaded `.exe` installer. Windows builds are signed with Azure Trusted Signing.

Or with GitHub CLI: `gh release download --repo nandadevaiah/vibeide --pattern "*.exe"`

Or download from [Releases](https://github.com/nandadevaiah/vibeide/releases).

## Quick Start

1. Open VibeIDE — the onboarding wizard detects installed agents
2. Install AI Skills (recommended preset or custom selection)
3. Add a project directory
4. Click **+** on a project to spawn an agent, or use **Launch Workspace** (sidebar play button) for multi-agent setup
5. Agents run in isolated git worktrees — review and merge changes when done

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` | Command palette |
| `Ctrl+Shift+N` | New shell terminal |
| `Ctrl+Shift+D` | Split pane vertically |
| `Ctrl+C` | Copy selected text / SIGINT if no selection |
| `Ctrl+V` | Paste from clipboard |
| `Ctrl+Shift+C` | Always copy selected text |
| `Ctrl+Shift+V` | Always paste |
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
