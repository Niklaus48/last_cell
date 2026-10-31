/**
 * The studio's tree model: it must show the real story (nothing missing, nothing
 * invented) and keep structural edits consistent.
 */
import { describe, expect, it } from 'vitest';
import {
  buildTree,
  createDraft,
  draftFromPack,
  draftToPack,
  retargetChoice,
  sceneById,
  setTimedDecision,
  updateChoice,
  updateScene,
  removeChoice,
  addChoice,
} from '../src/studio/model';
import { chapter1Story } from '../src/story/content/chapter1';
import { validateContentPack } from '../src/story/content/pack/validate';
import { EMPTY_PACK } from '../src/story/content/pack/types';

describe('buildTree', () => {
  it('lays out the whole canonical chapter: every scene, ending and failure', () => {
    const tree = buildTree(createDraft());
    const sceneNodes = tree.nodes.filter((node) => node.kind === 'scene');
    expect(sceneNodes).toHaveLength(chapter1Story.scenes.length);
    expect(tree.nodes.filter((node) => node.kind === 'ending')).toHaveLength(
      chapter1Story.endings.length,
    );
    expect(tree.nodes.filter((node) => node.kind === 'failure')).toHaveLength(
      (chapter1Story.failures ?? []).length,
    );
  });

  it('has one edge per choice, so branch counts match the story exactly', () => {
    const tree = buildTree(createDraft());
    const choices = chapter1Story.scenes.reduce((total, scene) => total + scene.choices.length, 0);
    expect(tree.edges).toHaveLength(choices);
  });

  it('puts the opening scene at depth 0 and every node at a non-negative depth', () => {
    const tree = buildTree(createDraft());
    const root = tree.nodes.find((node) => node.id === chapter1Story.initialSceneId);
    expect(root?.depth).toBe(0);
    expect(tree.nodes.every((node) => node.depth >= 0)).toBe(true);
  });

  it('points every edge at a node that exists in the graph', () => {
    const tree = buildTree(createDraft());
    const ids = new Set(tree.nodes.map((node) => node.id));
    for (const edge of tree.edges) {
      expect(ids.has(edge.from), `missing source ${edge.from}`).toBe(true);
      expect(ids.has(edge.to), `missing target ${edge.to}`).toBe(true);
    }
  });

  it('is deterministic: the same draft always yields the same layout', () => {
    const a = buildTree(createDraft());
    const b = buildTree(createDraft());
    expect(a.nodes).toEqual(b.nodes);
    expect(a.edges).toEqual(b.edges);
  });

  it('shows a rerouted branch in the new place immediately', () => {
    const draft = createDraft();
    const [first, second] = chapter1Story.scenes;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    if (first === undefined || second === undefined) return;

    const before = buildTree(draft).edges.filter((edge) => edge.from === first.id).length;
    const retargeted = retargetChoice(draft, first.id, first.choices[0]?.id ?? '', {
      type: 'transition',
      targetSceneId: second.id,
    });
    const after = buildTree(retargeted).edges.filter(
      (edge) => edge.from === first.id && edge.to === second.id,
    );
    expect(after.length).toBeGreaterThan(0);
    expect(buildTree(retargeted).edges.filter((edge) => edge.from === first.id)).toHaveLength(before);
  });
});

describe('draft editing', () => {
  it('edits text without touching structure', () => {
    const draft = createDraft();
    const scene = chapter1Story.scenes[0];
    expect(scene).toBeDefined();
    if (scene === undefined) return;
    const next = updateScene(draft, scene.id, { title: 'عنوان تازه' });
    expect(sceneById(next, scene.id)?.title).toBe('عنوان تازه');
    expect(sceneById(next, scene.id)?.choices).toEqual(scene.choices);
    // The original draft is untouched: edits are pure.
    expect(sceneById(draft, scene.id)?.title).toBe(scene.title);
  });

  it('keeps a timed decision valid when its default choice is deleted', () => {
    const draft = createDraft();
    const scene = chapter1Story.scenes.find((entry) => entry.timedDecision !== undefined);
    expect(scene).toBeDefined();
    if (scene?.timedDecision === undefined) return;
    const next = removeChoice(draft, scene.id, scene.timedDecision.defaultChoiceId);
    expect(sceneById(next, scene.id)?.timedDecision).toBeUndefined();
  });

  it('produces a pack that the validator accepts after an edit', () => {
    const draft = createDraft();
    const scene = chapter1Story.scenes[0];
    if (scene === undefined) return;
    const next = updateChoice(draft, scene.id, scene.choices[0]?.id ?? '', {
      label: 'گزینهٔ ویرایش‌شده',
    });
    const result = validateContentPack(JSON.parse(JSON.stringify(draftToPack(next))) as unknown);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('produces a pack the validator rejects when a target is broken', () => {
    const draft = createDraft();
    const scene = chapter1Story.scenes[0];
    if (scene === undefined) return;
    const broken = retargetChoice(draft, scene.id, scene.choices[0]?.id ?? '', {
      type: 'transition',
      targetSceneId: 'scene-that-does-not-exist',
    });
    const result = validateContentPack(JSON.parse(JSON.stringify(draftToPack(broken))) as unknown);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('scene-that-does-not-exist');
  });

  it('round-trips an empty pack back to the canonical story', () => {
    const draft = draftFromPack(EMPTY_PACK);
    expect(draft.story.scenes).toHaveLength(chapter1Story.scenes.length);
    expect(draftToPack(draft).story?.scenes).toHaveLength(chapter1Story.scenes.length);
  });

  it('adds and removes a choice and stays valid', () => {
    const draft = createDraft();
    const scene = chapter1Story.scenes[0];
    if (scene === undefined) return;
    const added = addChoice(draft, scene.id);
    expect(sceneById(added, scene.id)?.choices).toHaveLength(scene.choices.length + 1);
    const restored = removeChoice(added, scene.id, `choice-${scene.choices.length + 1}`);
    expect(sceneById(restored, scene.id)?.choices).toHaveLength(scene.choices.length);
    expect(
      validateContentPack(JSON.parse(JSON.stringify(draftToPack(restored))) as unknown).ok,
    ).toBe(true);
  });

  it('turns a timed decision on and off without corrupting the scene', () => {
    const draft = createDraft();
    const scene = chapter1Story.scenes.find((entry) => entry.choices.length > 1);
    if (scene === undefined || scene.timedDecision !== undefined) return;
    const choiceId = scene.choices[0]?.id ?? '';
    const on = setTimedDecision(draft, scene.id, { durationMs: 5000, defaultChoiceId: choiceId });
    expect(sceneById(on, scene.id)?.timedDecision?.durationMs).toBe(5000);
    const off = setTimedDecision(on, scene.id, null);
    expect(sceneById(off, scene.id)?.timedDecision).toBeUndefined();
  });
});
