// Patterns that indicate an agent is waiting for user input.
// These are checked against the last few lines of terminal output.

// Strip ANSI escape sequences for clean matching
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '');
}

// Patterns that strongly indicate a prompt waiting for input
const INPUT_PATTERNS: readonly RegExp[] = [
  // Yes/No prompts
  /\[Y\/n\]\s*$/i,
  /\[y\/N\]\s*$/i,
  /\(y\/n\)\s*[?:]?\s*$/i,
  /\(yes\/no\)\s*[?:]?\s*$/i,
  /\byesno\b.*[?:]\s*$/i,

  // Proceed/continue prompts
  /\bproceed\b.*[?]\s*$/i,
  /\bcontinue\b.*[?]\s*$/i,
  /\bconfirm\b.*[?]\s*$/i,

  // Generic question prompts ending with ? or :
  /\bdo you want\b.*[?]\s*$/i,
  /\bwould you like\b.*[?]\s*$/i,
  /\bshould I\b.*[?]\s*$/i,
  /\bready to\b.*[?]\s*$/i,

  // Common tool prompts
  /\benter\b.*:\s*$/i,
  /\bpassword\b.*:\s*$/i,
  /\btype\b.*to continue/i,
  /\bpress\b.*to continue/i,
  /\bpress enter\b/i,

  // Claude Code specific
  /\bDo you want to proceed\b/i,
  /\bApprove\b.*[?]\s*$/i,
  /\bAllow\b.*[?]\s*$/i,

  // npm/yarn/package manager
  /\bIs this OK\b/i,
  /\bOk to proceed\b/i,

  // Git prompts
  /\bAbort\b.*[?]\s*$/i,
  /\boverwrite\b.*[?]\s*$/i,
];

// Patterns to exclude — output that looks like a prompt but isn't
const EXCLUDE_PATTERNS: readonly RegExp[] = [
  // Loading/progress indicators
  /^\s*\d+%/,
  /^\s*[.]+\s*$/,
  /downloading/i,
  /compiling/i,
  /building/i,
];

export function detectNeedsInput(recentOutput: string): boolean {
  const cleaned = stripAnsi(recentOutput);

  // Get the last non-empty line
  const lines = cleaned.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return false;

  const lastLine = lines[lines.length - 1].trim();
  if (lastLine.length === 0) return false;

  // Check exclusions first
  for (const exclude of EXCLUDE_PATTERNS) {
    if (exclude.test(lastLine)) return false;
  }

  // Check for input patterns
  for (const pattern of INPUT_PATTERNS) {
    if (pattern.test(lastLine)) return true;
  }

  return false;
}

// Lightweight ring buffer that keeps the last N characters of output
// for needs-input detection without consuming excessive memory
export class OutputBuffer {
  private buffer = '';
  private readonly maxSize: number;

  constructor(maxSize: number = 2048) {
    this.maxSize = maxSize;
  }

  append(data: string): void {
    this.buffer += data;
    if (this.buffer.length > this.maxSize) {
      this.buffer = this.buffer.slice(-this.maxSize);
    }
  }

  getRecent(): string {
    return this.buffer;
  }

  clear(): void {
    this.buffer = '';
  }
}
