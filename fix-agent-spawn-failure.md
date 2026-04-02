# Fix: Agent Spawn Failure — Empty Pane on Launch

**Date:** 2026-04-02
**Commit:** `c32e608` (code fixes), plus local `electron-rebuild` for native module
**Affected platforms:** macOS, Windows, Linux

## Symptom

Clicking "Launch Agent" in the project sidebar, selecting an agent type, and confirming produced no visible result — the terminal pane area remained blank. No error was shown to the user.

## Root Causes

Three independent issues contributed to the failure:

### 1. node-pty Native Module ABI Mismatch (Primary)

**Severity:** Critical — blocks all agent/shell spawning on the affected machine.

`node-pty` v1.1.0 ships prebuilt native binaries compiled against a specific Node ABI. When the local Node version (v24.x) differs from the ABI the prebuilds target, `pty.spawn()` throws `posix_spawnp failed` at the native layer.

The project's `postinstall` script (`electron-builder install-app-deps`) is designed to rebuild native modules against the installed Electron version. However, if `npm install` was run under a mismatched Node version, or the rebuild was skipped due to caching, the prebuilt binary remains stale.

**Error trace:**
```
[IPC][agent:spawn] Error: posix_spawnp failed.
    at new UnixTerminal (node_modules/node-pty/lib/unixTerminal.js:92:24)
    at Module.spawn (node_modules/node-pty/lib/index.js:30:12)
    at new PtySession (out/main/index.js:297:35)
```

**Diagnosis steps:**
```bash
# Verify node-pty works outside of Electron
node -e "const pty = require('node-pty'); \
  const p = pty.spawn('/bin/zsh', [], { cwd: '/tmp', cols: 80, rows: 24 }); \
  console.log('pid:', p.pid); p.kill(); process.exit(0);"

# If that throws posix_spawnp, the native binary needs rebuilding
```

**Fix:**
```bash
npx electron-rebuild -f -w node-pty
```

If `electron-rebuild` fails with `ModuleNotFoundError: No module named 'distutils'` (Python 3.12+ removed it), install setuptools first:
```bash
pip3 install --break-system-packages setuptools
npx electron-rebuild -f -w node-pty
```

Alternatively, re-running the postinstall script also works:
```bash
npm run postinstall
# Runs: electron-builder install-app-deps
```

**Why `postinstall` should prevent this:** `electron-builder install-app-deps` calls `@electron/rebuild` which recompiles native modules against the Electron ABI. A fresh `npm install` on any platform triggers this automatically. The issue only occurs when the rebuild is skipped (cache hit with stale binary) or when Node was upgraded after the initial install.

### 2. Empty Pane on Agent Spawn Failure (Code)

**Severity:** High — no user feedback when spawn fails.

**File:** `src/renderer/src/project/project-workspace.ts`

When the layout tree was empty (no existing panes) and `spawnAgent()` failed for any reason, the method returned `null` with only a `console.error`. The user saw a blank pane area with no indication of what went wrong.

Three failure paths were affected:
- Agent not installed (`checkInstalled` returns false)
- IPC returns error object (`{ error: 'agent_spawn_failed' }`)
- Exception during spawn

**Fix:** In all three failure paths, if the layout is empty and the failed type is not `shell`, fall back to spawning a shell so the pane is never blank:

```typescript
// Example from the IPC error path
if (!result || ('error' in result) || !result.config) {
  console.error('[ProjectWorkspace] Spawn returned error:', errorMsg);
  // Fallback: spawn shell so the pane isn't blank
  if (this.layoutManager.getLayoutTree() === null && type !== 'shell') {
    return this.spawnAgent('shell', direction);
  }
  return null;
}
```

**Recursion safety:** The fallback always requests type `'shell'`. If the shell itself fails to spawn, the `type !== 'shell'` guard prevents re-entry. Maximum call depth is 2 (original agent -> fallback shell -> null).

### 3. Windows Platform Bugs (Code)

**Severity:** Medium — affected Windows users only.

#### 3a. Shell command used `SHELL` env var on Windows

**File:** `src/main/agent/agent-config.ts`

`SHELL` is a Unix environment variable. On Windows, if set by Git Bash (e.g., `/usr/bin/bash`), it points to a path that `node-pty` cannot execute. The correct Windows env var is `COMSPEC`.

```typescript
// Before (broken on Windows if SHELL is set by Git Bash)
command: process.platform === 'win32'
  ? (process.env.SHELL || 'cmd.exe')
  : (process.env.SHELL || '/bin/bash'),

// After
command: process.platform === 'win32'
  ? (process.env.COMSPEC || 'cmd.exe')
  : (process.env.SHELL || '/bin/bash'),
```

#### 3b. NVM PATH separator hardcoded as `:`

**File:** `src/main/pty/pty-session.ts`

The `buildSafeEnv()` function concatenated the NVM node binary path using `:`, which is the Unix PATH separator. On Windows, PATH uses `;`. A `pathSep` variable was already defined but not used in this one location.

```typescript
// Before (broken on Windows)
env.PATH = `${nvmBin}:${env.PATH}`;

// After
env.PATH = `${nvmBin}${pathSep}${env.PATH}`;
```

## Platform Impact Matrix

| Fix | macOS | Linux | Windows |
|-----|-------|-------|---------|
| node-pty rebuild | Needed if ABI mismatched | Same | Same |
| Fallback shell on failure | Applied | Applied | Applied |
| COMSPEC for shell command | No change (Unix path) | No change (Unix path) | Fixed |
| NVM PATH separator | No change (`:` correct) | No change (`:` correct) | Fixed |

macOS and Linux share the Unix codepath. All platform-specific logic is gated behind `process.platform === 'win32'`.

## Prevention

1. **CI:** The existing `postinstall` script ensures native modules are rebuilt on fresh installs. No CI changes needed.
2. **Developer setup:** If `node-pty` fails after a Node version upgrade, run `npx electron-rebuild -f -w node-pty`.
3. **User feedback:** The fallback shell ensures users always see a usable pane, even when their requested agent fails to spawn.

## Files Changed

| File | Change |
|------|--------|
| `src/renderer/src/project/project-workspace.ts` | Fallback shell spawn on empty layout when agent fails |
| `src/main/agent/agent-config.ts` | Use `COMSPEC` instead of `SHELL` on Windows |
| `src/main/pty/pty-session.ts` | Use `pathSep` for NVM PATH concatenation |
| `tests/unit/agent-config.test.ts` | Updated shell config test for COMSPEC |
