// Patterns that indicate an agent is waiting for user input.
// Includes generic terminal patterns and agent-specific patterns
// for Claude Code, Gemini CLI, and Codex.

import type { AgentType } from '../../shared/agent-types';

// Strip ANSI escape sequences for clean matching
const ANSI_RE = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\].*?\x07|\x1b\[[\d;]*m/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_RE, '');
}

// ─── Generic patterns (all agent types) ───

const GENERIC_PATTERNS: readonly RegExp[] = [
  // Yes/No prompts
  /\[Y\/n\]\s*$/i,
  /\[y\/N\]\s*$/i,
  /\(y\/n\)\s*[?:]?\s*$/i,
  /\(yes\/no\)\s*[?:]?\s*$/i,

  // Proceed/continue prompts
  /\bproceed\b.*[?]\s*$/i,
  /\bcontinue\b.*[?]\s*$/i,
  /\bconfirm\b.*[?]\s*$/i,

  // Generic question prompts
  /\bdo you want\b.*[?]\s*$/i,
  /\bwould you like\b.*[?]\s*$/i,
  /\bshould I\b.*[?]\s*$/i,

  // Common tool prompts
  /\benter\b.*:\s*$/i,
  /\bpassword\b.*:\s*$/i,
  /\bpress\b.*to continue/i,
  /\bpress enter\b/i,

  // Package manager prompts
  /\bIs this OK\b/i,
  /\bOk to proceed\b/i,

  // Git prompts
  /\bAbort\b.*[?]\s*$/i,
  /\boverwrite\b.*[?]\s*$/i,
];

// ─── Claude Code specific patterns ───

const CLAUDE_PATTERNS: readonly RegExp[] = [
  // Permission/tool approval prompts
  /\bDo you want to proceed\b/i,
  /\bApprove\b/i,
  /\bAllow\b.*tool/i,
  /\bAllow\b.*[?]\s*$/i,
  /\bDeny\b.*\bAllow\b/i,
  /\bReject\b.*\bApprove\b/i,

  // File edit confirmation
  /\bAccept\b.*edit/i,
  /\bApply\b.*changes/i,
  /\bSave\b.*changes.*[?]/i,

  // Plan/execution confirmation
  /\bExecute\b.*plan/i,
  /\bRun\b.*command.*[?]/i,
  /\bProceed with\b/i,

  // Claude Code specific prompt patterns
  /\(y\)es\s*\/\s*\(n\)o/i,
  /\(a\)lways\s*\/\s*\(y\)es\s*\/\s*\(n\)o/i,
  /\by\b.*\bn\b.*\ba\b.*to (allow|approve)/i,

  // Tool use approval — Claude shows tool name then asks
  /\bBash\b.*\bAllow\b/i,
  /\bRead\b.*\bAllow\b/i,
  /\bWrite\b.*\bAllow\b/i,
  /\bEdit\b.*\bAllow\b/i,

  // Waiting for user response indicators
  /waiting for.*input/i,
  /waiting for.*response/i,
  /\bUser\b.*\binput\b.*required/i,

  // Permission prompt with options
  /\[\s*y\s*\/\s*n\s*\/\s*a\s*\]/i,
  /\byes\b.*\bno\b.*\balways\b/i,
];

// ─── Gemini CLI specific patterns ───

const GEMINI_PATTERNS: readonly RegExp[] = [
  // Gemini confirmation prompts
  /\bDo you approve\b/i,
  /\bShall I\b.*[?]\s*$/i,
  /\bGo ahead\b.*[?]\s*$/i,

  // Gemini tool execution
  /\bExecute\b.*[?]\s*$/i,
  /\bRun this\b.*[?]\s*$/i,
  /\bApply this\b.*[?]\s*$/i,

  // Gemini sandbox/safety
  /\bsandbox\b.*\ballow\b/i,
  /\bpermission\b.*\bgrant\b/i,

  // Gemini interactive prompts
  /\bConfirm\b.*action/i,
  /\bAccept\b.*suggestion/i,
  /\bReview\b.*changes.*[?]/i,

  // Gemini specific option patterns
  /\[\s*accept\s*\/\s*reject\s*\]/i,
  /\[\s*yes\s*\/\s*no\s*\/\s*edit\s*\]/i,
];

// ─── Codex specific patterns ───

const CODEX_PATTERNS: readonly RegExp[] = [
  // Codex approval prompts
  /\bapprove\b.*\bdeny\b/i,
  /\ballow\b.*\bdeny\b/i,

  // Codex execution confirmation
  /\bRun\b.*command/i,
  /\bExecute\b.*script/i,
  /\bApply\b.*patch/i,
  /\bWrite\b.*file.*[?]/i,

  // Codex sandbox
  /\bsandbox\b.*\bapprove\b/i,
  /\bauto-approve\b/i,

  // Codex interactive
  /\bConfirm\b.*execution/i,
  /\bProceed\b.*execution/i,
  /\[\s*approve\s*\]/i,
];

// ─── Multi-line patterns (check last N lines, not just last line) ───

const MULTILINE_PATTERNS: readonly RegExp[] = [
  // Claude's permission block often spans multiple lines:
  // "Claude wants to use Bash"
  // "Allow? (y/n/a)"
  /wants to (?:use|run|execute|read|write|edit)\b/i,

  // Gemini's tool blocks
  /proposed.*(?:action|change|edit)/i,

  // Any agent showing a diff then asking for approval
  /\+{3}.*\n.*approve/i,
];

// ─── Exclusion patterns ───

const EXCLUDE_PATTERNS: readonly RegExp[] = [
  /^\s*\d+%/,
  /^\s*[.]+\s*$/,
  /downloading/i,
  /compiling/i,
  /building/i,
  /\bStreaming\b/i,
  /\bGenerating\b/i,
  /\bThinking\b/i,
  /\bSearching\b/i,
];

// ─── Agent-type to patterns mapping ───

function getPatternsForAgent(agentType: AgentType): readonly RegExp[] {
  switch (agentType) {
    case 'claude': return [...GENERIC_PATTERNS, ...CLAUDE_PATTERNS];
    case 'gemini': return [...GENERIC_PATTERNS, ...GEMINI_PATTERNS];
    case 'codex': return [...GENERIC_PATTERNS, ...CODEX_PATTERNS];
    default: return GENERIC_PATTERNS;
  }
}

// ─── Main detection function ───

export function detectNeedsInput(recentOutput: string, agentType: AgentType = 'shell'): boolean {
  const cleaned = stripAnsi(recentOutput);

  const lines = cleaned.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return false;

  const lastLine = lines[lines.length - 1].trim();
  if (lastLine.length === 0) return false;

  // Check exclusions first
  for (const exclude of EXCLUDE_PATTERNS) {
    if (exclude.test(lastLine)) return false;
  }

  // Check agent-specific + generic patterns on the last line
  const patterns = getPatternsForAgent(agentType);
  for (const pattern of patterns) {
    if (pattern.test(lastLine)) return true;
  }

  // Check multi-line patterns on the last 5 lines (for multi-line prompts)
  if (lines.length >= 2) {
    const recentLines = lines.slice(-5).join('\n');
    for (const pattern of MULTILINE_PATTERNS) {
      if (pattern.test(recentLines)) return true;
    }
  }

  return false;
}

// ─── Output buffer ───

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
