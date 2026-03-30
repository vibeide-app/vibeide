import path from 'node:path';
import { SPAWNABLE_AGENT_TYPES, type AgentType } from '../../shared/agent-types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const ALLOWED_AGENT_TYPES = SPAWNABLE_AGENT_TYPES;
export const MAX_WRITE_BYTES = 65536;

export function validateSessionId(id: unknown): string {
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    throw new Error('Invalid session ID');
  }
  return id;
}

export function validateWriteRequest(raw: unknown): { sessionId: string; data: string } {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid request');
  const req = raw as Record<string, unknown>;
  const sessionId = validateSessionId(req.sessionId);
  if (typeof req.data !== 'string') throw new Error('Invalid data');
  if (req.data.length > MAX_WRITE_BYTES) throw new Error('Data exceeds maximum size');
  return { sessionId, data: req.data };
}

export function validateResizeRequest(raw: unknown): { sessionId: string; cols: number; rows: number } {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid request');
  const req = raw as Record<string, unknown>;
  const sessionId = validateSessionId(req.sessionId);
  if (typeof req.cols !== 'number' || typeof req.rows !== 'number') {
    throw new Error('Invalid dimensions');
  }
  if (req.cols < 1 || req.cols > 500 || req.rows < 1 || req.rows > 200) {
    throw new Error('Dimensions out of range');
  }
  const cols = Math.floor(req.cols);
  const rows = Math.floor(req.rows);
  return { sessionId, cols, rows };
}

export function validateKillRequest(raw: unknown): { sessionId: string } {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid request');
  const req = raw as Record<string, unknown>;
  return { sessionId: validateSessionId(req.sessionId) };
}

export function validateAgentSpawnRequest(raw: unknown): { type: AgentType; projectId: string; cwd?: string; label?: string; useWorktree?: boolean } {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid request');
  const req = raw as Record<string, unknown>;
  if (!ALLOWED_AGENT_TYPES.has(req.type as AgentType)) {
    throw new Error('Invalid agent type');
  }
  if (typeof req.projectId !== 'string' || !UUID_RE.test(req.projectId)) {
    throw new Error('Invalid projectId');
  }
  const result: { type: AgentType; projectId: string; cwd?: string; label?: string; useWorktree?: boolean } = {
    type: req.type as AgentType,
    projectId: req.projectId,
  };
  if (req.cwd !== undefined) {
    if (typeof req.cwd !== 'string') throw new Error('Invalid cwd');
    const resolved = path.resolve(req.cwd);
    const home = process.env.HOME || '/';
    if (!resolved.startsWith(home + path.sep) && resolved !== home) {
      throw new Error('cwd must be within home directory');
    }
    result.cwd = resolved;
  }
  if (req.label !== undefined) {
    if (typeof req.label !== 'string') throw new Error('Invalid label');
    result.label = req.label.slice(0, 100);
  }
  if (req.useWorktree !== undefined) {
    if (typeof req.useWorktree !== 'boolean') throw new Error('Invalid useWorktree');
    result.useWorktree = req.useWorktree;
  }
  return result;
}

export function validateAgentId(raw: unknown): string {
  if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
    throw new Error('Invalid agent ID');
  }
  return raw;
}

export function validateOptionalAgentId(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
    throw new Error('Invalid agent ID');
  }
  return raw;
}

export function validateProjectId(raw: unknown): string {
  if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
    throw new Error('Invalid project ID');
  }
  return raw;
}

export function validateProjectCreateRequest(raw: unknown): { path: string; name?: string } {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid request');
  const req = raw as Record<string, unknown>;
  if (typeof req.path !== 'string' || req.path.length === 0) {
    throw new Error('Invalid path');
  }
  const resolved = path.resolve(req.path);
  const result: { path: string; name?: string } = { path: resolved };
  if (req.name !== undefined) {
    if (typeof req.name !== 'string') throw new Error('Invalid name');
    result.name = req.name.slice(0, 100);
  }
  return result;
}

export function validateProjectUpdateRequest(raw: unknown): { id: string; name?: string; pinned?: boolean } {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid request');
  const req = raw as Record<string, unknown>;
  if (typeof req.id !== 'string' || !UUID_RE.test(req.id)) {
    throw new Error('Invalid project ID');
  }
  const result: { id: string; name?: string; pinned?: boolean } = { id: req.id };
  if (req.name !== undefined) {
    if (typeof req.name !== 'string') throw new Error('Invalid name');
    result.name = req.name.slice(0, 100);
  }
  if (req.pinned !== undefined) {
    if (typeof req.pinned !== 'boolean') throw new Error('Invalid pinned value');
    result.pinned = req.pinned;
  }
  return result;
}

export function validateProjectWorkspaceState(raw: unknown): { projectId: string; layout: unknown; agents: unknown[] } | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.projectId !== 'string' || !UUID_RE.test(s.projectId)) return null;
  if (!Array.isArray(s.agents)) return null;
  return { projectId: s.projectId, layout: s.layout ?? null, agents: s.agents };
}
