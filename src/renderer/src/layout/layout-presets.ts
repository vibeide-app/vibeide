import type { AgentType } from '../../../shared/agent-types';

export interface LayoutPreset {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly shortcut?: string;
  readonly slots: ReadonlyArray<{
    readonly type: AgentType;
    readonly label?: string;
  }>;
  readonly buildTree: (sessionIds: readonly string[]) => PresetTree;
}

export interface PresetLeaf {
  readonly type: 'leaf';
  readonly slotIndex: number;
}

export interface PresetSplit {
  readonly type: 'split';
  readonly direction: 'horizontal' | 'vertical';
  readonly ratio: number;
  readonly children: readonly [PresetTree, PresetTree];
}

export type PresetTree = PresetLeaf | PresetSplit;

export const LAYOUT_PRESETS: readonly LayoutPreset[] = [
  {
    id: 'single',
    label: 'Single Terminal',
    description: '1 terminal, full width',
    slots: [{ type: 'shell' }],
    buildTree: () => ({ type: 'leaf', slotIndex: 0 }),
  },
  {
    id: 'side-by-side',
    label: 'Side by Side',
    description: '2 terminals, left and right',
    shortcut: 'Ctrl+Shift+2',
    slots: [{ type: 'shell' }, { type: 'shell' }],
    buildTree: () => ({
      type: 'split',
      direction: 'horizontal',
      ratio: 0.5,
      children: [
        { type: 'leaf', slotIndex: 0 },
        { type: 'leaf', slotIndex: 1 },
      ],
    }),
  },
  {
    id: 'stacked',
    label: 'Stacked',
    description: '2 terminals, top and bottom',
    slots: [{ type: 'shell' }, { type: 'shell' }],
    buildTree: () => ({
      type: 'split',
      direction: 'vertical',
      ratio: 0.5,
      children: [
        { type: 'leaf', slotIndex: 0 },
        { type: 'leaf', slotIndex: 1 },
      ],
    }),
  },
  {
    id: 'grid-2x2',
    label: '2x2 Grid',
    description: '4 terminals in a grid',
    slots: [
      { type: 'shell' },
      { type: 'shell' },
      { type: 'shell' },
      { type: 'shell' },
    ],
    buildTree: () => ({
      type: 'split',
      direction: 'vertical',
      ratio: 0.5,
      children: [
        {
          type: 'split',
          direction: 'horizontal',
          ratio: 0.5,
          children: [
            { type: 'leaf', slotIndex: 0 },
            { type: 'leaf', slotIndex: 1 },
          ],
        },
        {
          type: 'split',
          direction: 'horizontal',
          ratio: 0.5,
          children: [
            { type: 'leaf', slotIndex: 2 },
            { type: 'leaf', slotIndex: 3 },
          ],
        },
      ],
    }),
  },
  {
    id: 'main-plus-two',
    label: 'Main + 2 Side',
    description: '1 large left, 2 stacked right',
    slots: [
      { type: 'shell', label: 'Main' },
      { type: 'shell' },
      { type: 'shell' },
    ],
    buildTree: () => ({
      type: 'split',
      direction: 'horizontal',
      ratio: 0.6,
      children: [
        { type: 'leaf', slotIndex: 0 },
        {
          type: 'split',
          direction: 'vertical',
          ratio: 0.5,
          children: [
            { type: 'leaf', slotIndex: 1 },
            { type: 'leaf', slotIndex: 2 },
          ],
        },
      ],
    }),
  },
  {
    id: 'claude-duo',
    label: 'Claude Duo',
    description: '2 Claude agents side by side',
    slots: [
      { type: 'claude', label: 'Claude A' },
      { type: 'claude', label: 'Claude B' },
    ],
    buildTree: () => ({
      type: 'split',
      direction: 'horizontal',
      ratio: 0.5,
      children: [
        { type: 'leaf', slotIndex: 0 },
        { type: 'leaf', slotIndex: 1 },
      ],
    }),
  },
  {
    id: 'builder-reviewer',
    label: 'Builder + Reviewer',
    description: 'Claude builder left, shell reviewer right',
    slots: [
      { type: 'claude', label: 'Builder' },
      { type: 'shell', label: 'Review' },
    ],
    buildTree: () => ({
      type: 'split',
      direction: 'horizontal',
      ratio: 0.6,
      children: [
        { type: 'leaf', slotIndex: 0 },
        { type: 'leaf', slotIndex: 1 },
      ],
    }),
  },
];

export function getPresetById(id: string): LayoutPreset | undefined {
  return LAYOUT_PRESETS.find((p) => p.id === id);
}
