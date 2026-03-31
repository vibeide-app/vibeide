import {
  KEYBINDING_DEFAULTS,
  loadUserKeybindings,
  saveUserKeybindings,
  getEffectiveKey,
  formatKeyCombo,
  type KeybindingDefinition,
} from './keybinding-defaults';

export type KeybindingChangeCallback = () => void;

export class KeybindingEditor {
  private overlay: HTMLElement | null = null;
  private visible = false;
  private overrides: Record<string, string>;
  private recordingId: string | null = null;
  private readonly onChanged: KeybindingChangeCallback;
  private readonly boundCaptureHandler: (e: KeyboardEvent) => void;
  private readonly isMac = navigator.platform.toUpperCase().includes('MAC');

  constructor(onChanged: KeybindingChangeCallback) {
    this.overrides = loadUserKeybindings();
    this.onChanged = onChanged;
    this.boundCaptureHandler = (e: KeyboardEvent) => {
      if (!this.recordingId) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.captureKey(e);
    };
  }

  isVisible(): boolean {
    return this.visible;
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.overrides = loadUserKeybindings();
    this.renderOverlay();
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    this.stopRecording();
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  private renderOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'keybinding-editor-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    const panel = document.createElement('div');
    panel.className = 'keybinding-editor-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Keyboard Shortcuts');
    panel.setAttribute('aria-modal', 'true');

    const header = document.createElement('div');
    header.className = 'keybinding-editor-header';

    const title = document.createElement('span');
    title.textContent = 'Keyboard Shortcuts';
    title.className = 'keybinding-editor-title';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'file-viewer-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.setAttribute('aria-label', 'Close keyboard shortcuts');
    closeBtn.addEventListener('click', () => this.hide());

    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const body = document.createElement('div');
    body.className = 'keybinding-editor-body';

    for (const def of KEYBINDING_DEFAULTS) {
      const row = this.createRow(def);
      body.appendChild(row);
    }

    panel.appendChild(body);

    // Footer with reset button
    const footer = document.createElement('div');
    footer.className = 'keybinding-editor-footer';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'keybinding-reset-btn';
    resetBtn.textContent = 'Reset All to Defaults';
    resetBtn.addEventListener('click', () => {
      this.overrides = {};
      saveUserKeybindings(this.overrides);
      this.onChanged();
      // Re-render
      this.hide();
      this.show();
    });

    footer.appendChild(resetBtn);
    panel.appendChild(footer);

    this.overlay.appendChild(panel);
    document.body.appendChild(this.overlay);
  }

  private createRow(def: KeybindingDefinition): HTMLElement {
    const row = document.createElement('div');
    row.className = 'keybinding-row';

    const label = document.createElement('span');
    label.className = 'keybinding-row-label';
    label.textContent = def.label;
    if (def.holdMode) {
      const holdBadge = document.createElement('span');
      holdBadge.className = 'keybinding-hold-badge';
      holdBadge.textContent = 'hold';
      label.appendChild(holdBadge);
    }

    const currentKey = getEffectiveKey(def.id, this.overrides);

    const keyBtn = document.createElement('button');
    keyBtn.className = 'keybinding-key-btn';
    keyBtn.textContent = formatKeyCombo(currentKey);
    keyBtn.title = 'Click to rebind';
    keyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.startRecording(def.id, keyBtn);
    });

    const isCustom = def.id in this.overrides;

    const resetBtn = document.createElement('button');
    resetBtn.className = 'keybinding-row-reset';
    resetBtn.textContent = '\u21A9';
    resetBtn.title = 'Reset to default';
    resetBtn.style.visibility = isCustom ? 'visible' : 'hidden';
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      delete this.overrides[def.id];
      saveUserKeybindings(this.overrides);
      keyBtn.textContent = formatKeyCombo(def.defaultKey);
      keyBtn.classList.remove('custom');
      resetBtn.style.visibility = 'hidden';
      this.onChanged();
    });

    if (isCustom) {
      keyBtn.classList.add('custom');
    }

    row.appendChild(label);
    row.appendChild(keyBtn);
    row.appendChild(resetBtn);

    return row;
  }

  private startRecording(id: string, btn: HTMLButtonElement): void {
    // Clear any previous recording
    const prevBtn = this.overlay?.querySelector('.keybinding-key-btn.recording');
    if (prevBtn) {
      prevBtn.classList.remove('recording');
      prevBtn.textContent = formatKeyCombo(getEffectiveKey(this.recordingId ?? '', this.overrides));
    }

    this.recordingId = id;
    btn.classList.add('recording');
    btn.textContent = 'Press key combo...';

    // Listen on window with capture to intercept all key events
    window.addEventListener('keydown', this.boundCaptureHandler, true);
  }

  private stopRecording(): void {
    this.recordingId = null;
    window.removeEventListener('keydown', this.boundCaptureHandler, true);
  }

  private captureKey(e: KeyboardEvent): void {
    if (!this.recordingId) return;

    // Ignore lone modifier presses
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

    const parts: string[] = [];
    // On macOS, treat Cmd (Meta) as Ctrl for consistent bindings
    if (e.ctrlKey || (this.isMac && e.metaKey)) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    if (!this.isMac && e.metaKey) parts.push('meta');

    let key = e.key.toLowerCase();
    if (key === ' ') key = 'space';
    parts.push(key);

    const combo = parts.join('+');

    // Check for conflicts
    const conflictDef = KEYBINDING_DEFAULTS.find((d) =>
      d.id !== this.recordingId && getEffectiveKey(d.id, this.overrides) === combo,
    );

    // Save the binding
    const def = KEYBINDING_DEFAULTS.find((d) => d.id === this.recordingId);
    if (combo === def?.defaultKey) {
      delete this.overrides[this.recordingId];
    } else {
      this.overrides[this.recordingId] = combo;
    }

    // If there's a conflict, clear the conflicting binding
    if (conflictDef) {
      this.overrides[conflictDef.id] = '';
    }

    saveUserKeybindings(this.overrides);
    this.onChanged();

    // Update UI
    const recordingBtn = this.overlay?.querySelector('.keybinding-key-btn.recording') as HTMLButtonElement;
    if (recordingBtn) {
      recordingBtn.classList.remove('recording');
      recordingBtn.classList.toggle('custom', this.recordingId in this.overrides);
      recordingBtn.textContent = formatKeyCombo(combo);
    }

    // Re-render to update conflict state and reset buttons
    this.stopRecording();
    this.hide();
    this.show();
  }
}
