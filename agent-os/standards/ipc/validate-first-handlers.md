# Validate-First IPC Handlers

Every `ipcMain.handle` callback receives `raw: unknown` and validates before processing.

```typescript
ipcMain.handle(IPC_CHANNELS.PTY_WRITE, (_event, raw: unknown) => {
  const req = validateWriteRequest(raw);
  ptyManager.write(req.sessionId, req.data);
});
```

## Rules

- Handler params are always `raw: unknown`
- Validate via dedicated functions in `ipc/validators.ts`
- Validators throw on invalid input (never return partial data)
- Each validator returns a typed, sanitized object
- UUIDs: regex-validated (`/^[0-9a-f]{8}-...-[0-9a-f]{12}$/i`)
- Strings: length-capped (e.g. labels ≤ 100)
- Numbers: range-checked and floored
- Paths: resolved via `path.resolve()`
- Enums: checked against allowlists

## Why

- Renderer is an untrusted security boundary
- Catches malformed data early during development
- Centralizes validation logic for reuse and testing
