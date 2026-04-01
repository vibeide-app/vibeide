import { describe, it, expect } from 'vitest';
import { buildBalancedTree } from '../../src/renderer/src/preview/single-preview';
import type { LayoutNode, LeafNode, SplitNode } from '../../src/shared/layout-types';

function countLeaves(node: LayoutNode): number {
  if (node.type === 'leaf') return 1;
  return countLeaves(node.children[0]) + countLeaves(node.children[1]);
}

function collectSessionIds(node: LayoutNode): string[] {
  if (node.type === 'leaf') return [node.sessionId];
  return [
    ...collectSessionIds(node.children[0]),
    ...collectSessionIds(node.children[1]),
  ];
}

function maxDepth(node: LayoutNode): number {
  if (node.type === 'leaf') return 0;
  return 1 + Math.max(maxDepth(node.children[0]), maxDepth(node.children[1]));
}

describe('buildBalancedTree', () => {
  it('creates a single leaf for 1 session', () => {
    const tree = buildBalancedTree(['s1']);
    expect(tree.type).toBe('leaf');
    expect((tree as LeafNode).sessionId).toBe('s1');
  });

  it('creates a split for 2 sessions', () => {
    const tree = buildBalancedTree(['s1', 's2']);
    expect(tree.type).toBe('split');
    expect(countLeaves(tree)).toBe(2);
    expect(collectSessionIds(tree)).toEqual(['s1', 's2']);
  });

  it('creates a balanced tree for 3 sessions', () => {
    const tree = buildBalancedTree(['s1', 's2', 's3']);
    expect(countLeaves(tree)).toBe(3);
    expect(collectSessionIds(tree)).toEqual(['s1', 's2', 's3']);
    // Should be depth 2: root split -> (split(s1, s2), s3)
    expect(maxDepth(tree)).toBe(2);
  });

  it('creates a 2x2 grid for 4 sessions', () => {
    const tree = buildBalancedTree(['s1', 's2', 's3', 's4']);
    expect(countLeaves(tree)).toBe(4);
    expect(collectSessionIds(tree)).toEqual(['s1', 's2', 's3', 's4']);
    // Should be depth 2: root split -> (split(s1, s2), split(s3, s4))
    expect(maxDepth(tree)).toBe(2);
  });

  it('handles 6 sessions with balanced depth', () => {
    const ids = ['s1', 's2', 's3', 's4', 's5', 's6'];
    const tree = buildBalancedTree(ids);
    expect(countLeaves(tree)).toBe(6);
    expect(collectSessionIds(tree)).toEqual(ids);
    expect(maxDepth(tree)).toBeLessThanOrEqual(3);
  });

  it('handles 20 sessions (max agents)', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `s${i}`);
    const tree = buildBalancedTree(ids);
    expect(countLeaves(tree)).toBe(20);
    expect(collectSessionIds(tree)).toEqual(ids);
    // log2(20) ≈ 4.3, so depth should be ≤ 5
    expect(maxDepth(tree)).toBeLessThanOrEqual(5);
  });

  it('throws for empty session list', () => {
    expect(() => buildBalancedTree([])).toThrow('Cannot build tree from empty session list');
  });

  it('alternates split directions for grid layout', () => {
    const tree = buildBalancedTree(['s1', 's2', 's3', 's4']);
    expect(tree.type).toBe('split');
    const root = tree as SplitNode;
    // Root should be vertical (depth 0, even)
    expect(root.direction).toBe('vertical');
    // Children should be horizontal (depth 1, odd)
    if (root.children[0].type === 'split') {
      expect(root.children[0].direction).toBe('horizontal');
    }
    if (root.children[1].type === 'split') {
      expect(root.children[1].direction).toBe('horizontal');
    }
  });

  it('preserves session order in leaves', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const tree = buildBalancedTree(ids);
    expect(collectSessionIds(tree)).toEqual(ids);
  });
});
