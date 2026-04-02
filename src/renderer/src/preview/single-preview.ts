import { LayoutManager } from '../layout/layout-manager';
import { AgentStatusBar } from '../agent/agent-status-bar';
import type { LayoutNode, LeafNode, SplitNode } from '../../../shared/layout-types';
import type { PreviewAgent } from '../../../shared/preview-types';
import type { AgentInfo } from '../../../shared/agent-types';

type AgentLookup = () => ReadonlyArray<PreviewAgent>;
type TerminalCreateFn = (sessionId: string, container: HTMLElement) => void;
type FitAllFn = () => void;
type OnExitFn = () => void;

export interface GridLayout {
  readonly rows: number;
  readonly cols: number;
  readonly label: string;
}

export class SinglePreview {
  readonly containerEl: HTMLElement;
  private readonly layoutManager: LayoutManager;
  private readonly getPreviewAgents: AgentLookup;
  private readonly createTerminal: TerminalCreateFn;
  private readonly fitAll: FitAllFn;
  private active = false;
  private currentAgents: ReadonlyArray<PreviewAgent> = [];
  private statusBars: AgentStatusBar[] = [];
  private onExit: OnExitFn = () => {};
  private currentGrid: GridLayout | null = null;
  private gridPickerEl: HTMLElement | null = null;
  private gridDropdownEl: HTMLElement | null = null;
  private dropdownAbort: AbortController | null = null;

  constructor(
    createTerminal: TerminalCreateFn,
    fitAll: FitAllFn,
    getPreviewAgents: AgentLookup,
  ) {
    this.createTerminal = createTerminal;
    this.fitAll = fitAll;
    this.getPreviewAgents = getPreviewAgents;

    this.containerEl = document.createElement('div');
    this.containerEl.className = 'terminal-area single-preview';
    this.containerEl.style.display = 'none';
    this.containerEl.setAttribute('aria-label', 'Single Preview — all active agents');

    this.layoutManager = new LayoutManager(
      this.containerEl,
      (sessionId, container) => {
        const agent = this.currentAgents.find(
          (a) => a.agentInfo.sessionId === sessionId,
        );
        if (agent) {
          const existingBar = container.querySelector('.agent-status-bar');
          if (!existingBar) {
            const statusBar = new AgentStatusBar(agent.agentInfo, {
              projectName: agent.projectName,
              previewMode: true,
            });
            this.statusBars.push(statusBar);
            container.prepend(statusBar.getElement());
          }
        }
        let termWrapper = container.querySelector('.terminal-wrapper') as HTMLElement | null;
        if (!termWrapper) {
          termWrapper = document.createElement('div');
          termWrapper.className = 'terminal-wrapper';
          container.appendChild(termWrapper);
        }
        this.createTerminal(sessionId, termWrapper);
      },
      () => {
        // onTerminalRemove — no-op in preview, we don't own the terminals
      },
    );
    this.layoutManager.setFitAllCallback(() => this.fitAll());
  }

  setOnExit(fn: OnExitFn): void {
    this.onExit = fn;
  }

  isActive(): boolean {
    return this.active;
  }

  enter(): void {
    this.active = true;
    this.currentAgents = this.getPreviewAgents();

    if (this.currentAgents.length === 0) {
      this.renderEmptyState();
      this.containerEl.style.display = '';
      return;
    }

    this.clearEmptyState();
    const count = this.currentAgents.length;
    if (!this.currentGrid || !isValidGrid(this.currentGrid, count)) {
      this.currentGrid = getDefaultGrid(count);
    }
    this.applyGrid();
    this.renderGridPicker();
    this.containerEl.style.display = '';
  }

  exit(): void {
    this.active = false;
    this.disposeStatusBars();
    this.removeGridPicker();
    this.onExit();
    this.containerEl.style.display = 'none';
    this.containerEl.replaceChildren();
    this.layoutManager.reset();
    this.currentAgents = [];
  }

  refresh(): void {
    if (!this.active) return;
    this.disposeStatusBars();
    const agents = this.getPreviewAgents();
    this.currentAgents = agents;

    if (agents.length === 0) {
      this.removeGridPicker();
      this.containerEl.replaceChildren();
      this.layoutManager.reset();
      this.renderEmptyState();
      return;
    }

    this.clearEmptyState();
    const count = agents.length;
    if (!this.currentGrid || !isValidGrid(this.currentGrid, count)) {
      this.currentGrid = getDefaultGrid(count);
    }
    this.layoutManager.reset();
    this.applyGrid();
    this.renderGridPicker();
  }

  private applyGrid(): void {
    const sessionIds = this.currentAgents.map((a) => a.agentInfo.sessionId);
    const grid = this.currentGrid ?? getDefaultGrid(sessionIds.length);
    const tree = buildGridTree(sessionIds, grid.rows);
    // restoreLayout calls render(); equalizeAll recalculates ratios and renders again.
    // Since equalizeAll is called immediately, the first render is overwritten in
    // the same synchronous block before the browser paints.
    this.layoutManager.restoreLayout(tree);
    this.layoutManager.equalizeAll();
  }

  private renderGridPicker(): void {
    this.removeGridPicker();
    const count = this.currentAgents.length;
    if (count <= 1) return;

    const options = getGridOptions(count);
    if (options.length <= 1) return;

    this.gridPickerEl = document.createElement('div');
    this.gridPickerEl.className = 'preview-grid-picker';

    const btn = document.createElement('button');
    btn.className = 'preview-grid-btn';
    btn.title = 'Change grid layout';
    btn.setAttribute('aria-label', 'Change grid layout');
    const current = this.currentGrid ?? getDefaultGrid(count);
    btn.textContent = `${current.rows}\u00d7${current.cols}`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleGridDropdown(options);
    });

    this.gridPickerEl.appendChild(btn);
    this.containerEl.appendChild(this.gridPickerEl);
  }

  private toggleGridDropdown(options: readonly GridLayout[]): void {
    if (this.gridDropdownEl) {
      this.closeDropdown();
      return;
    }

    this.gridDropdownEl = document.createElement('div');
    this.gridDropdownEl.className = 'preview-grid-dropdown';

    for (const opt of options) {
      const item = document.createElement('button');
      item.className = 'preview-grid-option';
      if (this.currentGrid && opt.rows === this.currentGrid.rows && opt.cols === this.currentGrid.cols) {
        item.classList.add('active');
      }
      item.textContent = opt.label;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.currentGrid = opt;
        this.disposeStatusBars();
        this.layoutManager.reset();
        this.applyGrid();
        this.closeDropdown();
        this.renderGridPicker();
      });
      this.gridDropdownEl.appendChild(item);
    }

    this.gridPickerEl?.appendChild(this.gridDropdownEl);

    // Close on outside click — use AbortController for reliable cleanup
    this.dropdownAbort = new AbortController();
    const signal = this.dropdownAbort.signal;
    setTimeout(() => {
      if (signal.aborted) return;
      document.addEventListener('click', (e: MouseEvent) => {
        if (!this.gridPickerEl?.contains(e.target as Node)) {
          this.closeDropdown();
        }
      }, { signal });
    }, 0);
  }

  private closeDropdown(): void {
    this.dropdownAbort?.abort();
    this.dropdownAbort = null;
    this.gridDropdownEl?.remove();
    this.gridDropdownEl = null;
  }

  private removeGridPicker(): void {
    this.closeDropdown();
    this.gridPickerEl?.remove();
    this.gridPickerEl = null;
  }

  private disposeStatusBars(): void {
    for (const bar of this.statusBars) {
      bar.dispose();
    }
    this.statusBars = [];
  }

  private renderEmptyState(): void {
    this.containerEl.replaceChildren();
    const empty = document.createElement('div');
    empty.className = 'single-preview-empty';
    empty.innerHTML = `
      <div class="single-preview-empty-content">
        <div class="single-preview-empty-icon">\u229E</div>
        <div class="single-preview-empty-label">No active agents across projects</div>
      </div>
    `;
    this.containerEl.appendChild(empty);
  }

  private clearEmptyState(): void {
    const empty = this.containerEl.querySelector('.single-preview-empty');
    if (empty) empty.remove();
  }

  dispose(): void {
    this.disposeStatusBars();
    this.removeGridPicker();
    this.layoutManager.dispose();
    this.containerEl.remove();
  }
}

// --- Grid layout utilities ---

export function getDefaultGrid(count: number): GridLayout {
  if (count <= 1) return { rows: 1, cols: 1, label: '1\u00d71' };
  if (count === 2) return { rows: 1, cols: 2, label: '1\u00d72' };
  if (count === 3) return { rows: 1, cols: 3, label: '1\u00d73' };
  // For 4+, pick the most square-ish layout, preferring wider
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { rows, cols, label: `${rows}\u00d7${cols}` };
}

export function getGridOptions(count: number): readonly GridLayout[] {
  if (count <= 1) return [{ rows: 1, cols: 1, label: '1\u00d71' }];

  const options: GridLayout[] = [];
  for (let rows = 1; rows <= count; rows++) {
    const cols = Math.ceil(count / rows);
    // Skip if too many empty cells (more than 1 row of empties)
    if (rows * cols - count >= cols) continue;
    // Skip extreme 1xN or Nx1 shapes beyond 3 agents
    if (count > 3 && (rows === 1 || cols === 1)) continue;
    // Avoid duplicates
    if (!options.some((o) => o.rows === rows && o.cols === cols)) {
      options.push({ rows, cols, label: `${rows}\u00d7${cols}` });
    }
  }
  return options;
}

function isValidGrid(grid: GridLayout, count: number): boolean {
  return grid.rows * grid.cols >= count && grid.rows <= count;
}

export function buildGridTree(
  sessionIds: readonly string[],
  rows: number,
): LayoutNode {
  if (sessionIds.length === 0) {
    throw new Error('Cannot build tree from empty session list');
  }
  if (sessionIds.length === 1) {
    return makeLeaf(sessionIds[0]);
  }

  // Distribute sessions into rows with unequal column counts
  const rowGroups: string[][] = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    const remaining = sessionIds.length - idx;
    const remainingRows = rows - r;
    const rowSize = Math.ceil(remaining / remainingRows);
    rowGroups.push(sessionIds.slice(idx, idx + rowSize));
    idx += rowSize;
  }

  // Build each row as a horizontal split chain
  const rowNodes: LayoutNode[] = rowGroups
    .filter((g) => g.length > 0)
    .map((group) => buildRowTree(group));

  // Combine rows vertically
  return combineNodes(rowNodes, 'vertical');
}

function buildRowTree(sessionIds: string[]): LayoutNode {
  if (sessionIds.length === 1) return makeLeaf(sessionIds[0]);
  const nodes = sessionIds.map((id) => makeLeaf(id));
  return combineNodes(nodes, 'horizontal');
}

function combineNodes(nodes: LayoutNode[], direction: 'horizontal' | 'vertical'): LayoutNode {
  if (nodes.length === 1) return nodes[0];
  if (nodes.length === 2) {
    return makeSplit(direction, nodes[0], nodes[1], 0.5);
  }
  // For 3+ nodes, split at midpoint with ratio based on leaf counts
  const mid = Math.ceil(nodes.length / 2);
  const left = combineNodes(nodes.slice(0, mid), direction);
  const right = combineNodes(nodes.slice(mid), direction);
  const leftLeaves = countLeaves(left);
  const rightLeaves = countLeaves(right);
  const ratio = leftLeaves / (leftLeaves + rightLeaves);
  return makeSplit(direction, left, right, ratio);
}

function countLeaves(node: LayoutNode): number {
  if (node.type === 'leaf') return 1;
  return countLeaves(node.children[0]) + countLeaves(node.children[1]);
}

function makeLeaf(sessionId: string): LeafNode {
  return { type: 'leaf', id: crypto.randomUUID(), sessionId };
}

function makeSplit(
  direction: 'horizontal' | 'vertical',
  left: LayoutNode,
  right: LayoutNode,
  ratio: number,
): SplitNode {
  return {
    type: 'split',
    id: crypto.randomUUID(),
    direction,
    children: [left, right],
    ratio,
  };
}

// Keep for backwards compatibility with tests
export function buildBalancedTree(sessionIds: readonly string[]): LayoutNode {
  const grid = getDefaultGrid(sessionIds.length);
  return buildGridTree(sessionIds, grid.rows);
}
