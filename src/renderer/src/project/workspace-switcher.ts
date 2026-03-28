import { ProjectWorkspace } from './project-workspace';
import type { ProjectInfo } from '../../../shared/ipc-types';
import type { AgentType } from '../../../shared/agent-types';

export type WorkspaceChangeCallback = (projectId: string | null) => void;

export class WorkspaceSwitcher {
  private readonly workspaceHost: HTMLElement;
  private readonly workspaces = new Map<string, ProjectWorkspace>();
  private activeProjectId: string | null = null;
  private readonly onWorkspaceChange: WorkspaceChangeCallback;

  constructor(workspaceHost: HTMLElement, onWorkspaceChange: WorkspaceChangeCallback) {
    this.workspaceHost = workspaceHost;
    this.onWorkspaceChange = onWorkspaceChange;
  }

  getActiveProjectId(): string | null {
    return this.activeProjectId;
  }

  getActiveWorkspace(): ProjectWorkspace | null {
    if (!this.activeProjectId) return null;
    return this.workspaces.get(this.activeProjectId) ?? null;
  }

  getWorkspace(projectId: string): ProjectWorkspace | undefined {
    return this.workspaces.get(projectId);
  }

  getAllWorkspaces(): ProjectWorkspace[] {
    return Array.from(this.workspaces.values());
  }

  async switchTo(project: ProjectInfo): Promise<ProjectWorkspace> {
    // Deactivate current workspace
    if (this.activeProjectId) {
      const current = this.workspaces.get(this.activeProjectId);
      if (current) {
        await current.saveState();
        current.deactivate();
      }
    }

    // Get or create workspace
    let workspace = this.workspaces.get(project.id);
    if (!workspace) {
      workspace = new ProjectWorkspace(project.id, project.path);
      this.workspaceHost.appendChild(workspace.containerEl);
      this.workspaces.set(project.id, workspace);

      // Try to restore saved state, otherwise spawn a default shell
      const restored = await workspace.restoreState();
      if (!restored) {
        await workspace.spawnAgent('shell');
      }
    }

    workspace.activate();
    this.activeProjectId = project.id;
    this.onWorkspaceChange(project.id);

    // Touch project's lastActiveAt
    try {
      await window.api.project.update({ id: project.id });
    } catch {
      // Non-critical
    }

    return workspace;
  }

  async closeWorkspace(projectId: string): Promise<void> {
    const workspace = this.workspaces.get(projectId);
    if (!workspace) return;

    await workspace.saveState();
    workspace.dispose();
    this.workspaces.delete(projectId);

    if (this.activeProjectId === projectId) {
      // Auto-switch to the next open workspace, or null
      const remaining = Array.from(this.workspaces.keys());
      if (remaining.length > 0) {
        const nextId = remaining[0];
        const nextWorkspace = this.workspaces.get(nextId);
        if (nextWorkspace) {
          nextWorkspace.activate();
          this.activeProjectId = nextId;
          this.onWorkspaceChange(nextId);
          return;
        }
      }
      this.activeProjectId = null;
      this.onWorkspaceChange(null);
    }
  }

  handleAgentStatus(agentId: string, status: string): void {
    for (const workspace of this.workspaces.values()) {
      if (workspace.hasAgent(agentId)) {
        workspace.handleAgentStatus(agentId, status as 'running' | 'stopped' | 'error' | 'starting');
        return;
      }
    }
  }

  handleAgentExit(agentId: string, exitCode: number): void {
    for (const workspace of this.workspaces.values()) {
      if (workspace.hasAgent(agentId)) {
        workspace.handleAgentExit(agentId, exitCode);
        return;
      }
    }
  }

  async saveAllStates(): Promise<void> {
    const promises = Array.from(this.workspaces.values()).map((ws) => ws.saveState());
    await Promise.allSettled(promises);
  }

  setThemeAll(name: string): void {
    for (const workspace of this.workspaces.values()) {
      workspace.setThemeAll(name);
    }
  }

  disposeAll(): void {
    for (const workspace of this.workspaces.values()) {
      workspace.dispose();
    }
    this.workspaces.clear();
    this.activeProjectId = null;
  }
}
