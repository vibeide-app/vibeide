# VibeIDE Phase 2 Implementation Plan

## Native Rust GPU-Accelerated AI Agent Terminal Orchestrator

---

## Pre-Phase: Spikes and Prototypes (Week 0 — 3-5 days)

Before committing to the full build, validate the three highest-risk technical unknowns with isolated proof-of-concept programs.

### Spike 1: wgpu + cosmic-text Glyph Atlas

**Goal:** Render a 120x40 grid of monospaced text at 120fps using wgpu with a glyph atlas built from cosmic-text.

**What to prove:**
- cosmic-text can rasterize JetBrains Mono glyphs into a texture atlas
- A single instanced draw call can render 4,800+ character cells
- Frame time stays under 8.3ms (120fps) on integrated GPUs
- Atlas updates (new glyphs, different sizes) don't cause frame drops

**Risk:** cosmic-text's glyph rasterization may have quality issues at small sizes, or the atlas-packing strategy may not be efficient enough. Mitigation: if cosmic-text fails, fall back to fontdue (lower-level, proven in other GPU terminal projects like Rio).

### Spike 2: alacritty_terminal as Library

**Goal:** Use `alacritty_terminal` crate to parse VT escape sequences and maintain a terminal grid state, without the Alacritty window/renderer.

**What to prove:**
- `alacritty_terminal::Term` can be used standalone (detached from Alacritty's event loop)
- PTY output can be fed through the parser and terminal grid state read back
- Color attributes, cursor position, and scrollback are accessible
- The crate compiles cleanly as a dependency (no hidden Alacritty-specific assumptions)

**Risk:** `alacritty_terminal` may have tight coupling to Alacritty internals that make standalone use difficult. Mitigation: if so, use `vte` crate directly for parsing and maintain a custom grid state (more work but fully controlled).

### Spike 3: whisper-rs Push-to-Talk

**Goal:** Capture microphone audio on push-to-talk, transcribe locally with whisper-rs, and output the text.

**What to prove:**
- whisper-rs works on Linux (PulseAudio/PipeWire) with acceptable latency
- The small/base Whisper model provides usable accuracy for English developer commands
- Transcription completes within 1-2 seconds of releasing the push-to-talk key
- Audio capture does not block the main thread (runs on a separate tokio task)

**Risk:** Whisper model loading time (~2-5 seconds for base model) and transcription latency may be too high for interactive use. Mitigation: pre-load the model at app startup; use the "tiny" model for speed with a config option for accuracy; support cloud STT (Deepgram/OpenAI) as fallback.

### Spike Results Gate

If all three spikes succeed: proceed with the phased plan below.
If Spike 1 fails: evaluate using `fontdue` instead of `cosmic-text`, or consider OpenGL glyph rendering.
If Spike 2 fails: plan for custom VT parser using `vte` crate + custom grid.
If Spike 3 fails: defer voice to Phase 2.7+ and ship with cloud-only STT initially.

---

## Dependency Graph

```
Phase 2.1 (Foundation)
    |
    v
Phase 2.2 (Terminal Rendering) ----+
    |                               |
    v                               |
Phase 2.3 (Multi-Terminal)          |
    |                               |
    v                               v
Phase 2.4 (UI Chrome) <----- Phase 2.5 (Agent Orchestration)
    |                               |
    +-------+-----------+-----------+
            |           |
            v           v
     Phase 2.6       Phase 2.7
   (File Explorer)  (Voice Integration)
            |           |
            +-----+-----+
                  |
                  v
            Phase 2.8 (Notifications + Templates + Polish)
                  |
                  v
            Phase 2.9 (Cross-Platform + Packaging)
                  |
                  v
            Phase 2.10 (WASM Plugins — Stretch)
```

---

## Overall Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Spikes | 3-5 days | Week 1 |
| 2.1 Foundation | 2 weeks | Week 3 |
| 2.2 Terminal Rendering | 3 weeks | Week 6 |
| 2.3 Multi-Terminal | 2 weeks | Week 8 |
| 2.4 UI Chrome | 3 weeks | Week 11 |
| 2.5 Agent Orchestration | 2 weeks (parallel with 2.4) | Week 10 |
| 2.6 File Explorer | 2 weeks | Week 13 |
| 2.7 Voice Integration | 2 weeks (parallel with 2.6) | Week 13 |
| 2.8 Polish | 2 weeks | Week 15 |
| 2.9 Cross-Platform | 2 weeks | Week 17 |
| 2.10 WASM (stretch) | 2-3 weeks | Week 20 |

**Total: 13-15 weeks to beta, 17 weeks to cross-platform release**

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Frame time (single pane) | <4ms |
| Frame time (4 panes) | <8ms |
| Input latency | <5ms |
| PTY throughput | >100MB/s |
| Startup time | <500ms |
| Memory (4 agents) | <150MB |
| Voice transcription | <2s |
| File explorer open | <100ms |
| Project switch | <50ms |

---

## Phase 2.1: Foundation — Window, GPU Context, Event Loop (2 weeks)

### Goal

Create the application skeleton: a native window powered by winit, a wgpu rendering context, and an async event loop that can process input events and schedule frame redraws at 120fps.

### Key Tasks

1. **Cargo workspace setup** — Create a multi-crate workspace with clear boundaries:
   - `vibeide-app` — binary crate, owns the event loop and window
   - `vibeide-gpu` — wgpu device/surface management, render pipeline abstraction
   - `vibeide-terminal` — terminal emulation and PTY (Phase 2.2+)
   - `vibeide-ui` — UI chrome, layout engine (Phase 2.4+)
   - `vibeide-agent` — agent process management (Phase 2.5+)
   - `vibeide-voice` — audio capture and STT (Phase 2.7+)
   - `vibeide-common` — shared types, config, error types
2. **winit window creation** — Open a resizable window with title "VibeIDE", minimum size 800x600, start maximized. Handle DPI scaling from the start.
3. **wgpu initialization** — Request adapter (prefer discrete GPU, fall back to integrated), create device and queue. Create a surface for the window. Configure swap chain for Mailbox (low-latency) present mode with sRGB format.
4. **Render loop** — Implement a frame-driven loop: poll winit events, process input, call render, present. Target 120fps with frame pacing. Use `Instant` for delta time tracking.
5. **Clear screen test** — Render a solid dark background color (#0f172a matching the VibeIDE theme) to confirm the full pipeline works.
6. **Input event scaffolding** — Wire keyboard and mouse events from winit into an internal event channel (tokio broadcast or crossbeam). No processing yet, just logging.
7. **Configuration system** — Load app config from `~/.vibeide/config.toml` using the `toml` crate. Define config structs for: window size/position, font settings, theme colors, keybindings. Fall back to sensible defaults.
8. **Error handling foundation** — Define `VibeError` enum using `thiserror`. Set up `tracing` with `tracing-subscriber` for structured logging to file and stderr.

### Crates / Dependencies

| Crate | Purpose |
|-------|---------|
| `winit` 0.30+ | Window creation, event loop, input events |
| `wgpu` 23+ | GPU abstraction (Vulkan/Metal/DX12) |
| `tokio` | Async runtime for background tasks |
| `tracing` + `tracing-subscriber` | Structured logging |
| `toml` + `serde` | Configuration file parsing |
| `thiserror` | Error type derivation |
| `directories` | XDG-compliant config/data paths |

### Risk Areas

- **winit + wgpu compatibility:** winit 0.30 changed the event loop API significantly. Pin to a known-good version pair and test on both Wayland and X11.
- **Wayland vs X11:** Test both display servers on Linux from day one. Use `winit`'s automatic backend selection but verify window decoration behavior on both.
- **DPI scaling edge cases:** High-DPI and mixed-DPI monitors need testing. Store logical vs physical size correctly from the start.

### What Can Be Ported from Phase 1

- **Theme colors and design tokens** — The CSS variables from the Tauri app map directly to wgpu clear colors and UI rendering colors. Extract into a shared theme module.
- **Configuration schema** — The settings structure (font size, theme, keybindings) can be reused, just change the storage format from Tauri's app data to a plain TOML file.
- **Keybinding definitions** — The keybinding map from Phase 1 can be ported as-is; only the event source changes (winit instead of browser KeyboardEvent).

### Testing Strategy

- **Unit tests:** Config loading with valid/invalid TOML files. Error type formatting. Event channel send/receive.
- **Integration tests:** Window creation succeeds on headless CI (use `wgpu`'s software adapter or skip GPU tests on CI). Config file round-trip (write, read, verify).
- **Manual verification:** Window opens, shows dark background, responds to resize, logs input events.

### Definition of Done

- [ ] `cargo run` opens a native window with dark background
- [ ] Window resizes smoothly without flickering
- [ ] Frame time logged, consistently under 2ms for empty frame
- [ ] Input events (keyboard, mouse) logged to terminal
- [ ] Config loaded from `~/.vibeide/config.toml` or defaults
- [ ] `tracing` output to both file and stderr
- [ ] All crates in workspace compile with zero warnings
- [ ] CI passes with `cargo clippy` and `cargo test`

---

## Phase 2.2: Terminal Rendering — GPU Text and PTY (3 weeks)

### Goal

Render a fully functional terminal in the GPU window: a PTY-connected shell with proper VT100/VT220 escape sequence handling, a GPU-rendered glyph atlas for text, and cursor rendering. This is the core of the terminal emulator.

### Key Tasks

1. **Glyph atlas construction** — Use `cosmic-text` to rasterize the configured monospace font (default: JetBrains Mono) into a texture atlas. Pack glyphs into a 2048x2048 (or larger) GPU texture. Record UV coordinates and metrics for each glyph. Support dynamic atlas growth when new glyphs are encountered (CJK, emoji).
2. **Cell rendering shader** — Write a WGSL vertex/fragment shader pair for instanced rendering of terminal cells. Each cell instance: position (row, col), glyph UV rect, foreground color, background color, attributes (bold, italic, underline). A single instanced draw call renders the entire visible grid.
3. **PTY management** — Use the `portable-pty` crate (or raw `nix::pty` on Linux) to spawn a shell process (default: user's $SHELL or /bin/bash). Wire stdout/stderr to a reader task, stdin to a writer task. Handle PTY resize (SIGWINCH) when the terminal pane resizes.
4. **VT parser integration** — Feed PTY output through `alacritty_terminal::Term` (validated in Spike 2) to parse escape sequences and maintain the terminal grid state. Read back the grid for rendering: character, foreground color, background color, cell attributes.
5. **Cursor rendering** — Render the cursor as a blinking block/beam/underline (configurable). Cursor blink rate configurable (default: 530ms on, 530ms off). Cursor changes shape based on terminal mode (insert vs replace).
6. **Scrollback buffer** — Maintain a scrollback buffer (default: 10,000 lines, configurable). Support smooth scrolling through scrollback with mouse wheel and keyboard shortcuts (Shift+PageUp/Down).
7. **Selection and copy** — Implement text selection with mouse drag. Highlight selected cells with a semi-transparent overlay. Copy selected text to system clipboard using `arboard` crate. Support word-select (double-click) and line-select (triple-click).
8. **Color scheme** — Implement ANSI 16-color, 256-color, and 24-bit true color support. Map terminal colors to the VibeIDE dark theme palette. Support OSC 4 color queries and changes.
9. **Performance optimization** — Only re-render cells that have changed since the last frame (dirty rect tracking). Batch PTY reads to reduce per-frame parse overhead. Profile and target <4ms frame time for a full 120x40 terminal.

### Crates / Dependencies

| Crate | Purpose |
|-------|---------|
| `cosmic-text` | Font shaping, glyph rasterization |
| `alacritty_terminal` | VT escape sequence parsing, terminal grid state |
| `portable-pty` | Cross-platform PTY management |
| `arboard` | System clipboard access |
| `unicode-width` | Correct width for CJK and wide characters |
| `bytemuck` | Safe transmutation for GPU buffer data |

### Risk Areas

- **Glyph atlas overflow:** Emoji and CJK characters can balloon the atlas. Implement atlas paging (multiple textures) or LRU eviction.
- **alacritty_terminal API stability:** This crate is not designed as a public library; API may change. Pin the exact version and wrap behind an abstraction trait.
- **PTY read performance:** High-throughput output (e.g., `cat large_file.txt`) must not drop frames. Buffer PTY reads and process in batches, limiting parse time per frame.
- **Unicode edge cases:** Combining characters, right-to-left text, and variation selectors need careful handling or explicit non-support.

### What Can Be Ported from Phase 1

- **Terminal color theme** — The xterm.js theme configuration (foreground, background, ANSI colors) maps directly to the new color palette.
- **Terminal settings** — Font family, font size, cursor style, scrollback size settings from Phase 1 carry over.
- **Selection behavior logic** — The double-click/triple-click word/line selection semantics can be reused conceptually, though the implementation is entirely different.

### Testing Strategy

- **Unit tests:** Glyph atlas packing (verify UV coordinates for known glyphs). Color mapping (ANSI index to RGBA). Cell attribute parsing.
- **Integration tests:** Feed known VT sequences through the parser and verify grid state. PTY spawn and basic I/O (echo test). Scrollback buffer capacity and content correctness.
- **Visual regression tests:** Render a known terminal state to an image and compare against a reference screenshot. Use `vttest` terminal test suite for compliance checking.
- **Performance tests:** Benchmark frame render time with a full 120x40 grid. Benchmark PTY throughput with `cat /dev/urandom | head -c 100M`.

### Definition of Done

- [ ] Full terminal emulator rendering in GPU window
- [ ] Shell prompt appears and accepts input
- [ ] Colors (16, 256, true color) render correctly
- [ ] Cursor blinks and changes shape
- [ ] Scrollback works with mouse wheel and keyboard
- [ ] Text selection and clipboard copy functional
- [ ] `vttest` basic tests pass
- [ ] Frame time <4ms for single terminal pane
- [ ] PTY throughput >100MB/s

---

## Phase 2.3: Multi-Terminal — Splits, Tabs, and Layout (2 weeks)

### Goal

Support multiple terminal panes in a tiled layout with splits (horizontal/vertical), tabs, and keyboard-driven navigation. Each pane runs an independent PTY session.

### Key Tasks

1. **Layout tree data structure** — Define a tree structure for the pane layout: leaf nodes are terminal panes, internal nodes are splits (horizontal or vertical) with a configurable ratio. Support arbitrary nesting depth.
2. **Split operations** — Implement split-horizontal (Ctrl+Shift+H) and split-vertical (Ctrl+Shift+V) commands. New split creates a new PTY session and divides the current pane's space. Support closing a pane (Ctrl+Shift+W) with tree rebalancing.
3. **Pane focus and navigation** — Track the focused pane. Navigate between panes with Ctrl+Shift+Arrow or Ctrl+Shift+H/J/K/L (vim-style). Visual indicator on the focused pane (accent-colored border).
4. **Pane resizing** — Drag the divider between panes to resize. Keyboard resize with Ctrl+Shift+Alt+Arrow. Minimum pane size: 20 columns x 5 rows. Double-click divider to equalize.
5. **Tab support** — Each "workspace" is a tab containing a layout tree. Support Ctrl+Shift+T (new tab), Ctrl+Shift+W (close tab when last pane closed), Ctrl+Tab / Ctrl+Shift+Tab (cycle tabs). Tab bar rendered at the top of the window.
6. **Layout serialization** — Serialize the current layout (split ratios, tab count, working directories) to restore on next launch. Store in `~/.vibeide/layout.json`.
7. **Viewport and rendering** — Each terminal pane renders into a scissored viewport region. The GPU render pass clips each pane to its bounds. Dividers rendered as 1px lines in the theme border color.
8. **PTY resize propagation** — When a pane resizes (window resize or split adjustment), send the correct SIGWINCH/resize to the associated PTY so the shell reflows correctly.

### Crates / Dependencies

| Crate | Purpose |
|-------|---------|
| No new crates required | Layout logic is custom |
| `serde_json` | Layout serialization |

### Risk Areas

- **Layout tree complexity:** Deeply nested splits with uneven ratios can create very small panes. Enforce minimum size constraints at the tree level.
- **PTY resize timing:** Rapid resize events (e.g., dragging a divider) generate many SIGWINCH signals. Debounce resize events (16ms) to avoid shell reflow thrashing.
- **Rendering performance with many panes:** Each pane is a separate render pass (or scissored region). With 6+ panes, verify frame time stays under 8ms.

### What Can Be Ported from Phase 1

- **Split logic and keybindings** — The split/navigate/resize keybindings from Phase 1's terminal manager can be reused. The tree data structure logic is similar but needs to be reimplemented in Rust.
- **Tab management state** — Tab ordering, active tab tracking, and tab naming logic carry over conceptually.
- **Layout persistence** — The layout save/restore approach from Phase 1 can be adapted.

### Testing Strategy

- **Unit tests:** Layout tree operations (split, close, resize, navigate). Minimum size enforcement. Layout serialization round-trip. Pane focus traversal in all directions.
- **Integration tests:** Spawn multiple PTYs, verify each is independent. Resize propagation (resize pane, verify PTY reports correct size).
- **Manual testing:** Split rapidly, resize rapidly, close panes in various orders. Verify no orphaned PTY processes.

### Definition of Done

- [ ] Horizontal and vertical splits working
- [ ] Keyboard navigation between panes (arrow and vim-style)
- [ ] Pane resize by dragging divider
- [ ] Tab bar with create/close/switch
- [ ] Each pane has an independent shell session
- [ ] Layout persists across app restarts
- [ ] No orphaned PTY processes after closing panes
- [ ] Frame time <8ms with 4 panes

---

## Phase 2.4: UI Chrome — Command Palette, Status Bar, Menus (3 weeks)

### Goal

Build the non-terminal UI elements: a command palette for quick actions, a status bar for system information, and modal dialogs. All rendered natively with the GPU — no HTML, no webview.

### Key Tasks

1. **Immediate-mode UI primitives** — Build a small set of GPU-rendered UI primitives: rectangles (filled, bordered, rounded), text labels, text input fields, scrollable lists, buttons. These form the building blocks for all UI chrome. Render using the same wgpu pipeline as terminal text (shared glyph atlas).
2. **Command palette** — Implement a fuzzy-search command palette (Ctrl+Shift+P). Features: text input at top, filtered list of commands below, keyboard navigation (up/down/enter/escape), fuzzy matching (skim algorithm), action dispatch on selection. Animate open/close with a fast slide-down (100ms).
3. **Status bar** — Render a status bar at the bottom of the window. Left section: current working directory, git branch (from `git rev-parse`), active agent status. Right section: CPU/memory usage (for the VibeIDE process), terminal dimensions, notification count.
4. **Quick Terminal selector** — A dropdown (Ctrl+Shift+J) showing all open terminal sessions with their working directory, recent command, and agent assignment. Select to focus that terminal.
5. **Settings UI** — A modal panel for editing settings (font size, theme, keybindings). Changes apply immediately (live preview). Save to `~/.vibeide/config.toml` on close.
6. **Keyboard shortcut overlay** — A help overlay (Ctrl+?) showing all available keybindings grouped by category. Searchable.
7. **Theme engine** — Load theme from config. Support switching between built-in themes (dark, light, high-contrast). Theme changes apply instantly to all UI elements and terminal colors.
8. **Modal system** — Generic modal dialog system for confirmations, input prompts, and error messages. Rendered as a centered card with backdrop blur (or semi-transparent overlay).
9. **Animations** — Implement smooth transitions for: command palette open/close, pane focus change (border color fade), tab switch (content cross-fade). Keep all animations under 150ms for responsiveness.

### Crates / Dependencies

| Crate | Purpose |
|-------|---------|
| `fuzzy-matcher` or `nucleo` | Fuzzy string matching for command palette |
| `sysinfo` | CPU/memory stats for status bar |
| `git2` | Git branch detection (libgit2 bindings) |

### Risk Areas

- **UI rendering performance:** Rendering UI elements (especially text input with cursor) adds draw calls. Batch all UI into a single render pass with the terminal content.
- **Focus management:** Terminal panes need keyboard input; UI overlays (command palette, modals) need to capture keyboard focus. Implement a focus stack: when a modal is open, it captures all input; when closed, focus returns to the previous target.
- **Text input in UI:** Implementing a text input field from scratch (cursor movement, selection, copy/paste, IME support) is non-trivial. Start with basic ASCII input and iterate.

### What Can Be Ported from Phase 1

- **Command palette command list** — The command definitions (name, description, shortcut, action) from Phase 1 can be ported directly. Only the rendering changes.
- **Status bar data sources** — Git branch detection, terminal dimension display, and CWD tracking logic carry over.
- **Keybinding definitions** — The full keybinding map from Phase 1's shortcut system can be reused.
- **Theme color values** — All color values from the CSS theme carry over to the GPU theme engine.

### Testing Strategy

- **Unit tests:** Fuzzy matching algorithm (verify ranking of results). Theme color parsing and validation. Command registration and lookup.
- **Integration tests:** Command palette filters correctly with known command list. Status bar updates when CWD changes. Settings save/load round-trip.
- **Visual tests:** Render UI elements to an image and compare against reference screenshots.
- **Accessibility audit:** Verify keyboard-only navigation works for all UI elements.

### Definition of Done

- [ ] Command palette opens with Ctrl+Shift+P, fuzzy-filters commands
- [ ] Status bar shows CWD, git branch, agent status, resource usage
- [ ] Quick terminal selector lists all sessions
- [ ] Settings panel allows live-preview changes
- [ ] Keybinding overlay shows all shortcuts
- [ ] Theme switching works instantly
- [ ] Modal dialogs render correctly with focus capture
- [ ] All UI elements keyboard-navigable
- [ ] UI rendering adds <1ms to frame time

---

## Phase 2.5: Agent Orchestration — AI Process Management (2 weeks)

### Goal

Manage AI agent processes (Claude Code CLI, Codex CLI, or any MCP-compatible agent) as first-class terminal sessions. Spawn agents in dedicated PTY sessions, track their lifecycle, and provide agent-aware UI.

### Key Tasks

1. **Agent process abstraction** — Define an `Agent` trait with: `spawn(config) -> AgentHandle`, `send_input(text)`, `read_output() -> Stream<String>`, `terminate()`, `status() -> AgentStatus`. Implement for Claude Code CLI and Codex CLI initially.
2. **Agent session management** — An `AgentManager` that tracks all running agents. Each agent runs in its own PTY (reusing the terminal infrastructure from Phase 2.2/2.3). Agents can be started, stopped, and restarted. Limit concurrent agents (default: 4, configurable).
3. **Agent configuration** — Config per agent: name, command to spawn, environment variables, working directory, auto-restart policy. Stored in `~/.vibeide/agents.toml`. Support project-local agent config in `.vibeide/agents.toml`.
4. **Agent-aware pane decoration** — Terminal panes running agents get special UI treatment: colored border (per agent type), agent name in tab title, status indicator (running/thinking/idle/error) in the status bar.
5. **Agent input routing** — When an agent pane is focused, keyboard input goes to the agent's PTY stdin. Support "interrupt" (Ctrl+C sends to agent process), "kill" (force-terminate), and "restart" commands.
6. **Agent output processing** — Parse agent output to detect: thinking indicators, tool use, code blocks, errors. This enables future features like progress bars and structured output display. For now, just tag output sections with metadata.
7. **Agent health monitoring** — Detect when an agent process exits unexpectedly. Auto-restart if configured. Show a notification on unexpected exit. Log all agent lifecycle events.
8. **Multi-agent coordination** — Support running multiple agents simultaneously in separate panes. Each agent has its own working directory and context. No inter-agent communication in this phase (future feature).

### Crates / Dependencies

| Crate | Purpose |
|-------|---------|
| `tokio::process` | Agent process spawning and management |
| `notify` | File system watching for agent config changes |

### Risk Areas

- **Agent process lifecycle:** Agents may hang, crash, or produce unexpected output. Implement robust timeout and health-check mechanisms.
- **PTY interaction with agents:** Some agents (Claude Code) use interactive terminal features (spinners, progress bars, ANSI formatting). The terminal emulator must handle these correctly.
- **Resource management:** Each agent process consumes memory and CPU. Monitor resource usage and warn the user when approaching limits.

### What Can Be Ported from Phase 1

- **Agent spawn logic** — The logic for spawning Claude Code / Codex as child processes and routing I/O can be ported from Phase 1's agent manager.
- **Agent configuration schema** — The agent definition format (name, command, env vars) from Phase 1 carries over.
- **Agent status tracking** — The state machine for agent lifecycle (starting, running, idle, error) can be reused.

### Testing Strategy

- **Unit tests:** AgentManager lifecycle (spawn, stop, restart). Config parsing. Status state machine transitions.
- **Integration tests:** Spawn a mock agent (simple script that echoes), verify I/O routing. Test agent crash and auto-restart. Test concurrent agent limit enforcement.
- **E2E tests:** Spawn a real Claude Code instance (if API key available), send a simple prompt, verify response appears in the terminal pane.

### Definition of Done

- [ ] Agents can be spawned in dedicated terminal panes
- [ ] Agent panes have visual indicators (border color, status)
- [ ] Agent lifecycle (start/stop/restart) works reliably
- [ ] Unexpected agent exit triggers notification and optional auto-restart
- [ ] Multiple agents can run simultaneously
- [ ] Agent config loaded from TOML files
- [ ] Memory usage stays under 150MB with 4 agents running
- [ ] All agent lifecycle events logged

---

## Phase 2.6: File Explorer — GPU-Rendered Tree View (2 weeks)

### Goal

Build a file explorer sidebar that shows the project directory tree, supports navigation, and integrates with the terminal (cd to directory, open file in agent). Entirely GPU-rendered, no webview.

### Key Tasks

1. **Directory scanning** — Use `walkdir` crate to scan the project directory. Build an in-memory tree structure. Respect `.gitignore` patterns using the `ignore` crate (same library ripgrep uses). Lazy-load subdirectories on expand to handle large projects.
2. **Tree view rendering** — Render the file tree as an indented list with expand/collapse arrows. Use file-type icons (via a simple icon atlas or Unicode symbols initially). Highlight the focused item. Support keyboard navigation (up/down/enter/left/right).
3. **File explorer sidebar** — Render as a resizable panel on the left side of the window. Toggle visibility with Ctrl+B. Drag the right edge to resize. Remember width across sessions.
4. **File operations** — Context menu (right-click or keyboard shortcut) with: New File, New Folder, Rename, Delete, Copy Path, Open in Terminal. All operations use standard filesystem APIs with confirmation dialogs for destructive actions.
5. **Search/filter** — Quick-filter the file tree by typing (similar to VS Code's file explorer filter). Highlight matching files/folders. Reset filter with Escape.
6. **File watching** — Use `notify` crate to watch the project directory for changes. Auto-update the tree when files are created, deleted, or renamed externally. Debounce updates to avoid thrashing.
7. **Integration with terminal** — Double-click a directory to `cd` in the focused terminal pane. Single-click a file to highlight it (show path in status bar). Drag a file to a terminal pane to paste its path.
8. **Git status integration** — Show git status indicators next to files: modified (M, amber), added (A, green), deleted (D, red), untracked (?, gray). Use `git2` crate (already included from Phase 2.4) to read the working tree status.

### Crates / Dependencies

| Crate | Purpose |
|-------|---------|
| `walkdir` | Recursive directory traversal |
| `ignore` | .gitignore-aware file filtering |
| `notify` | File system event watching |

### Risk Areas

- **Large project performance:** Projects with 100k+ files need efficient tree construction and rendering. Only render visible rows (virtual scrolling). Lazy-load collapsed directories.
- **File watcher reliability:** `notify` uses inotify on Linux, which has a per-user watch limit. If the project is very large, fall back to periodic polling for top-level directories.
- **Cross-platform path handling:** Use `std::path::Path` consistently. Handle symlinks (follow or show as link, configurable).

### What Can Be Ported from Phase 1

- **File tree logic** — The tree construction and traversal logic from Phase 1's file explorer can be ported. The rendering is entirely different (GPU vs React components).
- **Git status integration** — The git status fetching and per-file status assignment logic carries over.
- **File operation commands** — The operations (new file, rename, delete) and their confirmation dialogs can be conceptually reused.

### Testing Strategy

- **Unit tests:** Tree construction from a mock directory. .gitignore filtering. Git status mapping. Search/filter matching.
- **Integration tests:** Scan a real directory and verify tree structure. File watcher detects created/deleted files. File operations (create, rename, delete) work correctly.
- **Performance tests:** Scan a large project (Linux kernel source, ~70k files) and verify tree opens in <100ms.

### Definition of Done

- [ ] File explorer sidebar renders project directory tree
- [ ] Expand/collapse directories with click or keyboard
- [ ] Quick-filter narrows the tree by filename
- [ ] File operations (new, rename, delete) work with confirmations
- [ ] Git status indicators on modified/added/deleted files
- [ ] File watcher updates tree on external changes
- [ ] Double-click directory changes terminal CWD
- [ ] Opens in <100ms for projects up to 100k files
- [ ] Sidebar width persists across sessions

---

## Phase 2.7: Voice Integration — Push-to-Talk and Transcription (2 weeks)

### Goal

Add voice input capability: push-to-talk to capture audio, local transcription using Whisper, and input of the transcribed text into the focused terminal or agent pane.

### Key Tasks

1. **Audio capture** — Use `cpal` crate for cross-platform audio input. Capture from the default input device at 16kHz mono (Whisper's expected format). Run capture on a dedicated thread to avoid blocking the render loop.
2. **Push-to-talk activation** — Bind a configurable key (default: Right Alt or F13) as push-to-talk. While held, capture audio. On release, send the captured buffer for transcription. Show a visual indicator (microphone icon in status bar, pulsing accent color) while recording.
3. **Local transcription with whisper-rs** — Load the Whisper model (default: "base", configurable to "tiny", "small", "medium") at app startup in a background task. Transcribe captured audio on a separate tokio task. Return transcribed text via a channel.
4. **Cloud STT fallback** — Support cloud-based speech-to-text as an option: OpenAI Whisper API, Deepgram. Configure in settings with API key. Cloud STT used when: local model disabled, GPU unavailable, or user preference.
5. **Transcription output** — Inject transcribed text into the focused pane's PTY stdin, as if the user typed it. Optionally show a "preview" overlay before injecting, allowing the user to edit or cancel (Escape). Support voice commands: "run tests", "commit changes" mapped to actual commands.
6. **Voice activity detection** — Use a simple energy-based VAD to trim silence from the beginning and end of recordings. Avoid sending empty or noise-only audio to the transcriber.
7. **Audio feedback** — Play a subtle sound (or visual flash) when recording starts and stops. Configurable: sounds on, sounds off, visual only.
8. **Privacy controls** — All voice data processed locally by default. No audio sent to cloud unless explicitly configured. Config option to disable voice entirely. No audio stored after transcription.

### Crates / Dependencies

| Crate | Purpose |
|-------|---------|
| `whisper-rs` | Local Whisper model inference |
| `cpal` | Cross-platform audio capture |
| `hound` | WAV encoding for Whisper input |
| `reqwest` | HTTP client for cloud STT APIs |

### Risk Areas

- **Whisper model size and load time:** The "base" model is ~140MB. Pre-load at startup asynchronously. Provide a first-run download experience.
- **Transcription accuracy:** Developer jargon ("kubectl", "npm", "regex") may be poorly transcribed. Provide a custom vocabulary/prompt to Whisper to improve accuracy.
- **Audio permission on Linux:** PipeWire/PulseAudio permission may be needed. Detect and show a helpful error message if audio capture fails.
- **Latency budget:** Capture + transcription must complete in <2 seconds for interactive feel. The "tiny" model is faster but less accurate.

### What Can Be Ported from Phase 1

- **Voice integration concept** — Phase 1 did not include voice, so this is entirely new. However, the PTY input injection mechanism (sending text to a terminal pane) reuses Phase 2.2/2.3 infrastructure.

### Testing Strategy

- **Unit tests:** Audio buffer VAD trimming. WAV encoding format. Cloud API request construction. Voice command mapping.
- **Integration tests:** Mock audio capture, feed a pre-recorded WAV to Whisper, verify transcription output. Cloud STT with a mock HTTP server.
- **Manual testing:** Speak developer commands ("list all files", "run cargo test"), verify transcription accuracy. Test push-to-talk with different key hold durations.

### Definition of Done

- [ ] Push-to-talk captures audio and transcribes with Whisper
- [ ] Visual indicator shows when recording
- [ ] Transcribed text injected into focused terminal pane
- [ ] Cloud STT fallback configurable
- [ ] Transcription completes in <2 seconds
- [ ] Voice can be fully disabled in settings
- [ ] No audio data stored or sent to cloud by default
- [ ] Works with PulseAudio and PipeWire on Linux

---

## Phase 2.8: Notifications, Templates, and Polish (2 weeks)

### Goal

Add a notification system for agent events, project templates for quick starts, and polish the entire application for beta quality. Fix rough edges, improve error messages, and ensure a cohesive UX.

### Key Tasks

1. **Notification system** — In-app notification toasts for: agent completed, agent error, build finished, file changed. Stack notifications in the top-right corner. Auto-dismiss after 5 seconds (configurable). Click to navigate to the relevant pane. Support notification history panel.
2. **Project templates** — Quick-start templates for common project types: Rust CLI, Rust web (Axum), TypeScript/Node, Python. Template defines: initial files, agent configuration, recommended extensions. Accessible from command palette: "New Project from Template".
3. **Session management** — Save and restore complete sessions: all tabs, pane layouts, working directories, running agents. Auto-save session on exit. Named sessions for switching between projects.
4. **Startup experience** — First-run wizard: select default shell, configure font, choose theme, optional voice setup. Subsequent launches restore the last session automatically.
5. **Error recovery** — Graceful handling of all failure modes: GPU device lost (recreate device), PTY crash (show error in pane, offer restart), config file corruption (reset to defaults with warning), agent timeout (configurable timeout, force-kill option).
6. **Performance audit** — Profile the full application with `perf` and `tracy`. Identify and fix any frame time regressions. Verify all performance targets are met. Optimize memory usage.
7. **Keyboard shortcut consistency** — Audit all keybindings for conflicts and consistency. Ensure every action is accessible via keyboard. Document all shortcuts.
8. **Visual polish** — Consistent spacing and alignment across all UI elements. Smooth animations. Loading states for async operations. Empty states for panels with no content.

### Crates / Dependencies

| Crate | Purpose |
|-------|---------|
| `handlebars` or `tera` | Template rendering for project templates |
| `chrono` | Timestamps for notifications |

### Risk Areas

- **Notification overload:** Chatty agents can generate many notifications. Rate-limit notifications per agent (max 1 per 5 seconds for non-critical events).
- **Session restore complexity:** Restoring running agents requires re-spawning processes, which may fail if the environment has changed. Handle restore failures gracefully.

### What Can Be Ported from Phase 1

- **Notification structure** — The notification types and display logic from Phase 1 can be adapted.
- **Project template definitions** — Template file structures and configurations from Phase 1 carry over directly.
- **Session save/restore schema** — The session data model from Phase 1 can be reused with minor adjustments.

### Testing Strategy

- **Unit tests:** Notification rate limiting. Template file generation. Session serialization round-trip.
- **Integration tests:** Full session save/restore cycle. Template creates correct file structure. Notification dismissal and history.
- **E2E tests:** Launch app, create project from template, run agent, verify notification appears when agent completes.

### Definition of Done

- [ ] Notification toasts appear for agent events
- [ ] At least 4 project templates available
- [ ] Session save/restore works reliably
- [ ] First-run wizard guides new users
- [ ] All error modes handled gracefully with user-friendly messages
- [ ] All performance targets met (see Performance Targets table)
- [ ] No keyboard shortcut conflicts
- [ ] Visual consistency audit passes

---

## Phase 2.9: Cross-Platform and Packaging (2 weeks)

### Goal

Ensure VibeIDE runs well on macOS and Windows in addition to Linux. Package for distribution: AppImage/deb/rpm for Linux, DMG for macOS, MSI/NSIS for Windows.

### Key Tasks

1. **macOS support** — Test and fix all macOS-specific issues: Metal backend for wgpu, Retina display scaling, macOS keyboard shortcuts (Cmd instead of Ctrl), menu bar integration, .app bundle structure. Handle macOS Gatekeeper signing.
2. **Windows support** — Test and fix all Windows-specific issues: DX12/Vulkan backend for wgpu, ConPTY for terminal emulation (instead of Unix PTY), Windows keyboard shortcuts, high-DPI scaling, installer generation.
3. **Platform abstraction** — Ensure all platform-specific code is isolated behind trait abstractions. The PTY layer must abstract over Unix PTY and Windows ConPTY. File paths must use platform-appropriate separators.
4. **Packaging pipeline** — Set up CI/CD for building on all three platforms. Use GitHub Actions with matrix builds. Generate: AppImage + deb + rpm (Linux), DMG (macOS), MSI (Windows). Auto-publish releases from tags.
5. **Auto-update** — Implement an auto-update check on startup. Fetch latest version from GitHub releases API. Show a notification if an update is available. Support one-click update (download + replace binary).
6. **Platform-specific testing** — Run the full test suite on all three platforms in CI. Add platform-specific tests for PTY, keyboard, and rendering.

### Crates / Dependencies

| Crate | Purpose |
|-------|---------|
| `cargo-bundle` or `cargo-packager` | Application packaging |
| `self_update` | Auto-update from GitHub releases |
| `conpty` (Windows) | Windows ConPTY bindings |

### Risk Areas

- **Windows ConPTY differences:** ConPTY behavior differs from Unix PTY in subtle ways (escape sequence handling, resize behavior). Extensive testing needed.
- **macOS Gatekeeper:** Unsigned apps are blocked by default. Need an Apple Developer account for signing, or provide instructions for bypassing Gatekeeper.
- **CI build times:** Building for three platforms with full GPU dependencies is slow. Cache aggressively. Consider cross-compilation from Linux for macOS/Windows where possible.

### What Can Be Ported from Phase 1

- **CI/CD pipeline structure** — The GitHub Actions workflow from Phase 1's Tauri packaging can be adapted for the new Rust-native packaging.
- **Release versioning** — Version numbering scheme and changelog format carry over.

### Testing Strategy

- **Platform matrix tests:** Run full test suite on Linux (Ubuntu 22.04+), macOS (13+), Windows (10+). Verify GPU rendering on each platform.
- **Packaging tests:** Build packages on CI, install on clean VMs, verify the app launches and basic functionality works.
- **Update tests:** Simulate update check with a mock server. Verify update flow end-to-end.

### Definition of Done

- [ ] VibeIDE runs on Linux, macOS, and Windows
- [ ] Platform-specific keyboard shortcuts work correctly
- [ ] Packaging produces installable artifacts for all platforms
- [ ] CI builds and tests on all three platforms
- [ ] Auto-update check and notification works
- [ ] No platform-specific crashes or rendering issues

---

## Phase 2.10: WASM Plugin System (Stretch Goal — 2-3 weeks)

### Goal

Enable extensibility through a WASM-based plugin system. Plugins run in a sandboxed WASM runtime and can extend VibeIDE with custom commands, UI panels, themes, and agent integrations.

### Key Tasks

1. **WASM runtime integration** — Embed `wasmtime` as the plugin runtime. Plugins are compiled to WASM and loaded at startup. Each plugin runs in its own sandboxed instance with limited host access.
2. **Plugin API definition** — Define a stable plugin API (wit-bindgen interface): register commands, add status bar items, create UI panels, listen to events (terminal output, agent events, file changes). Version the API for backward compatibility.
3. **Plugin manifest** — Each plugin has a `plugin.toml` manifest: name, version, author, permissions (filesystem access, network access, terminal access). User must approve permissions on install.
4. **Plugin marketplace** — A built-in plugin browser (accessible from command palette) that fetches available plugins from a central registry (GitHub-based initially). Install, update, and uninstall plugins.
5. **Built-in plugins** — Ship with a few first-party plugins to demonstrate the system: theme switcher, git integration panel, markdown preview. These also serve as examples for plugin developers.
6. **Plugin development kit** — Provide a `vibeide-plugin-sdk` crate that plugin authors use to build plugins. Include a template project, documentation, and a local development workflow (hot-reload plugins during development).

### Crates / Dependencies

| Crate | Purpose |
|-------|---------|
| `wasmtime` | WASM runtime for plugin execution |
| `wit-bindgen` | Plugin API interface generation |
| `reqwest` | Plugin registry HTTP client |

### Risk Areas

- **WASM sandbox escapes:** Plugin security is critical. Carefully audit the host-side API. No direct filesystem or network access without explicit permission grants.
- **Plugin API stability:** The API must be stable enough for external developers. Version it from the start and maintain backward compatibility.
- **Performance overhead:** WASM function calls have overhead compared to native. Profile plugin interactions to ensure they don't add frame-time latency.

### What Can Be Ported from Phase 1

- **Plugin concept and marketplace UX** — If Phase 1 had any extension/plugin planning, those designs carry over. The implementation is entirely new with WASM.

### Testing Strategy

- **Unit tests:** Plugin manifest parsing. Permission checking. API versioning.
- **Integration tests:** Load a test WASM plugin, verify it can register a command and execute it. Test sandbox enforcement (attempt forbidden operations, verify they're blocked).
- **Security tests:** Attempt sandbox escapes from a malicious plugin. Verify all host calls are authorized.

### Definition of Done

- [ ] WASM plugins load and execute in a sandboxed runtime
- [ ] Plugin API supports: commands, status bar items, event listeners
- [ ] Plugin permissions enforced (user must approve)
- [ ] At least 3 built-in plugins demonstrating the system
- [ ] Plugin SDK crate published with documentation
- [ ] Plugin hot-reload works for development

---

## Cargo Workspace Structure

```
vibeide/
├── Cargo.toml                    # Workspace root
├── crates/
│   ├── vibeide-app/              # Binary: event loop, window, orchestration
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── main.rs
│   │       ├── app.rs            # Application state and lifecycle
│   │       ├── event_loop.rs     # winit event loop integration
│   │       ├── input.rs          # Input event processing
│   │       └── config.rs         # Configuration loading
│   │
│   ├── vibeide-gpu/              # GPU rendering abstraction
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── context.rs        # wgpu device, queue, surface
│   │       ├── atlas.rs          # Glyph atlas management
│   │       ├── pipeline.rs       # Render pipeline setup
│   │       ├── shaders/          # WGSL shader files
│   │       │   ├── cell.wgsl     # Terminal cell rendering
│   │       │   └── ui.wgsl       # UI element rendering
│   │       └── renderer.rs       # Frame rendering orchestration
│   │
│   ├── vibeide-terminal/         # Terminal emulation
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── pty.rs            # PTY management
│   │       ├── grid.rs           # Terminal grid state
│   │       ├── parser.rs         # VT sequence parsing (wraps alacritty_terminal)
│   │       ├── selection.rs      # Text selection
│   │       └── scrollback.rs     # Scrollback buffer
│   │
│   ├── vibeide-ui/               # UI chrome
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── layout.rs         # Pane layout tree
│   │       ├── tabs.rs           # Tab management
│   │       ├── palette.rs        # Command palette
│   │       ├── statusbar.rs      # Status bar
│   │       ├── explorer.rs       # File explorer
│   │       ├── modal.rs          # Modal dialog system
│   │       ├── notifications.rs  # Notification toasts
│   │       └── theme.rs          # Theme engine
│   │
│   ├── vibeide-agent/            # Agent orchestration
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── manager.rs        # Agent lifecycle management
│   │       ├── process.rs        # Agent process abstraction
│   │       ├── config.rs         # Agent configuration
│   │       └── health.rs         # Health monitoring
│   │
│   ├── vibeide-voice/            # Voice integration
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs
│   │       ├── capture.rs        # Audio capture
│   │       ├── whisper.rs        # Local Whisper transcription
│   │       ├── cloud.rs          # Cloud STT backends
│   │       └── vad.rs            # Voice activity detection
│   │
│   └── vibeide-common/           # Shared types
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs
│           ├── error.rs          # VibeError enum
│           ├── theme.rs          # Theme types and defaults
│           ├── keys.rs           # Keybinding types
│           └── event.rs          # Internal event types
│
├── tests/                        # Integration and E2E tests
│   ├── terminal_tests.rs
│   ├── agent_tests.rs
│   └── layout_tests.rs
│
├── assets/                       # Fonts, icons, default themes
│   ├── fonts/
│   ├── icons/
│   └── themes/
│
└── docs/                         # Documentation
    ├── architecture.md
    └── plugin-api.md
```

---

## Risk Summary

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| cosmic-text quality at small sizes | High | Medium | Spike 1; fallback to fontdue |
| alacritty_terminal API instability | High | Medium | Spike 2; wrap behind abstraction trait |
| Whisper latency too high | Medium | Medium | Spike 3; cloud STT fallback |
| wgpu compatibility across GPUs | High | Low | Test on integrated GPUs; software renderer fallback |
| Windows ConPTY differences | Medium | High | Extensive platform-specific testing |
| Large project file explorer perf | Medium | Medium | Virtual scrolling; lazy loading |
| WASM plugin sandbox escapes | Critical | Low | Security audit; minimal host API surface |
| Context window pressure in agents | Medium | Medium | Efficient prompt management; token tracking |

---

## Key Architectural Decisions

1. **No webview.** All rendering is native GPU via wgpu. This eliminates the Chromium memory overhead (~200-400MB) and gives us full control over the render pipeline.

2. **alacritty_terminal for VT parsing.** Rather than writing a VT parser from scratch, we leverage the battle-tested parser from Alacritty. This saves months of work on escape sequence edge cases.

3. **Cargo workspace with small crates.** Each subsystem (GPU, terminal, UI, agent, voice) is a separate crate with clear API boundaries. This enforces separation of concerns and enables parallel compilation.

4. **Immediate-mode UI for chrome.** UI elements (command palette, status bar, modals) use immediate-mode rendering into the same GPU pipeline. No retained-mode widget tree — keeps the rendering architecture simple and fast.

5. **WASM for plugins.** Plugins run in a sandboxed WASM runtime, not native code. This provides security guarantees and cross-platform compatibility at the cost of some performance overhead (acceptable for plugin-level operations).

6. **Local-first voice.** Voice transcription runs locally with Whisper by default. Cloud STT is opt-in. No audio leaves the device unless the user explicitly configures cloud transcription.
