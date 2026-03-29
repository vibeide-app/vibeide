import type { FileSearchResult } from '../../../shared/ipc-types';

export type SearchOpenCallback = (filePath: string, lineNumber: number) => void;

export class FileSearch {
  private overlay: HTMLElement | null = null;
  private visible = false;
  private projectPath = '';
  private readonly onOpen: SearchOpenCallback;
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(onOpen: SearchOpenCallback) {
    this.onOpen = onOpen;
  }

  isVisible(): boolean { return this.visible; }

  async toggle(projectPath: string): Promise<void> {
    if (this.visible) this.hide();
    else this.show(projectPath);
  }

  show(projectPath: string): void {
    if (this.visible) return;
    this.projectPath = projectPath;
    this.visible = true;
    this.renderOverlay();
  }

  hide(): void {
    if (!this.visible) return;
    this.visible = false;
    if (this.overlay) { this.overlay.remove(); this.overlay = null; }
    if (this.searchTimer) { clearTimeout(this.searchTimer); this.searchTimer = null; }
  }

  private renderOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'fsearch-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    const panel = document.createElement('div');
    panel.className = 'fsearch-panel';

    const input = document.createElement('input');
    input.className = 'fsearch-input';
    input.placeholder = 'Search across files...';
    input.addEventListener('input', () => {
      if (this.searchTimer) clearTimeout(this.searchTimer);
      this.searchTimer = setTimeout(() => this.doSearch(input.value, resultsEl), 300);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const items = resultsEl.querySelectorAll('.fsearch-result');
        const selected = resultsEl.querySelector('.fsearch-result.selected');
        const idx = selected ? Array.from(items).indexOf(selected) : -1;
        const next = items[idx + 1] as HTMLElement;
        if (next) { selected?.classList.remove('selected'); next.classList.add('selected'); next.scrollIntoView({ block: 'nearest' }); }
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const items = resultsEl.querySelectorAll('.fsearch-result');
        const selected = resultsEl.querySelector('.fsearch-result.selected');
        const idx = selected ? Array.from(items).indexOf(selected) : items.length;
        const prev = items[idx - 1] as HTMLElement;
        if (prev) { selected?.classList.remove('selected'); prev.classList.add('selected'); prev.scrollIntoView({ block: 'nearest' }); }
      }
      if (e.key === 'Enter') {
        const selected = resultsEl.querySelector('.fsearch-result.selected') as HTMLElement;
        if (selected) selected.click();
      }
    });

    const resultsEl = document.createElement('div');
    resultsEl.className = 'fsearch-results';

    panel.appendChild(input);
    panel.appendChild(resultsEl);
    this.overlay.appendChild(panel);
    document.body.appendChild(this.overlay);
    input.focus();
  }

  private async doSearch(query: string, container: HTMLElement): Promise<void> {
    container.replaceChildren();
    if (!query.trim()) return;

    const loading = document.createElement('div');
    loading.className = 'fsearch-loading';
    loading.textContent = 'Searching...';
    container.appendChild(loading);

    try {
      const results: FileSearchResult[] = await window.api.file.search({
        projectPath: this.projectPath,
        query: query.trim(),
        maxResults: 100,
      });

      container.replaceChildren();

      if (results.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'fsearch-empty';
        empty.textContent = 'No results found';
        container.appendChild(empty);
        return;
      }

      const count = document.createElement('div');
      count.className = 'fsearch-count';
      count.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
      container.appendChild(count);

      // Group by file
      const grouped = new Map<string, FileSearchResult[]>();
      for (const r of results) {
        if (!grouped.has(r.filePath)) grouped.set(r.filePath, []);
        grouped.get(r.filePath)!.push(r);
      }

      let isFirst = true;
      for (const [filePath, fileResults] of grouped) {
        const fileHeader = document.createElement('div');
        fileHeader.className = 'fsearch-file-header';
        fileHeader.textContent = filePath;

        const badge = document.createElement('span');
        badge.className = 'fsearch-file-count';
        badge.textContent = String(fileResults.length);
        fileHeader.appendChild(badge);

        container.appendChild(fileHeader);

        for (const result of fileResults) {
          const row = document.createElement('div');
          row.className = `fsearch-result${isFirst ? ' selected' : ''}`;
          isFirst = false;

          const lineNum = document.createElement('span');
          lineNum.className = 'fsearch-line-num';
          lineNum.textContent = String(result.lineNumber);

          const content = document.createElement('span');
          content.className = 'fsearch-line-content';
          content.textContent = result.lineContent;

          row.appendChild(lineNum);
          row.appendChild(content);

          row.addEventListener('click', () => {
            this.hide();
            const fullPath = this.projectPath + '/' + result.filePath;
            this.onOpen(fullPath, result.lineNumber);
          });

          row.addEventListener('mouseenter', () => {
            container.querySelectorAll('.fsearch-result').forEach((r) => r.classList.remove('selected'));
            row.classList.add('selected');
          });

          container.appendChild(row);
        }
      }
    } catch {
      container.replaceChildren();
      const err = document.createElement('div');
      err.className = 'fsearch-empty';
      err.textContent = 'Search failed';
      container.appendChild(err);
    }
  }
}
