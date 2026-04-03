# Agent Status State Machine

Agent status transitions are polled, not event-driven.

```
starting → running → idle (3s no output)
                  → needs-input (pattern match)
                  → complete (exit 0)
                  → error (exit non-0)
                  → stopped (user kill)

idle → running (output resumes)
     → needs-input (re-check finds match)
needs-input → running (user sends data)
```

## Timing Constants

- Poll interval: 500ms
- Idle threshold: 3s without output
- Running resume: output within last 1s

## Rules

- Status is immutable — create new AgentInfo via spread on every transition
- Every status change emits AGENT_STATUS to renderer via sendToRenderer
- Terminal states: complete, error, stopped (stop polling)
- clearNeedsInputForSession() resets on user input via PTY write

## Immutable Updates

Never mutate AgentInfo. Spread-and-replace in the Map:

```typescript
private updateAgentStatus(agentId: string, status: AgentStatus): void {
  const existing = this.agents.get(agentId);
  if (!existing) return;
  const updated: AgentInfo = { ...existing, status };
  this.agents.set(agentId, updated);
}
```

## Why

- Tuned for UX: responsive without state flickering
- Polling (not events) because output is the only signal from arbitrary CLI agents
