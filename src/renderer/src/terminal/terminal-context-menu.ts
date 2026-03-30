// Terminal right-click context menu — Copy / Paste

let activeMenu: HTMLElement | null = null;

function dismiss(): void {
  if (activeMenu) {
    activeMenu.remove();
    activeMenu = null;
  }
}

export function showTerminalContextMenu(
  x: number,
  y: number,
  options: {
    readonly hasSelection: boolean;
    readonly onCopy: () => void;
    readonly onPaste: () => void;
  },
): void {
  dismiss();

  const menu = document.createElement('div');
  menu.className = 'terminal-context-menu';

  // Copy
  const copyItem = document.createElement('div');
  copyItem.className = 'terminal-context-menu-item';
  if (!options.hasSelection) copyItem.classList.add('disabled');
  copyItem.innerHTML = '<span>Copy</span><span class="terminal-context-menu-shortcut">Ctrl+Shift+C</span>';
  if (options.hasSelection) {
    copyItem.addEventListener('click', () => { dismiss(); options.onCopy(); });
  }

  // Paste
  const pasteItem = document.createElement('div');
  pasteItem.className = 'terminal-context-menu-item';
  pasteItem.innerHTML = '<span>Paste</span><span class="terminal-context-menu-shortcut">Ctrl+Shift+V</span>';
  pasteItem.addEventListener('click', () => { dismiss(); options.onPaste(); });

  menu.appendChild(copyItem);
  menu.appendChild(pasteItem);

  // Position — clamp to viewport
  document.body.appendChild(menu);
  const rect = menu.getBoundingClientRect();
  const clampedX = Math.min(x, window.innerWidth - rect.width - 8);
  const clampedY = Math.min(y, window.innerHeight - rect.height - 8);
  menu.style.left = `${Math.max(0, clampedX)}px`;
  menu.style.top = `${Math.max(0, clampedY)}px`;

  activeMenu = menu;

  // Dismiss on click outside or Escape
  const onDismiss = (e: MouseEvent) => {
    if (!menu.contains(e.target as Node)) {
      dismiss();
      document.removeEventListener('click', onDismiss);
    }
  };
  const onEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      dismiss();
      document.removeEventListener('keydown', onEsc);
    }
  };

  // Delay to avoid immediate dismiss from the contextmenu event
  requestAnimationFrame(() => {
    document.addEventListener('click', onDismiss);
    document.addEventListener('keydown', onEsc);
  });
}
