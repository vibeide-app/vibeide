interface Command {
  readonly id: string;
  readonly label: string;
  readonly shortcut?: string;
  readonly action: () => void;
}

interface ScoredCommand {
  readonly command: Command;
  readonly score: number;
  readonly matchIndices: readonly number[];
}

function fuzzyMatch(text: string, query: string): { score: number; indices: number[] } | null {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  const indices: number[] = [];
  let score = 0;
  let queryIdx = 0;
  let prevMatchIdx = -2;

  for (let i = 0; i < textLower.length && queryIdx < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIdx]) {
      indices.push(i);
      // Bonus for consecutive matches
      if (i === prevMatchIdx + 1) score += 5;
      // Bonus for matching at word boundaries
      if (i === 0 || text[i - 1] === ' ' || text[i - 1] === ':' || text[i - 1] === '-') score += 3;
      // Bonus for matching uppercase (camelCase/PascalCase boundaries)
      if (text[i] === text[i].toUpperCase() && text[i] !== text[i].toLowerCase()) score += 2;
      score += 1;
      prevMatchIdx = i;
      queryIdx++;
    }
  }

  // All query characters must match
  if (queryIdx !== queryLower.length) return null;

  // Bonus for shorter labels (prefer more specific matches)
  score += Math.max(0, 20 - text.length);

  return { score, indices };
}

function highlightMatches(text: string, indices: readonly number[]): HTMLElement {
  const span = document.createElement('span');
  span.className = 'command-label';

  const indexSet = new Set(indices);
  let current = '';
  let inHighlight = false;

  for (let i = 0; i < text.length; i++) {
    const isMatch = indexSet.has(i);
    if (isMatch !== inHighlight) {
      if (current) {
        const el = document.createElement('span');
        if (inHighlight) el.className = 'command-match-highlight';
        el.textContent = current;
        span.appendChild(el);
      }
      current = '';
      inHighlight = isMatch;
    }
    current += text[i];
  }

  if (current) {
    const el = document.createElement('span');
    if (inHighlight) el.className = 'command-match-highlight';
    el.textContent = current;
    span.appendChild(el);
  }

  return span;
}

export class CommandPalette {
  private readonly commands: Command[] = [];
  private visible = false;
  private selectedIndex = 0;
  private filterText = '';
  private overlayEl: HTMLElement | null = null;

  register(command: Command): void {
    this.commands.push(command);
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
    this.filterText = '';
    this.selectedIndex = 0;
    this.renderOverlay();
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    if (this.overlayEl) {
      this.overlayEl.remove();
      this.overlayEl = null;
    }
  }

  private renderOverlay(): void {
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'command-palette-overlay';
    this.overlayEl.addEventListener('click', (e) => {
      if (e.target === this.overlayEl) {
        this.hide();
      }
    });

    const palette = document.createElement('div');
    palette.className = 'command-palette';

    const input = document.createElement('input');
    input.className = 'command-palette-input';
    input.placeholder = 'Type a command...';
    input.addEventListener('input', () => {
      this.filterText = input.value;
      this.selectedIndex = 0;
      this.renderItems(itemsContainer);
    });
    input.addEventListener('keydown', (e) => this.handleKeydown(e));

    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'command-palette-items';

    palette.appendChild(input);
    palette.appendChild(itemsContainer);
    this.overlayEl.appendChild(palette);
    document.body.appendChild(this.overlayEl);

    this.renderItems(itemsContainer);
    input.focus();
  }

  private renderItems(container: HTMLElement): void {
    container.replaceChildren();
    const results = this.getFilteredCommands();

    if (this.filterText && results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'command-empty';
      empty.textContent = 'No matching commands';
      container.appendChild(empty);
      return;
    }

    results.forEach((result, index) => {
      const item = document.createElement('div');
      item.className = `command-item${index === this.selectedIndex ? ' selected' : ''}`;

      // Use highlighted label if fuzzy matched, plain text otherwise
      if (this.filterText && result.matchIndices.length > 0) {
        const label = highlightMatches(result.command.label, result.matchIndices);
        item.appendChild(label);
      } else {
        const label = document.createElement('span');
        label.className = 'command-label';
        label.textContent = result.command.label;
        item.appendChild(label);
      }

      if (result.command.shortcut) {
        const shortcut = document.createElement('span');
        shortcut.className = 'command-shortcut';
        shortcut.textContent = result.command.shortcut;
        item.appendChild(shortcut);
      }

      item.addEventListener('click', () => {
        this.hide();
        result.command.action();
      });

      item.addEventListener('mouseenter', () => {
        this.selectedIndex = index;
        container.querySelectorAll('.command-item').forEach((el, i) => {
          el.classList.toggle('selected', i === index);
        });
      });

      container.appendChild(item);
    });
  }

  private handleKeydown(e: KeyboardEvent): void {
    const filtered = this.getFilteredCommands();

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, filtered.length - 1);
        this.updateSelection();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.updateSelection();
        break;
      case 'Enter':
        e.preventDefault();
        if (filtered[this.selectedIndex]) {
          this.hide();
          filtered[this.selectedIndex].command.action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.hide();
        break;
    }
  }

  private updateSelection(): void {
    if (!this.overlayEl) return;
    const items = this.overlayEl.querySelectorAll('.command-item');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === this.selectedIndex);
    });
  }

  private getFilteredCommands(): ScoredCommand[] {
    if (!this.filterText) {
      return this.commands.map((command) => ({
        command,
        score: 0,
        matchIndices: [],
      }));
    }

    const scored: ScoredCommand[] = [];
    for (const command of this.commands) {
      const match = fuzzyMatch(command.label, this.filterText);
      if (match) {
        scored.push({
          command,
          score: match.score,
          matchIndices: match.indices,
        });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }
}
