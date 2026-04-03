# Agent Type System

Agents are defined by a union type, a spawnable set, and per-type config defaults.

```typescript
// shared/agent-types.ts
type AgentType = 'claude' | 'gemini' | ... | 'custom';
const SPAWNABLE_AGENT_TYPES = new Set<AgentType>([...]); // excludes 'custom'

// main/agent/agent-config.ts
const AGENT_DEFAULTS: Record<Exclude<AgentType, 'custom'>, Omit<AgentConfig, 'cwd'>> = { ... };
```

## Adding a New Agent

1. Add to `AgentType` union in `shared/agent-types.ts`
2. Add to `SPAWNABLE_AGENT_TYPES` set
3. Add config in `AGENT_DEFAULTS` (`agent-config.ts`)
4. Add input patterns in `input-detector.ts`
5. Add CLI command in `agent-version-detector.ts`
6. Add availability field in `AgentAvailability`

## Rules

- 'custom' is the only non-spawnable type (requires explicit config)
- AGENT_DEFAULTS provides command, args, label
- Windows: auto-wraps via cmd.exe /c for npm-installed CLIs
- IPC validators check against SPAWNABLE set
