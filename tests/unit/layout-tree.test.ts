import { describe, it, expect } from 'vitest';
import type { LayoutNode, LeafNode, SplitNode } from '../../src/shared/layout-types';

// Pure layout tree operations extracted from LayoutManager for testing
// These mirror the private methods in layout-manager.ts but are pure functions

function createLeaf(id: string, sessionId: string): LeafNode {
  return { type: 'leaf', id, sessionId };
}

function splitLeaf(
  tree: LayoutNode,
  leafId: string,
  direction: 'horizontal' | 'vertical',
  newLeafId: string,
  newSessionId: string,
  splitId: string,
): LayoutNode {
  return replaceNode(tree, leafId, (existing) => {
    const newLeaf: LeafNode = { type: 'leaf', id: newLeafId, sessionId: newSessionId };
    const split: SplitNode = {
      type: 'split',
      id: splitId,
      direction,
      children: [existing, newLeaf],
      ratio: 0.5,
    };
    return split;
  });
}

function replaceNode(
  node: LayoutNode,
  targetId: string,
  replacer: (node: LeafNode) => LayoutNode,
): LayoutNode {
  if (node.type === 'leaf') {
    return node.id === targetId ? replacer(node) : node;
  }

  const [first, second] = node.children;
  const newFirst = replaceNode(first, targetId, replacer);
  const newSecond = replaceNode(second, targetId, replacer);

  if (newFirst === first && newSecond === second) return node;

  return { ...node, children: [newFirst, newSecond] };
}

function removeNode(
  node: LayoutNode,
  targetId: string,
): { node: LayoutNode | null; removed: boolean; removedSessionId?: string } {
  if (node.type === 'leaf') {
    if (node.id === targetId) {
      return { node: null, removed: true, removedSessionId: node.sessionId };
    }
    return { node, removed: false };
  }

  const [first, second] = node.children;

  // Direct child removal — sibling takes parent's place
  if (first.type === 'leaf' && first.id === targetId) {
    return { node: second, removed: true, removedSessionId: first.sessionId };
  }
  if (second.type === 'leaf' && second.id === targetId) {
    return { node: first, removed: true, removedSessionId: second.sessionId };
  }

  // Recursive removal in first child
  const firstResult = removeNode(first, targetId);
  if (firstResult.removed && firstResult.node) {
    const newNode: SplitNode = {
      ...node,
      children: [firstResult.node, second],
    } as SplitNode;
    return { node: newNode, removed: true, removedSessionId: firstResult.removedSessionId };
  }
  if (firstResult.removed && !firstResult.node) {
    return { node: second, removed: true, removedSessionId: firstResult.removedSessionId };
  }

  // Recursive removal in second child
  const secondResult = removeNode(second, targetId);
  if (secondResult.removed && secondResult.node) {
    const newNode: SplitNode = {
      ...node,
      children: [first, secondResult.node],
    } as SplitNode;
    return { node: newNode, removed: true, removedSessionId: secondResult.removedSessionId };
  }
  if (secondResult.removed && !secondResult.node) {
    return { node: first, removed: true, removedSessionId: secondResult.removedSessionId };
  }

  return { node, removed: false };
}

function updateRatio(node: LayoutNode, splitId: string, ratio: number): LayoutNode {
  if (node.type === 'leaf') return node;

  if (node.id === splitId) {
    return { ...node, ratio };
  }

  const [first, second] = node.children;
  const newFirst = updateRatio(first, splitId, ratio);
  const newSecond = updateRatio(second, splitId, ratio);

  if (newFirst === first && newSecond === second) return node;
  return { ...node, children: [newFirst, newSecond] };
}

function findLeafBySessionId(node: LayoutNode, sessionId: string): LeafNode | null {
  if (node.type === 'leaf') {
    return node.sessionId === sessionId ? node : null;
  }
  return (
    findLeafBySessionId(node.children[0], sessionId) ??
    findLeafBySessionId(node.children[1], sessionId)
  );
}

function findFirstLeaf(node: LayoutNode | null): LeafNode | null {
  if (!node) return null;
  if (node.type === 'leaf') return node;
  return findFirstLeaf(node.children[0]);
}

describe('Layout Tree Operations', () => {
  describe('createLeaf', () => {
    it('creates a leaf node with correct properties', () => {
      const leaf = createLeaf('leaf-1', 'session-1');
      expect(leaf).toEqual({ type: 'leaf', id: 'leaf-1', sessionId: 'session-1' });
    });

    it('creates a readonly-compatible node', () => {
      const leaf = createLeaf('leaf-1', 'session-1');
      expect(leaf.type).toBe('leaf');
      expect(leaf.id).toBe('leaf-1');
      expect(leaf.sessionId).toBe('session-1');
    });
  });

  describe('splitLeaf', () => {
    it('splits a single leaf into a split node', () => {
      const leaf = createLeaf('leaf-1', 'session-1');
      const result = splitLeaf(leaf, 'leaf-1', 'horizontal', 'leaf-2', 'session-2', 'split-1');

      expect(result.type).toBe('split');
      const split = result as SplitNode;
      expect(split.direction).toBe('horizontal');
      expect(split.ratio).toBe(0.5);
      expect(split.children).toHaveLength(2);
      expect(split.children[0]).toEqual({ type: 'leaf', id: 'leaf-1', sessionId: 'session-1' });
      expect(split.children[1]).toEqual({ type: 'leaf', id: 'leaf-2', sessionId: 'session-2' });
    });

    it('splits vertically when specified', () => {
      const leaf = createLeaf('leaf-1', 'session-1');
      const result = splitLeaf(leaf, 'leaf-1', 'vertical', 'leaf-2', 'session-2', 'split-1');

      const split = result as SplitNode;
      expect(split.direction).toBe('vertical');
    });

    it('splits a nested leaf inside a tree', () => {
      const tree: SplitNode = {
        type: 'split',
        id: 'split-1',
        direction: 'horizontal',
        children: [
          createLeaf('leaf-1', 'session-1'),
          createLeaf('leaf-2', 'session-2'),
        ],
        ratio: 0.5,
      };

      const result = splitLeaf(tree, 'leaf-2', 'vertical', 'leaf-3', 'session-3', 'split-2');
      expect(result.type).toBe('split');

      const root = result as SplitNode;
      expect(root.children[0]).toEqual(createLeaf('leaf-1', 'session-1'));

      const innerSplit = root.children[1] as SplitNode;
      expect(innerSplit.type).toBe('split');
      expect(innerSplit.direction).toBe('vertical');
      expect(innerSplit.children[0]).toEqual(createLeaf('leaf-2', 'session-2'));
      expect(innerSplit.children[1]).toEqual(createLeaf('leaf-3', 'session-3'));
    });

    it('returns same tree when target leaf not found', () => {
      const leaf = createLeaf('leaf-1', 'session-1');
      const result = splitLeaf(leaf, 'non-existent', 'horizontal', 'leaf-2', 'session-2', 'split-1');
      expect(result).toBe(leaf);
    });
  });

  describe('removeNode (close pane)', () => {
    it('removes a single leaf and returns null', () => {
      const leaf = createLeaf('leaf-1', 'session-1');
      const result = removeNode(leaf, 'leaf-1');
      expect(result.removed).toBe(true);
      expect(result.node).toBeNull();
      expect(result.removedSessionId).toBe('session-1');
    });

    it('sibling takes parent place when first child removed', () => {
      const tree: SplitNode = {
        type: 'split',
        id: 'split-1',
        direction: 'horizontal',
        children: [
          createLeaf('leaf-1', 'session-1'),
          createLeaf('leaf-2', 'session-2'),
        ],
        ratio: 0.5,
      };

      const result = removeNode(tree, 'leaf-1');
      expect(result.removed).toBe(true);
      expect(result.node).toEqual(createLeaf('leaf-2', 'session-2'));
      expect(result.removedSessionId).toBe('session-1');
    });

    it('sibling takes parent place when second child removed', () => {
      const tree: SplitNode = {
        type: 'split',
        id: 'split-1',
        direction: 'horizontal',
        children: [
          createLeaf('leaf-1', 'session-1'),
          createLeaf('leaf-2', 'session-2'),
        ],
        ratio: 0.5,
      };

      const result = removeNode(tree, 'leaf-2');
      expect(result.removed).toBe(true);
      expect(result.node).toEqual(createLeaf('leaf-1', 'session-1'));
      expect(result.removedSessionId).toBe('session-2');
    });

    it('handles nested removal (depth > 2)', () => {
      const innerSplit: SplitNode = {
        type: 'split',
        id: 'split-inner',
        direction: 'vertical',
        children: [
          createLeaf('leaf-2', 'session-2'),
          createLeaf('leaf-3', 'session-3'),
        ],
        ratio: 0.5,
      };

      const tree: SplitNode = {
        type: 'split',
        id: 'split-outer',
        direction: 'horizontal',
        children: [createLeaf('leaf-1', 'session-1'), innerSplit],
        ratio: 0.5,
      };

      const result = removeNode(tree, 'leaf-2');
      expect(result.removed).toBe(true);

      // leaf-3 should take innerSplit's place
      const root = result.node as SplitNode;
      expect(root.type).toBe('split');
      expect(root.children[0]).toEqual(createLeaf('leaf-1', 'session-1'));
      expect(root.children[1]).toEqual(createLeaf('leaf-3', 'session-3'));
    });

    it('returns not-removed when target not found', () => {
      const tree: SplitNode = {
        type: 'split',
        id: 'split-1',
        direction: 'horizontal',
        children: [
          createLeaf('leaf-1', 'session-1'),
          createLeaf('leaf-2', 'session-2'),
        ],
        ratio: 0.5,
      };

      const result = removeNode(tree, 'non-existent');
      expect(result.removed).toBe(false);
      expect(result.node).toBe(tree);
    });
  });

  describe('updateRatio', () => {
    it('updates ratio of target split node', () => {
      const tree: SplitNode = {
        type: 'split',
        id: 'split-1',
        direction: 'horizontal',
        children: [
          createLeaf('leaf-1', 'session-1'),
          createLeaf('leaf-2', 'session-2'),
        ],
        ratio: 0.5,
      };

      const result = updateRatio(tree, 'split-1', 0.7);
      expect((result as SplitNode).ratio).toBe(0.7);
    });

    it('returns same tree when split ID not found', () => {
      const tree: SplitNode = {
        type: 'split',
        id: 'split-1',
        direction: 'horizontal',
        children: [
          createLeaf('leaf-1', 'session-1'),
          createLeaf('leaf-2', 'session-2'),
        ],
        ratio: 0.5,
      };

      const result = updateRatio(tree, 'non-existent', 0.7);
      expect(result).toBe(tree);
    });

    it('updates ratio in nested tree', () => {
      const innerSplit: SplitNode = {
        type: 'split',
        id: 'split-inner',
        direction: 'vertical',
        children: [
          createLeaf('leaf-2', 'session-2'),
          createLeaf('leaf-3', 'session-3'),
        ],
        ratio: 0.5,
      };

      const tree: SplitNode = {
        type: 'split',
        id: 'split-outer',
        direction: 'horizontal',
        children: [createLeaf('leaf-1', 'session-1'), innerSplit],
        ratio: 0.5,
      };

      const result = updateRatio(tree, 'split-inner', 0.3) as SplitNode;
      const inner = result.children[1] as SplitNode;
      expect(inner.ratio).toBe(0.3);
      expect(result.ratio).toBe(0.5); // outer unchanged
    });

    it('returns same leaf node unchanged', () => {
      const leaf = createLeaf('leaf-1', 'session-1');
      const result = updateRatio(leaf, 'any-id', 0.7);
      expect(result).toBe(leaf);
    });
  });

  describe('findLeafBySessionId', () => {
    it('finds leaf in a single-leaf tree', () => {
      const leaf = createLeaf('leaf-1', 'session-1');
      const result = findLeafBySessionId(leaf, 'session-1');
      expect(result).toEqual(leaf);
    });

    it('returns null when session not found', () => {
      const leaf = createLeaf('leaf-1', 'session-1');
      const result = findLeafBySessionId(leaf, 'non-existent');
      expect(result).toBeNull();
    });

    it('finds leaf in nested tree', () => {
      const tree: SplitNode = {
        type: 'split',
        id: 'split-1',
        direction: 'horizontal',
        children: [
          createLeaf('leaf-1', 'session-1'),
          {
            type: 'split',
            id: 'split-2',
            direction: 'vertical',
            children: [
              createLeaf('leaf-2', 'session-2'),
              createLeaf('leaf-3', 'session-3'),
            ],
            ratio: 0.5,
          },
        ],
        ratio: 0.5,
      };

      const result = findLeafBySessionId(tree, 'session-3');
      expect(result).toEqual(createLeaf('leaf-3', 'session-3'));
    });
  });

  describe('findFirstLeaf', () => {
    it('returns null for null input', () => {
      expect(findFirstLeaf(null)).toBeNull();
    });

    it('returns the leaf itself for a single leaf', () => {
      const leaf = createLeaf('leaf-1', 'session-1');
      expect(findFirstLeaf(leaf)).toBe(leaf);
    });

    it('returns the leftmost leaf in a split', () => {
      const tree: SplitNode = {
        type: 'split',
        id: 'split-1',
        direction: 'horizontal',
        children: [
          createLeaf('leaf-1', 'session-1'),
          createLeaf('leaf-2', 'session-2'),
        ],
        ratio: 0.5,
      };

      expect(findFirstLeaf(tree)).toEqual(createLeaf('leaf-1', 'session-1'));
    });

    it('returns the deepest leftmost leaf in a nested tree', () => {
      const tree: SplitNode = {
        type: 'split',
        id: 'split-outer',
        direction: 'horizontal',
        children: [
          {
            type: 'split',
            id: 'split-inner',
            direction: 'vertical',
            children: [
              createLeaf('leaf-deep', 'session-deep'),
              createLeaf('leaf-2', 'session-2'),
            ],
            ratio: 0.5,
          },
          createLeaf('leaf-3', 'session-3'),
        ],
        ratio: 0.5,
      };

      expect(findFirstLeaf(tree)).toEqual(createLeaf('leaf-deep', 'session-deep'));
    });
  });

  describe('immutability', () => {
    it('splitLeaf does not modify the original tree', () => {
      const original = createLeaf('leaf-1', 'session-1');
      const originalCopy = { ...original };

      splitLeaf(original, 'leaf-1', 'horizontal', 'leaf-2', 'session-2', 'split-1');

      expect(original).toEqual(originalCopy);
    });

    it('removeNode does not modify the original tree', () => {
      const tree: SplitNode = {
        type: 'split',
        id: 'split-1',
        direction: 'horizontal',
        children: [
          createLeaf('leaf-1', 'session-1'),
          createLeaf('leaf-2', 'session-2'),
        ],
        ratio: 0.5,
      };
      const originalChildren = [...tree.children];

      removeNode(tree, 'leaf-1');

      expect(tree.children).toEqual(originalChildren);
      expect(tree.children).toHaveLength(2);
    });

    it('updateRatio does not modify the original tree', () => {
      const tree: SplitNode = {
        type: 'split',
        id: 'split-1',
        direction: 'horizontal',
        children: [
          createLeaf('leaf-1', 'session-1'),
          createLeaf('leaf-2', 'session-2'),
        ],
        ratio: 0.5,
      };

      updateRatio(tree, 'split-1', 0.8);

      expect(tree.ratio).toBe(0.5);
    });

    it('splitLeaf on nested tree preserves untouched branches by reference', () => {
      const leftLeaf = createLeaf('leaf-1', 'session-1');
      const rightLeaf = createLeaf('leaf-2', 'session-2');
      const tree: SplitNode = {
        type: 'split',
        id: 'split-1',
        direction: 'horizontal',
        children: [leftLeaf, rightLeaf],
        ratio: 0.5,
      };

      const result = splitLeaf(tree, 'leaf-2', 'vertical', 'leaf-3', 'session-3', 'split-2');
      const root = result as SplitNode;

      // Left branch should be the exact same reference (structural sharing)
      expect(root.children[0]).toBe(leftLeaf);
    });
  });
});
