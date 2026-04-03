# Create/Update Split

Separate functions for creating DOM elements vs updating their state.

```typescript
// Create — builds the full DOM structure
function createStatusIndicator(status: AgentStatus): HTMLElement {
  const indicator = document.createElement('span');
  // ... build child elements
  return indicator;
}

// Update — mutates existing element in-place
function updateStatusIndicator(indicator: HTMLElement, status: AgentStatus): void {
  const dot = indicator.querySelector('.status-dot');
  if (dot) dot.className = `status-dot status-${status}`;
}
```

## Rules

- `createX()` returns a new HTMLElement
- `updateX()` takes existing element + new state, mutates in-place
- Never recreate DOM when only state changed
- Use `querySelector` inside update to find child elements by class

## Why

- Avoids full DOM teardown/rebuild on state changes
- Critical for performance with many agents and frequent status updates
