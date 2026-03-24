import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import type { AppState } from '../../shared/ipc-types';
import type { AgentManager } from '../agent/agent-manager';
import type { PtyManager } from '../pty/pty-manager';
import type { StateManager } from '../state/state-manager';
import {
  validateSessionId,
  validateWriteRequest,
  validateResizeRequest,
  validateKillRequest,
  validateAgentSpawnRequest,
  validateAgentId,
  validateOptionalAgentId,
} from './validators';

const MAX_AGENTS = 20;

export function registerIpcHandlers(
  agentManager: AgentManager,
  ptyManager: PtyManager,
  stateManager: StateManager,
): void {
  ipcMain.handle(IPC_CHANNELS.PTY_WRITE, (_event, raw: unknown) => {
    try {
      const request = validateWriteRequest(raw);
      ptyManager.write(request.sessionId, request.data);
    } catch (error) {
      console.error('[IPC][pty:write]', error);
      return { error: 'pty_write_failed' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PTY_RESIZE, (_event, raw: unknown) => {
    try {
      const request = validateResizeRequest(raw);
      ptyManager.resize(request.sessionId, request.cols, request.rows);
    } catch (error) {
      console.error('[IPC][pty:resize]', error);
      return { error: 'pty_resize_failed' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PTY_KILL, (_event, raw: unknown) => {
    try {
      const request = validateKillRequest(raw);
      ptyManager.kill(request.sessionId);
    } catch (error) {
      console.error('[IPC][pty:kill]', error);
      return { error: 'pty_kill_failed' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_SPAWN, (_event, raw: unknown) => {
    try {
      if (agentManager.listAgents().length >= MAX_AGENTS) {
        return { error: 'max_agents_reached' };
      }
      const request = validateAgentSpawnRequest(raw);
      return agentManager.spawnAgent(request);
    } catch (error) {
      console.error('[IPC][agent:spawn]', error);
      return { error: 'agent_spawn_failed' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_KILL, (_event, raw: unknown) => {
    try {
      const agentId = validateAgentId(raw);
      agentManager.killAgent(agentId);
    } catch (error) {
      console.error('[IPC][agent:kill]', error);
      return { error: 'agent_kill_failed' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.AGENT_LIST, () => {
    try {
      return agentManager.listAgents();
    } catch (error) {
      console.error('[IPC][agent:list]', error);
      return { error: 'agent_list_failed' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_LIST, async (_event, raw: unknown) => {
    try {
      const agentId = validateOptionalAgentId(raw);
      return await agentManager.getRecorder().getRecordings(agentId);
    } catch (error) {
      console.error('[IPC][session:list]', error);
      return { error: 'session_list_failed' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SESSION_GET, async (_event, raw: unknown) => {
    try {
      const agentId = validateAgentId(raw);
      const recordings = await agentManager.getRecorder().getRecordings(agentId);
      return recordings;
    } catch (error) {
      console.error('[IPC][session:get]', error);
      return { error: 'session_get_failed' };
    }
  });

  ipcMain.handle(IPC_CHANNELS.STATE_LOAD, () => {
    try {
      return stateManager.loadState();
    } catch (error) {
      console.error('[IPC][state:load]', error);
      return null;
    }
  });

  ipcMain.handle(IPC_CHANNELS.STATE_SAVE, (_event, raw: unknown) => {
    try {
      const validated = stateManager.validateAndParse(raw);
      if (!validated) {
        return { error: 'invalid_state' };
      }
      stateManager.saveState(validated);
    } catch (error) {
      console.error('[IPC][state:save]', error);
      return { error: 'state_save_failed' };
    }
  });
}
