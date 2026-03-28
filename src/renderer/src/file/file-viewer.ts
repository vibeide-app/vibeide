import type { FileEntry, FileContent } from '../../../shared/ipc-types';

const LANGUAGE_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
  py: 'python', rb: 'ruby', rs: 'rust', go: 'go', java: 'java',
  c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
  css: 'css', scss: 'css', html: 'html', xml: 'xml',
  json: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml',
  md: 'markdown', sh: 'shell', bash: 'shell', zsh: 'shell',
  sql: 'sql', graphql: 'graphql', dockerfile: 'dockerfile',
};

function getLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  return LANGUAGE_MAP[ext] ?? 'text';
}

interface FileTreeNode {
  readonly entry: FileEntry;
  expanded: boolean;
  children: FileTreeNode[] | null;
  depth: number;
}

export class FileViewer {
  private readonly overlay: HTMLElement;
  private readonly treeContainer: HTMLElement;
  private readonly contentContainer: HTMLElement;
  private readonly breadcrumb: HTMLElement;
  private rootPath: string = '';
  private treeNodes: FileTreeNode[] = [];
  private visible = false;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'file-viewer-overlay';
    this.overlay.style.display = 'none';

    const panel = document.createElement('div');
    panel.className = 'file-viewer-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'file-viewer-header';

    const title = document.createElement('span');
    title.className = 'file-viewer-title';
    title.textContent = 'Files';

    this.breadcrumb = document.createElement('span');
    this.breadcrumb.className = 'file-viewer-breadcrumb';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'file-viewer-close';
    closeBtn.textContent = '\u00D7';
    closeBtn.addEventListener('click', () => this.hide());

    header.appendChild(title);
    header.appendChild(this.breadcrumb);
    header.appendChild(closeBtn);

    // Body
    const body = document.createElement('div');
    body.className = 'file-viewer-body';

    this.treeContainer = document.createElement('div');
    this.treeContainer.className = 'file-tree';

    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'file-content';
    this.contentContainer.textContent = 'Select a file to view';

    body.appendChild(this.treeContainer);
    body.appendChild(this.contentContainer);

    panel.appendChild(header);
    panel.appendChild(body);
    this.overlay.appendChild(panel);

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    // Close on Escape
    this.overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });

    document.body.appendChild(this.overlay);
  }

  isVisible(): boolean {
    return this.visible;
  }

  toggle(rootPath: string): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show(rootPath);
    }
  }

  async show(rootPath: string): Promise<void> {
    this.rootPath = rootPath;
    this.visible = true;
    this.overlay.style.display = '';
    this.contentContainer.textContent = 'Select a file to view';
    this.breadcrumb.textContent = '';
    await this.loadTree(rootPath);
  }

  hide(): void {
    this.visible = false;
    this.overlay.style.display = 'none';
  }

  private async loadTree(dirPath: string): Promise<void> {
    try {
      const entries: FileEntry[] = await window.api.file.listDir(dirPath);
      if ('error' in (entries as unknown as Record<string, unknown>)) {
        this.treeContainer.textContent = 'Failed to load directory';
        return;
      }
      this.treeNodes = entries.map((entry) => ({
        entry,
        expanded: false,
        children: null,
        depth: 0,
      }));
      this.renderTree();
    } catch (error) {
      this.treeContainer.textContent = 'Failed to load directory';
    }
  }

  private renderTree(): void {
    this.treeContainer.replaceChildren();
    this.renderNodes(this.treeNodes, this.treeContainer);
  }

  private renderNodes(nodes: FileTreeNode[], container: HTMLElement): void {
    for (const node of nodes) {
      const row = document.createElement('div');
      row.className = 'file-tree-row';
      row.style.paddingLeft = `${12 + node.depth * 16}px`;

      if (node.entry.isDirectory) {
        const arrow = document.createElement('span');
        arrow.className = 'file-tree-arrow';
        arrow.textContent = node.expanded ? '\u25BE' : '\u25B8';
        row.appendChild(arrow);

        const icon = document.createElement('span');
        icon.className = 'file-tree-icon dir';
        icon.textContent = node.expanded ? '\u{1F4C2}' : '\u{1F4C1}';
        row.appendChild(icon);
      } else {
        const spacer = document.createElement('span');
        spacer.className = 'file-tree-arrow';
        spacer.textContent = ' ';
        row.appendChild(spacer);

        const icon = document.createElement('span');
        icon.className = 'file-tree-icon file';
        icon.textContent = '\u{1F4C4}';
        row.appendChild(icon);
      }

      const label = document.createElement('span');
      label.className = 'file-tree-label';
      label.textContent = node.entry.name;
      row.appendChild(label);

      row.addEventListener('click', () => {
        if (node.entry.isDirectory) {
          this.toggleDirectory(node);
        } else {
          this.openFile(node.entry.path);
        }
      });

      container.appendChild(row);

      // Render children if expanded
      if (node.expanded && node.children) {
        this.renderNodes(node.children, container);
      }
    }
  }

  private async toggleDirectory(node: FileTreeNode): Promise<void> {
    if (node.expanded) {
      node.expanded = false;
      this.renderTree();
      return;
    }

    // Load children if not yet loaded
    if (!node.children) {
      try {
        const entries: FileEntry[] = await window.api.file.listDir(node.entry.path);
        if ('error' in (entries as unknown as Record<string, unknown>)) {
          return;
        }
        node.children = entries.map((entry) => ({
          entry,
          expanded: false,
          children: null,
          depth: node.depth + 1,
        }));
      } catch {
        return;
      }
    }

    node.expanded = true;
    this.renderTree();
  }

  private async openFile(filePath: string): Promise<void> {
    try {
      const result: FileContent = await window.api.file.read(filePath);
      if ('error' in (result as unknown as Record<string, unknown>)) {
        this.contentContainer.textContent = 'Failed to read file';
        return;
      }

      // Update breadcrumb
      const relativePath = filePath.startsWith(this.rootPath)
        ? filePath.slice(this.rootPath.length + 1)
        : filePath;
      this.breadcrumb.textContent = relativePath;

      // Render content with line numbers
      this.contentContainer.replaceChildren();

      const pre = document.createElement('pre');
      pre.className = `file-content-pre language-${getLanguage(filePath)}`;

      const lines = result.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const lineEl = document.createElement('div');
        lineEl.className = 'file-line';

        const lineNum = document.createElement('span');
        lineNum.className = 'file-line-number';
        lineNum.textContent = String(i + 1);

        const lineContent = document.createElement('span');
        lineContent.className = 'file-line-content';
        lineContent.textContent = lines[i];

        lineEl.appendChild(lineNum);
        lineEl.appendChild(lineContent);
        pre.appendChild(lineEl);
      }

      if (result.truncated) {
        const notice = document.createElement('div');
        notice.className = 'file-truncated-notice';
        notice.textContent = 'File truncated (>512 KB)';
        pre.appendChild(notice);
      }

      this.contentContainer.appendChild(pre);
    } catch (error) {
      this.contentContainer.textContent = 'Failed to read file';
    }
  }

  dispose(): void {
    this.overlay.remove();
  }
}
