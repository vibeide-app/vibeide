# VibeIDE First-Run Onboarding Design

## Research Summary

### Patterns from successful developer tools

**Warp Terminal** uses onboarding slides with a scrollable content area, groups input/output into navigable blocks, and offers Warp Drive for sharing commands with teammates. Key lesson: keep the wizard short, make it scrollable for small windows, show premium features as disabled-but-visible (progressive disclosure).

**Cursor IDE** uses a 4-step flow: sign in, ask Cursor to explain your codebase, make a small edit, review the result. Key lesson: get to a working state fast; leverage VS Code familiarity.

**Windsurf IDE** uses a 4-step wizard: (1) import settings from VS Code/Cursor or start fresh, (2) keybinding preset, (3) theme selection, (4) sign in. Then a welcome page with quick actions. Key lesson: respect existing habits (import), minimize decisions.

**VS Code** uses a Welcome tab with walkthrough checklists that track progress, and extensions install for language support. Key lesson: walkthroughs are resumable, non-blocking, and discoverable later.

### Anti-patterns to avoid

1. **Wall of text** -- 90% of apps are opened once and abandoned due to friction. No paragraphs.
2. **Mandatory account creation** -- VibeIDE is local-first; never gate features behind sign-in.
3. **Information dump** -- don't show all 12 agents, all shortcuts, all features at once.
4. **Non-skippable steps** -- every step must have a "Skip" affordance.
5. **No resume** -- if the user closes mid-wizard, they restart from scratch. Persist step index.
6. **Light theme default** -- developers expect dark mode. VibeIDE already defaults to Tokyo Night.
7. **Blocking installs** -- don't freeze the UI while npm/pip install runs. Show progress, let user continue.
8. **Tutorial-before-value** -- don't force a tour before the user can do anything. Show the tour after the first project is open.
9. **Too many steps** -- 5 steps max. Each under 20 seconds. Total onboarding < 90 seconds.
10. **No escape hatch** -- always show "Skip setup" to jump straight into the app.

---

## Onboarding Flow (5 Steps)

### Architecture

The onboarding is a full-screen overlay that slides over the app body. It uses a simple state machine: step index 0-4, persisted to `~/.vibeide/settings.json` as `onboardingStep` (null = completed). On launch, if `onboardingStep` is not null and no projects exist, show the overlay.

```
+------------------------------------------------------------------+
| [titlebar]                                                        |
+------------------------------------------------------------------+
| +--------------------------------------------------------------+ |
| |                                                              | |
| |                   ONBOARDING OVERLAY                         | |
| |                   (covers app-body)                          | |
| |                                                              | |
| |   +----------------------------------------------+          | |
| |   |           Step Content Card                   |          | |
| |   |           (max-width: 640px)                  |          | |
| |   |           (centered)                          |          | |
| |   +----------------------------------------------+          | |
| |                                                              | |
| |   [ o  o  o  o  o ]  <-- step indicators                    | |
| |   [ Skip setup ]     <-- always visible                     | |
| +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

---

### Step 0: Welcome

**Goal:** 3-second value prop. Build excitement. Single CTA.

```
+----------------------------------------------+
|                                              |
|              [VibeIDE logo/icon]             |
|                                              |
|        One terminal to rule them all.        |
|                                              |
|   Run Claude, Gemini, Codex, Aider, and 8   |
|   more AI agents side by side -- in split    |
|   panes, with voice input and git worktrees. |
|                                              |
|           [ Get Started  ->  ]               |
|                                              |
|               Skip setup                     |
+----------------------------------------------+
```

**Copy:**
- Headline: `One terminal to rule them all.`
- Body: `Run Claude, Gemini, Codex, Aider, and 8 more AI agents side by side -- in split panes, with voice input and git worktrees.`
- CTA: `Get Started`
- Skip: `Skip setup` (subdued link)

**Visual:** The VibeIDE logo (or a stylized terminal icon) at top, rendered in accent color. No animation on first paint -- fast render matters more. The background is the app's `--bg-deep` color with a subtle radial gradient toward center to draw focus.

**Implementation notes:**
- No IPC calls needed
- Render immediately, no async
- The "Skip setup" link sets `onboardingComplete: true` in settings and removes the overlay

---

### Step 1: Agent Detection

**Goal:** Auto-scan PATH for installed agents. Show results instantly. Let user install missing ones.

```
+----------------------------------------------+
|                                              |
|           Your AI Agents                     |
|   We scanned your system for installed CLIs. |
|                                              |
|   +----------------------------------------+|
|   | [icon] Claude Code        [Installed v] ||
|   | [icon] Aider              [Installed v] ||
|   | [icon] Gemini CLI         [ Install  ]  ||
|   | [icon] Codex CLI          [ Install  ]  ||
|   | [icon] OpenCode           [ Install  ]  ||
|   | [icon] Amp                [Installed v] ||
|   | ...                                     ||
|   +----------------------------------------+|
|   |        Show 6 more agents    v          ||
|   +----------------------------------------+|
|                                              |
|   Agents can be installed later from the     |
|   command palette (Ctrl+Shift+P).            |
|                                              |
|        [ <-  Back ]    [ Next  ->  ]         |
|               Skip setup                     |
+----------------------------------------------+
```

**Copy:**
- Headline: `Your AI Agents`
- Subhead: `We scanned your system for installed CLIs.`
- Installed badge: green check + `Installed`
- Not installed button: `Install` (secondary button style)
- Collapsed section: `Show N more agents` (agents below top 6)
- Footer hint: `Agents can be installed later from the command palette (Ctrl+Shift+P).`

**Agent display order** (by popularity/recommendation):
1. Claude Code (recommended)
2. Aider (recommended)
3. Gemini CLI
4. Codex CLI
5. Amp
6. OpenCode
--- collapsed by default ---
7. Copilot CLI
8. Cursor CLI
9. Cline CLI
10. Continue
11. Crush
12. Qwen Code

**Install flow:**
- Clicking `Install` opens the existing `agent-install-dialog` (already built in `src/renderer/src/ui/agent-install-dialog.ts`) which shows the install command and a button to run it in a shell terminal.
- After install completes, the periodic availability check (`startPeriodicCheck` in `agent-version-detector.ts`) will fire `AGENT_AVAILABILITY_CHANGED`, and the onboarding UI listens for this to update badges in real-time.
- No need to build new install infrastructure -- reuse what exists.

**Implementation notes:**
- On step mount: call `window.api.agent.checkInstalled(command)` for each agent (already exists in preload API)
- Or better: trigger a full availability check via a new IPC call `agent:check-availability` that calls `checkAvailability()` from `agent-version-detector.ts` and returns the `AgentAvailability` object
- Listen to `onAvailabilityChanged` to update badges live
- Use `createAgentIcon()` from `agent-icons.ts` for each row
- Use `AGENT_INSTALL_INFO` from `shared/agent-install-info.ts` for display names and install commands

---

### Step 2: First Project

**Goal:** Get a project directory selected so the app has something to work with.

```
+----------------------------------------------+
|                                              |
|           Open Your First Project            |
|   Point VibeIDE at a code directory.         |
|                                              |
|   +----------------------------------------+|
|   |  DETECTED PROJECTS                      ||
|   |                                         ||
|   |  [folder] my-saas-app                   ||
|   |           ~/projects/my-saas-app        ||
|   |                                         ||
|   |  [folder] dotfiles                      ||
|   |           ~/projects/dotfiles           ||
|   |                                         ||
|   |  [folder] rust-playground               ||
|   |           ~/code/rust-playground        ||
|   +----------------------------------------+|
|                                              |
|   +----------------------------------------+|
|   |  [ Browse... ]  Choose a directory      ||
|   +----------------------------------------+|
|                                              |
|        [ <-  Back ]    [ Next  ->  ]         |
|               Skip setup                     |
+----------------------------------------------+
```

**Copy:**
- Headline: `Open Your First Project`
- Subhead: `Point VibeIDE at a code directory.`
- Section label: `Detected Projects` (if any found)
- Browse button: `Browse...` + `Choose a directory`

**Auto-detection logic (new main-process IPC):**
Scan common directories for git repos:
- `~/projects/`
- `~/code/`
- `~/dev/`
- `~/src/`
- `~/repos/`
- `~/Documents/GitHub/`
- `~/workspace/`

For each directory that exists, list immediate children and check if they contain a `.git` directory. Return up to 10 results sorted by modification time (most recent first). This is a shallow scan -- no recursion deeper than 1 level.

**Interaction:**
- Clicking a detected project selects it (highlighted with accent border)
- Clicking `Browse...` opens the existing `pickDirectory()` dialog
- Clicking `Next` creates the project via `window.api.project.create({ path })` using the selected directory
- If no directory is selected, `Next` is disabled (but `Skip` still works)
- Selecting multiple projects is not supported here -- keep it simple, one project to start

**Implementation notes:**
- New IPC channel: `ONBOARDING_DETECT_PROJECTS: 'onboarding:detect-projects'`
- New handler in main process: scans the directories above, returns `{ name: string; path: string }[]`
- Uses existing `window.api.project.create()` to add the selected project
- Uses existing `window.api.project.pickDirectory()` for the browse button

---

### Step 3: Quick Tour

**Goal:** Show 4 key features with visual demonstrations. Not interactive -- just awareness.

```
+----------------------------------------------+
|                                              |
|           Quick Tour                         |
|                                              |
|   +--+  +--+  +--+  +--+                    |
|   |1 |  |2 |  |3 |  |4 |  <-- feature tabs  |
|   +--+  +--+  +--+  +--+                    |
|                                              |
|   +----------------------------------------+|
|   |                                         ||
|   |   [ASCII/SVG illustration of feature]   ||
|   |                                         ||
|   |   Spawn an Agent                        ||
|   |   Click + in the sidebar or press       ||
|   |   Ctrl+N to launch any AI agent into    ||
|   |   a terminal pane.                      ||
|   |                                         ||
|   +----------------------------------------+|
|                                              |
|        [ <-  Back ]    [ Next  ->  ]         |
|               Skip setup                     |
+----------------------------------------------+
```

**4 feature cards (tabbed, click or arrow-key to switch):**

1. **Spawn an Agent**
   - Illustration: Stylized sidebar with a `+` button and agent icons dropping into a terminal pane
   - Copy: `Click + in the sidebar or press Ctrl+N to launch any AI agent into a terminal pane.`

2. **Split Panes**
   - Illustration: Two terminal panes side by side, each with a different agent icon
   - Copy: `Run multiple agents side by side. Press Ctrl+Shift+D to split, or use the buttons in the status bar.`

3. **Voice Input**
   - Illustration: Microphone icon with sound waves flowing into a terminal
   - Copy: `Press F3 to dictate text, or F4 for voice commands. Talk to your agents hands-free.`

4. **Git Worktrees**
   - Illustration: Branch icon splitting into parallel lines
   - Copy: `Each agent works in its own git worktree. Review changes and merge with one click.`

**Implementation notes:**
- Pure CSS + HTML, no IPC
- Feature tabs are `<button>` elements with `aria-selected`
- Illustrations are inline SVG or CSS-only drawings (no external images to load)
- Auto-advance every 5 seconds with a progress bar, but clicking a tab resets the timer
- Arrow keys navigate tabs for accessibility

---

### Step 4: Ready

**Goal:** Confirm setup is complete. Build confidence. Launch into the app.

```
+----------------------------------------------+
|                                              |
|              You're all set.                 |
|                                              |
|   +----------------------------------------+|
|   |  3 agents installed                     ||
|   |  1 project added                        ||
|   +----------------------------------------+|
|                                              |
|   Keyboard shortcuts:                        |
|   Ctrl+N         Spawn agent                 |
|   Ctrl+Shift+P   Command palette             |
|   Ctrl+Shift+D   Split pane                  |
|   F3 / F4        Voice dictate / command     |
|   Ctrl+B         Toggle sidebar              |
|                                              |
|           [ Start Building  ->  ]            |
|                                              |
+----------------------------------------------+
```

**Copy:**
- Headline: `You're all set.`
- Summary: `N agents installed` / `N projects added` (dynamic counts)
- Shortcuts table: 5 essential shortcuts
- CTA: `Start Building`

**Implementation notes:**
- Count installed agents from the availability data gathered in Step 1
- Count projects from `window.api.project.list()`
- "Start Building" sets `onboardingComplete: true` in settings, removes the overlay, and if a project was added in Step 2, switches to it

---

## Technical Implementation

### Data Persistence

```typescript
// Added to settings.json (~/.vibeide/settings.json)
interface OnboardingState {
  readonly onboardingComplete: boolean;      // false until wizard finishes or is skipped
  readonly onboardingStep: number;           // current step index (0-4), for resume
  readonly onboardingAgentAvailability?: Record<string, boolean>; // cached from step 1
}
```

Settings are already persisted via `window.api.settings.save()` and `window.api.settings.load()` -- no new IPC infrastructure needed for this.

### New IPC Channel

Only one new IPC channel is needed:

```typescript
// In constants.ts
ONBOARDING_DETECT_PROJECTS: 'onboarding:detect-projects'
```

Handler in main process:

```typescript
// Scans ~/projects, ~/code, ~/dev, ~/src, ~/repos, ~/Documents/GitHub, ~/workspace
// Returns { name: string; path: string }[] (max 10, sorted by mtime desc)
async function detectProjects(): Promise<Array<{ name: string; path: string }>> {
  const home = os.homedir();
  const searchDirs = [
    path.join(home, 'projects'),
    path.join(home, 'code'),
    path.join(home, 'dev'),
    path.join(home, 'src'),
    path.join(home, 'repos'),
    path.join(home, 'Documents', 'GitHub'),
    path.join(home, 'workspace'),
  ];

  const results: Array<{ name: string; path: string; mtime: number }> = [];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const fullPath = path.join(dir, entry.name);
      const gitPath = path.join(fullPath, '.git');
      if (fs.existsSync(gitPath)) {
        const stat = fs.statSync(fullPath);
        results.push({ name: entry.name, path: fullPath, mtime: stat.mtimeMs });
      }
    }
  }

  return results
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 10)
    .map(({ name, path }) => ({ name, path }));
}
```

### File Structure

New files:

```
src/renderer/src/onboarding/
  onboarding-wizard.ts      -- Main wizard controller (state machine, overlay management)
  onboarding-welcome.ts     -- Step 0: Welcome screen
  onboarding-agents.ts      -- Step 1: Agent detection grid
  onboarding-project.ts     -- Step 2: Project selection
  onboarding-tour.ts        -- Step 3: Feature tour (tabbed cards)
  onboarding-ready.ts       -- Step 4: Summary + launch
  onboarding.css             -- All onboarding styles
```

Modified files:

```
src/shared/constants.ts              -- Add ONBOARDING_DETECT_PROJECTS channel
src/shared/ipc-types.ts              -- Add detectProjects to VibeIDEApi.onboarding namespace
src/preload/index.ts                 -- Expose onboarding.detectProjects
src/main/ipc/handlers.ts             -- Add handler for onboarding:detect-projects
src/renderer/src/main.ts             -- Check onboarding state on startup, show overlay
src/renderer/src/styles/global.css   -- (no changes needed, onboarding.css is separate)
```

### Integration Point in main.ts

The onboarding check happens early in `main()`, after theme is applied but before sidebar/workspace initialization:

```typescript
// In main() after applyTheme(loadSavedTheme()):

const settings = await window.api.settings.load();
const projects = await window.api.project.list();

if (!settings.onboardingComplete && projects.length === 0) {
  const { OnboardingWizard } = await import('./onboarding/onboarding-wizard');
  const wizard = new OnboardingWizard(appEl, {
    initialStep: typeof settings.onboardingStep === 'number' ? settings.onboardingStep : 0,
    onComplete: () => {
      // Refresh project list in sidebar
      refreshProjectList();
    },
    onSkip: () => {
      // Same as complete
      refreshProjectList();
    },
  });
  wizard.show();
}
```

### Wizard State Machine

```typescript
// onboarding-wizard.ts

interface OnboardingCallbacks {
  readonly onComplete: () => void;
  readonly onSkip: () => void;
}

interface StepRenderer {
  render(container: HTMLElement): void;
  cleanup?(): void;
}

export class OnboardingWizard {
  private currentStep: number;
  private readonly overlay: HTMLElement;
  private readonly container: HTMLElement;
  private readonly steps: StepRenderer[];

  constructor(parent: HTMLElement, options: { initialStep: number } & OnboardingCallbacks) {
    // Create overlay, step indicators, nav buttons
    // Each step is a StepRenderer with render() and optional cleanup()
  }

  show(): void { /* append overlay to parent */ }

  private goTo(step: number): void {
    // 1. Call cleanup() on current step
    // 2. Persist step index to settings
    // 3. Clear container
    // 4. Call render() on new step
    // 5. Update step indicators
    // 6. Update nav button labels/visibility
  }

  private complete(): void {
    // Set onboardingComplete: true in settings
    // Remove overlay with a fade-out transition
    // Call onComplete callback
  }

  private skip(): void {
    // Same as complete() but calls onSkip
  }
}
```

### CSS Architecture

```css
/* onboarding.css */

.onboarding-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--bg-deep);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.onboarding-card {
  max-width: 640px;
  width: 90%;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: var(--space-8);
  max-height: 80vh;
  overflow-y: auto;
}

.onboarding-step-indicators {
  display: flex;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

.onboarding-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--fg-faint);
  transition: background var(--transition-normal);
}

.onboarding-dot.active {
  background: var(--accent);
}

.onboarding-dot.completed {
  background: var(--success);
}

.onboarding-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-6);
}

.onboarding-skip {
  color: var(--fg-dim);
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-sm);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Agent grid */
.onboarding-agent-row {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border-radius: 6px;
  gap: var(--space-3);
}

.onboarding-agent-row:hover {
  background: var(--surface-hover);
}

.onboarding-agent-status {
  margin-left: auto;
}

.onboarding-agent-installed {
  color: var(--success);
  font-size: var(--font-sm);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

/* Project list */
.onboarding-project-item {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border-radius: 6px;
  gap: var(--space-3);
  cursor: pointer;
  border: 1px solid transparent;
}

.onboarding-project-item:hover {
  background: var(--surface-hover);
}

.onboarding-project-item.selected {
  border-color: var(--accent);
  background: var(--accent-dim);
}

/* Tour feature tabs */
.onboarding-tour-tabs {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
}

.onboarding-tour-tab {
  padding: var(--space-1) var(--space-3);
  border-radius: 4px;
  background: none;
  border: 1px solid transparent;
  color: var(--fg-dim);
  cursor: pointer;
  font-size: var(--font-sm);
}

.onboarding-tour-tab[aria-selected="true"] {
  border-color: var(--accent);
  color: var(--fg);
  background: var(--accent-dim);
}
```

### Accessibility

- All steps use semantic HTML (`<h2>` for headlines, `<p>` for body, `<button>` for actions)
- Step indicators use `aria-current="step"` on the active dot
- Tour tabs use `role="tablist"`, `role="tab"`, `role="tabpanel"` with `aria-selected`
- Focus is trapped within the overlay while it's visible
- `Escape` key triggers "Skip setup"
- All buttons have visible focus rings (already handled by global CSS)
- Agent grid rows are not focusable themselves -- only the `Install` buttons are

### Animations

Keep it minimal -- developers don't want flashy:
- Overlay fades in on show (`opacity 0 -> 1`, 200ms)
- Step transitions: card content cross-fades (150ms)
- Overlay fades out on complete (200ms), then remove from DOM
- Agent install status updates: badge fades from grey to green (300ms)
- No slide animations, no bouncing, no parallax

---

## Examples from Other Tools

### VS Code Welcome Tab
VS Code shows a Welcome tab on first launch with a checklist walkthrough. Each item (e.g., "Change color theme", "Install extensions") is a link that opens the relevant UI. Progress is tracked with checkmarks. The tab is dismissible and can be re-opened from the Help menu. **Takeaway:** Walkthrough-style checklists are effective for power users who want to self-direct.

### Cursor IDE Quickstart
Cursor's onboarding is 4 steps: sign in, explain codebase, make an edit, review. It's action-oriented -- each step has the user do something real. **Takeaway:** "Try it now" is more memorable than "read about it."

### Windsurf IDE Setup
Windsurf offers to import settings from VS Code or Cursor on first launch, then picks keybindings and theme. It's purely preferential -- no functional setup. **Takeaway:** Importing from other tools reduces friction for switchers.

### Warp Terminal
Warp uses onboarding slides that are scrollable when the window is small. Free users see premium features as disabled with an upgrade CTA. **Takeaway:** Design for small windows; don't hide navigation buttons below the fold.

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Full-screen overlay, not a tab | A tab can be ignored; overlay ensures first-time users see it |
| 5 steps, not 3 or 7 | 3 is too compressed (agent detection alone needs space); 7 is too long |
| Auto-detect projects, not "create new" | Most users installing VibeIDE already have projects. Creating a new project requires template selection which is too much for onboarding |
| Reuse existing agent-install-dialog | No need to duplicate install UI; the existing dialog works well |
| Show top 6 agents, collapse rest | 12 agents is overwhelming; show the most popular first |
| No account creation step | VibeIDE is local-first; no server-side auth needed |
| No theme selection step | Tokyo Night is a good default; theme switching is in command palette |
| No keybinding selection step | VibeIDE has its own keybinding system; no migration from other tools needed yet |
| Persist onboarding step, not just complete/incomplete | Allows resume if user closes app mid-wizard |
| One new IPC channel only | Minimize API surface; reuse existing agent/project APIs |

---

## Estimated Implementation Effort

| Task | Effort |
|------|--------|
| `onboarding-wizard.ts` (state machine, overlay, nav) | 2 hours |
| `onboarding-welcome.ts` (static content) | 30 min |
| `onboarding-agents.ts` (grid, availability integration) | 2 hours |
| `onboarding-project.ts` (detection, selection, browse) | 2 hours |
| `onboarding-tour.ts` (tabs, illustrations) | 1.5 hours |
| `onboarding-ready.ts` (summary, shortcuts) | 30 min |
| `onboarding.css` | 1.5 hours |
| IPC: detect-projects handler + preload | 1 hour |
| Integration in main.ts | 30 min |
| Testing (manual + unit for detection) | 2 hours |
| **Total** | **~12 hours** |
