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

export function validateAgentSpawnRequest(raw: unknown): { type: AgentType; cwd?: string; label?: string } {
  if (typeof raw !== 'object' || raw === null) throw new Error('Invalid request');
  const req = raw as Record<string, unknown>;
  if (!ALLOWED_AGENT_TYPES.has(req.type as AgentType)) {
    throw new Error('Invalid agent type');
  }
  const result: { type: AgentType; cwd?: string; label?: string } = {
    type: req.type as AgentType,
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
