# Frame Coalescing

PTY output is buffered and flushed at 16ms intervals, not per-character.

```typescript
// pty-session.ts
this.process.onData((data) => {
  this.dataBuffer += data;
});

this.flushInterval = setInterval(() => {
  if (this.dataBuffer.length > 0) {
    const data = this.dataBuffer;
    this.dataBuffer = '';
    for (const listener of this.dataListeners) listener(data);
  }
}, FRAME_COALESCE_MS); // 16ms
```

## Rules

- Never send PTY data per-character to IPC
- Buffer in PtySession, flush at FRAME_COALESCE_MS (16ms = ~60fps)
- Flush remaining buffer on dispose
- Constant defined in shared/constants.ts

## Why

- 16ms matches 60fps display refresh — faster sends waste IPC bandwidth
- Reduces xterm.js re-renders dramatically
- Prevents IPC flooding during heavy output (npm install, build logs)
