# Readonly Shared Types

All IPC interfaces in `shared/ipc-types.ts` use `readonly` fields and `ReadonlyArray`.

```typescript
export interface ProjectInfo {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly pinned: boolean;
}

export interface AppState {
  readonly agents: ReadonlyArray<{
    readonly type: AgentType;
    readonly cwd: string;
  }>;
}
```

## Rules

- Every field in IPC interfaces: `readonly`
- Arrays: `ReadonlyArray<T>` not `T[]`
- Nested objects: also `readonly`
- Never mutate received IPC data — create new objects instead
- Type file: `shared/ipc-types.ts`

## Why

- Enforces project-wide immutability principle
- IPC data is serialized copies — mutation is a bug, not a feature
- Compiler catches accidental mutation at build time
