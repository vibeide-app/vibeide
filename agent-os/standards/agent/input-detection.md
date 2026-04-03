# Input Detection

Detects when an agent is waiting for user input via layered regex pattern matching.

```
Output → stripAnsi → split lines →
  check exclusions →
  check (generic + agent-specific) patterns →
  check multi-line patterns
```

## Pattern Layers

- **Generic**: Y/n, proceed?, password:, etc.
- **Agent-specific**: Claude approval prompts, Gemini tool blocks, Codex sandbox, etc.
- **Multi-line**: Cross-line patterns for approval blocks spanning multiple lines
- **Exclusions**: Progress bars, downloading, compiling, streaming (preemptive)

## Rules

- Always strip ANSI before matching
- Check last 10 non-empty lines
- Exclusions are checked before patterns
- New agent = add pattern array + case in `getPatternsForAgent()`
- OutputBuffer capped at 4KB, auto-trimmed
- Detection runs every 500ms (polled, not event-driven)

## Why

- Agents don't expose structured APIs for input state — terminal output is the only signal
- Layered approach: generic catches common prompts, agent-specific handles unique UIs
