# Vanilla DOM Components

All UI is built with vanilla DOM APIs. No React, Vue, or other frameworks.

```typescript
class ToastManager {
  private readonly container: HTMLElement;
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  }
  show(options: ToastOptions): void { ... }
  dismiss(id: number): void { ... }
}
```

## Rules

- Use `document.createElement()` for all UI
- Style via CSS classes, not inline styles (except dynamic values like colors)
- Class-based components with `dispose()` for cleanup
- Use `role` and `aria-label` attributes for accessibility
- Animations via CSS classes (add/remove class, not JS animation)
- Export singleton instances for app-wide services (e.g. `export const toastManager`)

## Why

- Pragmatic: works well at current scale
- Zero framework overhead in Electron
- Full control over DOM lifecycle
- May revisit if UI complexity grows
