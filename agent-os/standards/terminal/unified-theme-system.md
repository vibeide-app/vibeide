# Unified Theme System

Each theme defines both terminal colors and app chrome in one `AppTheme` object.

```typescript
interface AppTheme {
  readonly terminal: ITheme;              // xterm colors
  readonly chrome: Record<string, string>; // CSS custom properties
}
```

## Rules

- Every theme must define both `terminal` and `chrome` sections
- Chrome uses CSS custom properties: `--bg`, `--fg`, `--accent`, `--error`, etc.
- `enrichChrome()` auto-generates derived tokens (`--surface-raised`, `--accent-dim`, `--accent-hover`, `--border-subtle`)
- Light/dark detection via background luminance (avg RGB > 128)
- Themes stored in `terminal-theme.ts`, registered in the `themes` map
- User selection persisted to localStorage key `vibeide-theme`
- Default theme: `tokyoNight`

## Adding a New Theme

1. Define `const myTheme: AppTheme = { ... }`
2. Add to `themes` map
3. enrichChrome handles derived tokens automatically

## Why

- Coupling guarantees terminal and chrome always match visually
- Auto-enrichment means themes only need to define base tokens
