# IPC Error Responses

Handlers never throw across the IPC boundary. Return `{ error: 'snake_case_code' }` on failure.

```typescript
// In handler:
try {
  const req = validateWriteRequest(raw);
  ptyManager.write(req.sessionId, req.data);
} catch (error) {
  console.error('[IPC][pty:write]', error);
  return { error: 'pty_write_failed' };
}

// In renderer:
const result = await window.api.pty.write(req);
if (result?.error) { /* handle failure */ }
```

## Rules

- Wrap every handler body in try/catch
- Log full error server-side: `console.error('[IPC][channel]', error)`
- Return `{ error: 'domain_action_failed' }` to renderer
- Never expose stack traces or internal details to the renderer
- For read-only queries that fail, return `null` instead of an error object

## Why

- Electron serializes thrown errors poorly
- Keeps renderer-side error handling simple
- Server-side logs retain full debug context
