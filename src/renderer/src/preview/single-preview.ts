import { LayoutManager } from '../layout/layout-manager';
import { AgentStatusBar } from '../agent/agent-status-bar';
import type { LayoutNode, LeafNode, SplitNode } from '../../../shared/layout-types';
import type { PreviewAgent } from '../../../shared/preview-types';
import type { AgentInfo } from '../../../shared/agent-types';

type AgentLookup = () => ReadonlyArray<PreviewAgent>;
type TerminalCreateFn = (sessionId: string, container: HTMLElement) => void;
type FitAllFn = () => void;
type OnExitFn = () => void;

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
    const sessionIds = this.currentAgents.map((a) => a.agentInfo.sessionId);
    const tree = buildBalancedTree(sessionIds);
    this.layoutManager.restoreLayout(tree);
    this.layoutManager.equalizeAll();
    this.containerEl.style.display = '';
  }

  exit(): void {
    this.active = false;
    this.disposeStatusBars();
    // Let the workspace reattach terminals first (via onExit callback),
    // THEN clear the preview DOM — prevents terminal element orphaning
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
      this.containerEl.replaceChildren();
      this.layoutManager.reset();
      this.renderEmptyState();
      return;
    }

    this.clearEmptyState();
    const sessionIds = agents.map((a) => a.agentInfo.sessionId);
    const tree = buildBalancedTree(sessionIds);
    this.layoutManager.reset();
    this.layoutManager.restoreLayout(tree);
    this.layoutManager.equalizeAll();
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
    this.layoutManager.dispose();
    this.containerEl.remove();
  }
}

export function buildBalancedTree(sessionIds: readonly string[]): LayoutNode {
  if (sessionIds.length === 0) {
    throw new Error('Cannot build tree from empty session list');
  }
  return buildTreeRecursive(sessionIds, 0);
}

function buildTreeRecursive(
  sessionIds: readonly string[],
  depth: number,
): LayoutNode {
  if (sessionIds.length === 1) {
    const leaf: LeafNode = {
      type: 'leaf',
      id: crypto.randomUUID(),
      sessionId: sessionIds[0],
    };
    return leaf;
  }

  const mid = Math.ceil(sessionIds.length / 2);
  const left = buildTreeRecursive(sessionIds.slice(0, mid), depth + 1);
  const right = buildTreeRecursive(sessionIds.slice(mid), depth + 1);

  // Alternate direction: even depth = vertical (rows), odd depth = horizontal (columns)
  const direction = depth % 2 === 0 ? 'vertical' : 'horizontal';

  const split: SplitNode = {
    type: 'split',
    id: crypto.randomUUID(),
    direction,
    children: [left, right],
    ratio: mid / sessionIds.length,
  };
  return split;
}
