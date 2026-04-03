# IPC Channel Naming

All channels: `domain:action` format. Defined once in `shared/constants.ts` as `IPC_CHANNELS` const object.

```typescript
export const IPC_CHANNELS = {
  PTY_WRITE: 'pty:write',
  AGENT_SPAWN: 'agent:spawn',
  GIT_STATUS: 'git:status',
} as const;
```

## Rules

- Never use string literals for channels
- Import `IPC_CHANNELS` in main, preload, and renderer
- Key name: `DOMAIN_ACTION` (screaming snake)
- Value: `domain:action` (lowercase colon-sep)
- Group related channels by domain prefix
- Sub-resources use `domain:sub:action` (e.g. `project:state:load`)

## Why

- Single source of truth prevents typos
- `domain:action` format enables log filtering (`[IPC][pty:write]` pattern in handlers)
- TypeScript `as const` gives type safety at compile time
