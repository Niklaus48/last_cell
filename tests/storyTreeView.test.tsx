// @vitest-environment jsdom
/**
 * The graph draws the rules, not just the shape: dashed conditional edges, red
 * ones for a route that is already shut at the start, effect diamonds, node
 * badges, and a legend that explains them.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { StoryTreeView } from '../src/studio/StoryTreeView';
import { buildTree, createDraft } from '../src/studio/model';

afterEach(() => {
  cleanup();
});

function renderTree(onSelect = vi.fn()) {
  const tree = buildTree(createDraft());
  render(
    <StoryTreeView
      tree={tree}
      selectedId={null}
      onSelect={onSelect}
      timedSceneIds={new Set(tree.nodes.filter((node) => node.timed).map((node) => node.id))}
    />,
  );
  return tree;
}

describe('StoryTreeView rules', () => {
  it('draws a dashed edge for every conditional choice', () => {
    const tree = renderTree();
    const dashed = document.querySelectorAll('.tree-edge path[stroke-dasharray]');
    expect(dashed.length).toBe(tree.stats.gatedEdges);
  });

  it('colours a route that is shut at the start differently', () => {
    const tree = renderTree();
    const closed = document.querySelectorAll('.tree-edge--closed');
    expect(closed.length).toBe(tree.stats.closedAtStart);
    expect(closed.length).toBeGreaterThan(0);
  });

  it('puts a diamond on edges whose choice changes state', () => {
    const tree = renderTree();
    expect(document.querySelectorAll('.tree-edge__effect').length).toBe(tree.stats.effectfulEdges);
    expect(tree.stats.effectfulEdges).toBeGreaterThan(0);
  });

  it('badges a scene with its gated and effectful choices', () => {
    renderTree();
    expect(document.querySelectorAll('.badge--gated').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.badge--effect').length).toBeGreaterThan(0);
  });

  it('explains the markers in the legend and totals them', () => {
    const tree = renderTree();
    const legend = document.querySelector('.tree-legend');
    expect(legend?.textContent).toContain('شرطی');
    expect(legend?.textContent).toContain('در شروع بسته');
    expect(legend?.textContent).toContain('اثرگذار');
    expect(legend?.textContent).toContain(`${tree.stats.timedScenes}`);
  });

  it('describes a node for assistive tech with its rule counts', () => {
    const tree = renderTree();
    const gatedNode = tree.nodes.find((node) => node.gatedChoices > 0);
    expect(gatedNode).toBeDefined();
    if (gatedNode === undefined) return;
    const label = document.querySelector(`[aria-label^="${gatedNode.title}"]`)?.getAttribute('aria-label');
    expect(label).toContain('شرطی');
  });

  it('still selects a node when clicked', () => {
    const onSelect = vi.fn();
    const tree = renderTree(onSelect);
    const first = tree.nodes.find((node) => node.kind === 'scene');
    if (first === undefined) return;
    const element = document.querySelector(`[aria-label^="${first.title}"]`);
    if (element === null) return;
    fireEvent.click(element);
    expect(onSelect).toHaveBeenCalledWith(first.id);
  });
});
