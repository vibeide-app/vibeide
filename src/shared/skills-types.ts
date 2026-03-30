import type { AgentType } from './agent-types';

export type SkillCategory = 'language' | 'quality' | 'testing' | 'security' | 'patterns' | 'workflow' | 'agent';

export interface SkillItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: SkillCategory;
  readonly languages?: readonly string[];
  readonly targetAgents: readonly AgentType[];
  readonly archivePath: string;
}

export interface SkillManifest {
  readonly version: string;
  readonly skills: readonly SkillItem[];
  readonly presets: readonly SkillPreset[];
}

export interface SkillPreset {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly skillIds: readonly string[];
}

export interface SkillInstallRequest {
  readonly skillIds: readonly string[];
  readonly targetAgents: readonly AgentType[];
}

export interface SkillInstallResult {
  readonly skillId: string;
  readonly status: 'installed' | 'failed' | 'skipped';
  readonly error?: string;
}

export interface SkillsInstallResponse {
  readonly results: readonly SkillInstallResult[];
  readonly summary: {
    readonly installed: number;
    readonly failed: number;
    readonly skipped: number;
  };
}

export interface InstalledSkillRecord {
  readonly skillId: string;
  readonly version: string;
  readonly installedAt: number;
  readonly targetAgents: readonly string[];
}
