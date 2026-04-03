# Safe Environment Allowlist

PTY sessions receive a curated environment, not `process.env`.

```typescript
const SAFE_ENV_KEYS = new Set([
  'PATH', 'HOME', 'USER', 'SHELL', 'TERM', 'LANG', 'LC_ALL', ...
]);

// Agent-specific API keys
if (agentType === 'claude') env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (agentType === 'gemini') env.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (agentType === 'codex') env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
```

## Rules

- Never pass `process.env` directly to node-pty
- Start from SAFE_ENV_KEYS allowlist
- API keys: only pass to the matching agent type (claude -> ANTHROPIC_API_KEY, etc.)
- Append common tool paths (Homebrew, NVM, cargo, pip) since Electron skips shell profiles
- Override env provided by caller is applied last via Object.assign

## Why

- Isolates agent secrets — Claude never sees OpenAI key, Codex never sees Anthropic key
- Prevents leaking host secrets to spawned processes
- Compensates for Electron not sourcing .bashrc/.zshrc
