# Atomic File Writes

All persistent data is written via write-to-tmp-then-rename.

```typescript
const tmpPath = `${targetPath}.tmp`;
fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
fs.renameSync(tmpPath, targetPath);
```

## Rules

- Never write directly to the target file
- Write to `{path}.tmp` first, then `fs.renameSync`
- `rename` is atomic on most filesystems — prevents corruption on crash
- Always `mkdirSync({ recursive: true })` before writing

## Why

- Proactive crash-safety: standard practice from the start
- If the process dies mid-write, the original file is intact
- The `.tmp` file is either complete or absent — never partial
