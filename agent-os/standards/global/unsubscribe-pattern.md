# Unsubscribe Pattern

All event subscriptions return a cleanup function `() => void`.

```typescript
// Main process (PtySession)
onData(cb: (data: string) => void): () => void {
  this.dataListeners.push(cb);
  return () => {
    const i = this.dataListeners.indexOf(cb);
    if (i !== -1) this.dataListeners.splice(i, 1);
  };
}

// Preload (IPC events)
onData(cb) {
  ipcRenderer.on(CHANNEL, handler);
  return () => ipcRenderer.removeListener(CHANNEL, handler);
}
```

## Rules

- Every `onX` method returns `() => void`
- Caller stores the return value and calls it during cleanup/dispose
- Never use `.removeAllListeners()` — each subscriber manages its own cleanup
- Listener errors are caught silently (never crash the main process)

## Why

- Prevents memory leaks from orphaned listeners
- Composable: store multiple unsubscribes in an array, call all on dispose
