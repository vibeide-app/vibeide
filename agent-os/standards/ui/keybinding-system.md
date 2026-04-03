# Keybinding System

Centralized defaults with user-overridable bindings persisted via IPC.

```typescript
interface KeybindingDefinition {
  readonly id: string;
  readonly label: string;
  readonly defaultKey: string;
  readonly holdMode?: boolean; // voice PTT only
}

const KEYBINDING_DEFAULTS: readonly KeybindingDefinition[] = [
  { id: 'command-palette', label: 'Command Palette', defaultKey: 'ctrl+shift+p' },
  ...
];
```

## Rules

- Define all bindings in `KEYBINDING_DEFAULTS` (`keybinding-defaults.ts`)
- Key format: `ctrl+shift+key` (lowercase)
- User overrides stored via IPC (`keybindings:load/save`), keyed by binding id
- Override lookup: user override ?? default
- `holdMode` is voice-specific (push-to-talk)
- All bindings appear in command palette automatically
- Retry IPC load on startup (up to 5x with 200ms delay) for race condition safety

## Adding a New Keybinding

1. Add entry to `KEYBINDING_DEFAULTS`
2. Handle the id in `keybindings.ts` dispatcher
3. Register in command palette if actionable
