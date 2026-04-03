# Config Directory Layout

All persistent data stored under `~/.vibeide/`.

```
~/.vibeide/
├── projects.json              # Project list (name, path, pinned, timestamps)
├── state.json                 # Window bounds, active project, sidebar state
└── workspaces/
    └── {projectId}.json       # Per-project layout tree and agent state
```

## Rules

- Config dir: `~/.vibeide/` (created on first write)
- One file per concern: projects, state, workspaces
- Per-project state keyed by UUID in `workspaces/` subdirectory
- All files are JSON with 2-space indent
- Workspace files cleaned up when project is removed
- `mkdirSync({ recursive: true })` before every write
