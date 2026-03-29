import { execFile } from 'child_process';
import type { AgentType, AgentAvailability } from '../../shared/agent-types';

const CLI_COMMANDS: Partial<Record<AgentType, string>> = {
  claude: 'claude',
  gemini: 'gemini',
  codex: 'codex',
};

const VERSION_TIMEOUT_MS = 5000;
const WHICH_TIMEOUT_MS = 3000;

export function detectVersion(type: AgentType): Promise<string | null> {
  const cmd = CLI_COMMANDS[type];
  if (!cmd) return Promise.resolve(null);

  return new Promise((resolve) => {
    execFile(cmd, ['--version'], { timeout: VERSION_TIMEOUT_MS }, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      const firstLine = stdout.trim().split('\n')[0] ?? '';
      // Extract version number pattern (e.g., "1.2.3" or "v1.2.3")
      const match = firstLine.match(/v?(\d+\.\d+[\d.]*)/);
      resolve(match ? match[1] : firstLine.slice(0, 50) || null);
    });
  });
}

function checkCommand(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile('which', [cmd], { timeout: WHICH_TIMEOUT_MS }, (err) => {
      resolve(!err);
    });
  });
}

export async function checkAvailability(): Promise<AgentAvailability> {
  const [claude, gemini, codex] = await Promise.all([
    checkCommand('claude'),
    checkCommand('gemini'),
    checkCommand('codex'),
  ]);
  return { claude, gemini, codex };
}

export function startPeriodicCheck(
  callback: (availability: AgentAvailability) => void,
  intervalMs = 30_000,
): () => void {
  let previous: AgentAvailability = { claude: false, gemini: false, codex: false };

  const check = async () => {
    const current = await checkAvailability();
    if (
      current.claude !== previous.claude ||
      current.gemini !== previous.gemini ||
      current.codex !== previous.codex
    ) {
      previous = current;
      callback(current);
    }
  };

  // Initial check
  check();
  const timer = setInterval(check, intervalMs);
  return () => clearInterval(timer);
}
