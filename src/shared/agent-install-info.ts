import type { AgentType } from './agent-types';

export interface AgentInstallInfo {
  readonly command: string;
  readonly displayName: string;
  readonly installCommand: string;
  readonly docsUrl: string;
  readonly description: string;
}

export const AGENT_INSTALL_INFO: Partial<Record<AgentType, AgentInstallInfo>> = {
  claude: {
    command: 'claude',
    displayName: 'Claude Code',
    installCommand: 'npm install -g @anthropic-ai/claude-code',
    docsUrl: 'https://docs.anthropic.com/en/docs/claude-code',
    description: 'Anthropic\'s AI coding agent for the terminal',
  },
  gemini: {
    command: 'gemini',
    displayName: 'Gemini CLI',
    installCommand: 'npm install -g @anthropic-ai/gemini-cli',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    description: 'Google\'s AI coding agent',
  },
  codex: {
    command: 'codex',
    displayName: 'Codex CLI',
    installCommand: 'npm install -g @openai/codex',
    docsUrl: 'https://github.com/openai/codex',
    description: 'OpenAI\'s coding agent',
  },
};
