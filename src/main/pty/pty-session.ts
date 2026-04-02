import * as pty from 'node-pty';
import { FRAME_COALESCE_MS } from '../../shared/constants';

const SAFE_ENV_KEYS = new Set([
  'PATH', 'HOME', 'USER', 'SHELL', 'TERM', 'LANG', 'LC_ALL',
  'LC_CTYPE', 'COLORTERM', 'TERM_PROGRAM', 'XDG_RUNTIME_DIR',
  'DISPLAY', 'WAYLAND_DISPLAY', 'DBUS_SESSION_BUS_ADDRESS',
  'NVM_DIR', 'NVM_BIN', 'NVM_INC', 'NODE_PATH',
  'CLAUDE_PLUGIN_ROOT',
  // Windows-critical: cmd.exe, PowerShell, and most CLIs need these
  'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'COMSPEC',
  'SystemRoot', 'SYSTEMDRIVE', 'TEMP', 'TMP',
  'HOMEDRIVE', 'HOMEPATH', 'USERNAME',
]);

function buildSafeEnv(
  agentType: string,
  overrides?: Readonly<Record<string, string>>,
): Record<string, string> {
  const env: Record<string, string> = { TERM: 'xterm-256color' };

  for (const key of SAFE_ENV_KEYS) {
    const val = process.env[key];
    if (val !== undefined) {
      env[key] = val;
    }
  }

  // Agent-specific API keys — only passed to the agent that needs them
  if (agentType === 'claude' && process.env.ANTHROPIC_API_KEY) {
    env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  }
  if (agentType === 'gemini' && process.env.GEMINI_API_KEY) {
    env.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  }
  if (agentType === 'codex' && process.env.OPENAI_API_KEY) {
    env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  }

  // Ensure common tool paths are available (Electron doesn't source .bashrc/.zshrc)
  const fs = require('node:fs');
  const nodePath = require('node:path');
  
  const isWin = process.platform === 'win32';
  const home = isWin
    ? (process.env.USERPROFILE || process.env.HOME || '')
    : (process.env.HOME || '');

  const extraPaths: string[] = [];

  if (isWin) {
    const appData = process.env.APPDATA || nodePath.join(home, 'AppData', 'Roaming');
    const localAppData = process.env.LOCALAPPDATA || nodePath.join(home, 'AppData', 'Local');
    extraPaths.push(
      nodePath.join(appData, 'npm'),
      nodePath.join(localAppData, 'Programs', 'Python', 'Python3*', 'Scripts'),
      nodePath.join(home, '.cargo', 'bin'),
      nodePath.join(localAppData, 'Microsoft', 'WinGet', 'Packages'),
      nodePath.join(home, 'scoop', 'shims'),
    );
  } else {
    // macOS: Homebrew paths (Apple Silicon + Intel) and generic unix
    extraPaths.push(
      '/opt/homebrew/bin',       // macOS Apple Silicon Homebrew
      '/opt/homebrew/sbin',
      '/usr/local/bin',          // macOS Intel Homebrew + standard tools
      '/usr/local/sbin',
      nodePath.join(home, '.local/bin'),  // pip install --user
      nodePath.join(home, '.cargo/bin'),  // Rust/cargo installs
    );
  }

  const pathSep = isWin ? ';' : ':';

  for (const p of extraPaths) {
    try {
      if (fs.existsSync(p) && env.PATH && !env.PATH.split(pathSep).includes(p)) {
        env.PATH = `${p}${pathSep}${env.PATH}`;
      }
    } catch { /* skip */ }
  }

  // NVM node path
  const nvmDir = process.env.NVM_DIR || nodePath.join(home, '.nvm');
  try {
    const versionsDir = nodePath.join(nvmDir, 'versions', 'node');
    if (fs.existsSync(versionsDir)) {
      const versions = fs.readdirSync(versionsDir).sort().reverse();
      if (versions.length > 0) {
        const nvmBin = nodePath.join(versionsDir, versions[0], 'bin');
        if (env.PATH && !env.PATH.includes(nvmBin)) {
          env.PATH = `${nvmBin}${pathSep}${env.PATH}`;
        }
      }
    }
  } catch {
    // NVM not installed — skip
  }

  if (overrides) {
    Object.assign(env, overrides);
  }

  return env;
}

export class PtySession {
  private readonly process: pty.IPty;
  private readonly _sessionId: string;
  private dataBuffer: string = '';
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private dataListeners: Array<(data: string) => void> = [];
  private exitListeners: Array<(exitCode: number) => void> = [];
  private disposed = false;

  constructor(
    sessionId: string,
    command: string,
    args: readonly string[],
    options: {
      readonly cwd: string;
      readonly cols: number;
      readonly rows: number;
      readonly env?: Readonly<Record<string, string>>;
      readonly agentType: string;
    },
  ) {
    this._sessionId = sessionId;

    this.process = pty.spawn(command, [...args], {
      name: 'xterm-256color',
      cols: options.cols,
      rows: options.rows,
      cwd: options.cwd,
      env: buildSafeEnv(options.agentType, options.env),
    });

    this.process.onData((data) => {
      this.dataBuffer += data;
    });

    this.flushInterval = setInterval(() => {
      if (this.dataBuffer.length > 0) {
        const data = this.dataBuffer;
        this.dataBuffer = '';
        for (const listener of this.dataListeners) {
          try {
            listener(data);
          } catch {
            // Never let a listener error crash the main process
          }
        }
      }
    }, FRAME_COALESCE_MS);

    this.process.onExit(({ exitCode }) => {
      for (const listener of this.exitListeners) {
        try {
          listener(exitCode);
        } catch {
          // Swallow listener errors
        }
      }
      this.dispose();
    });
  }

  getSessionId(): string {
    return this._sessionId;
  }

  getPid(): number {
    return this.process.pid;
  }

  write(data: string): void {
    if (this.disposed) return;
    this.process.write(data);
  }

  resize(cols: number, rows: number): void {
    if (this.disposed) return;
    this.process.resize(cols, rows);
  }

  kill(): void {
    if (this.disposed) return;
    this.process.kill();
  }

  onData(callback: (data: string) => void): () => void {
    this.dataListeners.push(callback);
    return () => {
      const index = this.dataListeners.indexOf(callback);
      if (index !== -1) {
        this.dataListeners.splice(index, 1);
      }
    };
  }

  onExit(callback: (exitCode: number) => void): () => void {
    this.exitListeners.push(callback);
    return () => {
      const index = this.exitListeners.indexOf(callback);
      if (index !== -1) {
        this.exitListeners.splice(index, 1);
      }
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (this.flushInterval !== null) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    if (this.dataBuffer.length > 0) {
      const data = this.dataBuffer;
      this.dataBuffer = '';
      for (const listener of this.dataListeners) {
        try {
          listener(data);
        } catch {
          // Swallow
        }
      }
    }

    this.dataListeners = [];
    this.exitListeners = [];

    try {
      this.process.kill();
    } catch {
      // Process may already be dead
    }
  }
}
