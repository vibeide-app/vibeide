# Preload API Grouping

The `contextBridge` API mirrors channel domains as nested objects.

```typescript
contextBridge.exposeInMainWorld('api', {
  pty: {
    write: (req) => ipcRenderer.invoke(IPC_CHANNELS.PTY_WRITE, req),
  },
  agent: {
    spawn: (req) => ipcRenderer.invoke(IPC_CHANNELS.AGENT_SPAWN, req),
  },
});
```

## Rules

- Group by domain: `api.pty.*`, `api.agent.*`, `api.git.*`, etc.
- Domain names match channel prefixes
- Event subscriptions use `onX` methods that return unsubscribe functions `() => void`
- Type the full API surface in `shared/ipc-types.ts` as `VibeIDEApi`
- Renderer accesses via `window.api.domain.method()`

## Why

- Discoverable: autocomplete shows grouped methods
- Auditable: security review can scan the exposed surface by domain
- Consistent: preload, handlers, and types all share the same namespace structure
