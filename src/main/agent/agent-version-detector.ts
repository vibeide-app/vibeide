import { execFile } from 'child_process';
import type { AgentType, AgentAvailability } from '../../shared/agent-types';

const CLI_COMMANDS: Partial<Record<AgentType, string>> = {
  claude: 'claude',
  gemini: 'gemini',
  codex: 'codex',
  aider: 'aider',
  opencode: 'opencode',
  cline: 'cline',
  copilot: 'copilot',
  amp: 'amp',
  continue: 'cn',
  cursor: 'cursor-agent',
  crush: 'crush',
  qwen: 'qwen',
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
  const [claude, gemini, codex, aider, opencode, cline, copilot, amp, cn, cursor, crush, qwen] = await Promise.all([
    checkCommand('claude'),
    checkCommand('gemini'),
    checkCommand('codex'),
    checkCommand('aider'),
    checkCommand('opencode'),
    checkCommand('cline'),
    checkCommand('copilot'),
    checkCommand('amp'),
    checkCommand('cn'),
    checkCommand('cursor-agent'),
    checkCommand('crush'),
    checkCommand('qwen'),
  ]);
  return { claude, gemini, codex, aider, opencode, cline, copilot, amp, continue: cn, cursor, crush, qwen };
}

export function startPeriodicCheck(
  callback: (availability: AgentAvailability) => void,
  intervalMs = 30_000,
): () => void {
  let previous: AgentAvailability = { claude: false, gemini: false, codex: false, aider: false, opencode: false, cline: false, copilot: false, amp: false, continue: false, cursor: false, crush: false, qwen: false };

  const check = async () => {
    const current = await checkAvailability();
    const changed = (Object.keys(current) as Array<keyof AgentAvailability>).some(
      (k) => current[k] !== previous[k],
    );
    if (changed) {
      previous = current;
      callback(current);
    }
  };

  // Initial check
  check();
  const timer = setInterval(check, intervalMs);
  return () => clearInterval(timer);
}
