# Validation Type Guards

All persisted data is validated via `isValidX()` type guard functions before use.

```typescript
function isValidAppState(data: unknown): data is AppState {
  if (typeof data !== 'object' || data === null) return false;
  const s = data as Record<string, unknown>;
  // Validate every field: types, ranges, regexes, arrays
  if (typeof s.window !== 'object') return false;
  // ...
  return true;
}
```

## Rules

- Return `false` on invalid data — never throw
- Validate every field: type checks, range checks, regex for UUIDs
- Caller logs a warning and falls back to default state
- Graceful degradation: corrupt config = fresh start, not crash
- Array contents validated individually

## Why

- App must survive corrupt or stale config files from previous versions
- Graceful degradation over crash — user never loses their session
