# Layered Rule Transforms

PostProcessor applies transform rules in strict order.

```typescript
interface TransformRule {
  readonly pattern: RegExp;
  readonly replace: string | ((match: RegExpMatchArray) => string);
}
```

## Application Order

1. **Case conversion** — `snake case get user ID` → `get_user_id` (consumes multiple words)
2. **Symbol rules** — `forward slash` → `/`, `comma` → `,` (spoken punctuation)
3. **Abbreviation rules** — `API` → `api`, `URL` → `url` (command/code mode only)
4. **Terminal rules** — `enter` → `\n`, `sudo` → `sudo ` (command mode only)
5. **Spacing cleanup** — Collapse spaces around path symbols, brackets, underscores

## Rules

- Order matters: case rules must run first because they consume multi-word sequences
- Each rule layer is a separate `TransformRule[]` array
- Three modes: `natural` (minimal), `command` (terminal-oriented), `code` (symbol-heavy)
- Rules use `RegExp` with `gi` flags for case-insensitive global matching
- Function replacements handle complex transforms (case conversion)

## Why

- Case rules consume "snake case get user ID by name" as a multi-word phrase — if symbols ran first, "case" might be misinterpreted
