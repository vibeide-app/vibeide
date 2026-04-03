# Manager/Session Pattern

Resource collections use a Map-based manager class wrapping individual instance classes.

```typescript
class PtyManager {
  private readonly sessions = new Map<string, PtySession>();

  spawn(id, config): PtySession { ... }
  kill(id): void { ... }
  getSession(id): PtySession | undefined { ... }
  disposeAll(): void { ... }
}
```

## Rules

- Manager owns the Map, keyed by UUID
- Instance class handles its own lifecycle (connect, dispose)
- Manager provides: create, get, remove, disposeAll
- Instance provides: domain methods + dispose
- `getXOrThrow()` for required lookups, `getX()` for optional
- `disposeAll()` for cleanup on shutdown

## Where Used

- PtyManager / PtySession (main)
- TerminalManager / TerminalPanel (renderer)
- AgentManager / agent instances (main)

## Why

- Emerged naturally, proven across 3+ domains
- Clean separation: manager = collection ops, instance = behavior
- Consistent API makes code predictable
