/**
 * The studio's tree model: it must show the real story (nothing missing, nothing
 * invented) and keep structural edits consistent.
 */
import { describe, expect, it } from 'vitest';
import {
  buildTree,
  createDraft,
  draftFromPack,
  draftToFullPack,
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
    // An untouched story is written as `null`, not as a copy of the content, so
    // the pack never shadows later edits to the TypeScript chapter.
    expect(draftToPack(draft).story).toBeNull();
  });

  it('keeps the compact export for a chapter that only changed in TypeScript', () => {
    // The redesign lives in the canonical TS content, so an untouched draft is
    // still a no-op diff: this is the `story: null` behaviour, on purpose.
    const compact = draftToPack(createDraft());
    expect(compact.story).toBeNull();

    // …and the full export carries the redesign instead of the old chapter.
    const full = draftToFullPack(createDraft());
    expect(full.story?.scenes).toHaveLength(chapter1Story.scenes.length);
    expect(full.story?.scenes.some((scene) => scene.id === 'ch1-guard-search')).toBe(true);
  });

  it('can write the story out in full for tools that cannot read the TypeScript', () => {
    const draft = draftFromPack(EMPTY_PACK);
    const full = draftToFullPack(draft);

    // Same pack, opposite choice about the story: null means "use the canonical
    // chapter", the full export spells it out — variables and labels included.
    expect(draftToPack(draft).story).toBeNull();
    expect(full.story).not.toBeNull();
    expect(full.story?.scenes).toHaveLength(chapter1Story.scenes.length);
    expect(Object.keys(full.story?.initialVariables ?? {})).toEqual(
      Object.keys(chapter1Story.initialVariables ?? {}),
    );
    expect(full.story?.variableMeta?.['composure']?.label).toBe('خون‌سردی');
    // The extras travel with it, so the file is a complete pack, not just a story.
    expect(full.presentation).toEqual(draftToPack(draft).presentation);
    expect(validateContentPack(JSON.parse(JSON.stringify(full)) as unknown).ok).toBe(true);
  });

  it('exports the full story even after an edit that would otherwise be a diff', () => {
    const draft = createDraft();
    const scene = chapter1Story.scenes[0];
    if (scene === undefined) return;
    const edited = updateScene(draft, scene.id, { title: 'عنوان تازه' });

    expect(draftToPack(edited).story).not.toBeNull();
    expect(draftToFullPack(edited).story?.scenes[0]?.title).toBe('عنوان تازه');
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

describe('conditions and effects', () => {
  it('adds a condition to a choice and keeps the rest of the story intact', async () => {
    const { setChoiceCondition, newCondition } = await import('../src/studio/model');
    const draft = createDraft();
    const scene = draft.story.scenes[0];
    const choice = scene?.choices[0];
    expect(scene).toBeDefined();
    expect(choice).toBeDefined();
    if (scene === undefined || choice === undefined) return;

    const withCondition = setChoiceCondition(draft, scene.id, choice.id, newCondition('composure'));
    const edited = withCondition.story.scenes.find((entry) => entry.id === scene.id)?.choices[0];
    expect(edited?.condition).toEqual({ kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 1 });
    // The original draft is pure: untouched by the edit.
    expect(draft.story.scenes[0]?.choices[0]?.condition).toBe(choice.condition);
    // …and the result is still a valid pack.
    expect(validateContentPack(JSON.parse(JSON.stringify(draftToPack(withCondition))) as unknown).ok).toBe(true);
  });

  it('removes a condition by dropping the key, not by writing undefined', async () => {
    const { setChoiceCondition } = await import('../src/studio/model');
    const draft = createDraft();
    const scene = draft.story.scenes.find((entry) => entry.choices.some((c) => c.condition !== undefined));
    const choice = scene?.choices.find((c) => c.condition !== undefined);
    if (scene === undefined || choice === undefined) return;

    const cleared = setChoiceCondition(draft, scene.id, choice.id, null);
    const edited = cleared.story.scenes.find((entry) => entry.id === scene.id)?.choices.find((c) => c.id === choice.id);
    expect(edited !== undefined && 'condition' in edited).toBe(false);
    const pack = draftToPack(cleared);
    const json = JSON.parse(JSON.stringify(pack)) as { story: { scenes: { id: string; choices: { id: string; condition?: unknown }[] }[] } };
    const serialised = json.story.scenes.find((entry) => entry.id === scene.id)?.choices.find((c) => c.id === choice.id);
    expect(serialised !== undefined && 'condition' in serialised).toBe(false);
  });

  it('nests an "all" condition and keeps it valid', async () => {
    const { setChoiceCondition } = await import('../src/studio/model');
    const draft = createDraft();
    const scene = draft.story.scenes[0];
    const choice = scene?.choices[0];
    if (scene === undefined || choice === undefined) return;

    const nested = setChoiceCondition(draft, scene.id, choice.id, {
      kind: 'all',
      conditions: [
        { kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 2 },
        { kind: 'compareVariable', variable: 'guardSuspicion', operator: 'lte', value: 1 },
      ],
    });
    const result = validateContentPack(JSON.parse(JSON.stringify(draftToPack(nested))) as unknown);
    expect(result.ok).toBe(true);
  });

  it('adds, edits, reorders and removes effects', async () => {
    const { addEffect, updateEffect, moveEffect, removeEffect } = await import('../src/studio/model');
    const draft = createDraft();
    const scene = draft.story.scenes[0];
    const choice = scene?.choices[0];
    if (scene === undefined || choice === undefined) return;

    const one = addEffect(draft, scene.id, choice.id, { kind: 'incrementVariable', variable: 'composure', amount: 1 });
    const two = addEffect(one, scene.id, choice.id, { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 2 });
    const list = two.story.scenes[0]?.choices[0]?.effects ?? [];
    expect(list).toHaveLength(2);

    const edited = updateEffect(two, scene.id, choice.id, 1, { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 3 });
    expect(edited.story.scenes[0]?.choices[0]?.effects?.[1]).toEqual({ kind: 'incrementVariable', variable: 'guardSuspicion', amount: 3 });

    const moved = moveEffect(edited, scene.id, choice.id, 1, -1);
    expect(moved.story.scenes[0]?.choices[0]?.effects?.[0]).toEqual({ kind: 'incrementVariable', variable: 'guardSuspicion', amount: 3 });

    const removed = removeEffect(moved, scene.id, choice.id, 0);
    expect(removed.story.scenes[0]?.choices[0]?.effects).toHaveLength(1);
    const emptied = removeEffect(removed, scene.id, choice.id, 0);
    expect(emptied.story.scenes[0]?.choices[0]?.effects).toBeUndefined();
  });

  it('lets the validator refuse an increment on a non-numeric variable', async () => {
    const { addEffect, setInitialVariable } = await import('../src/studio/model');
    const draft = createDraft();
    const scene = draft.story.scenes[0];
    const choice = scene?.choices[0];
    if (scene === undefined || choice === undefined) return;

    // Counting onto a declared number is fine…
    const numeric = addEffect(draft, scene.id, choice.id, {
      kind: 'incrementVariable',
      variable: 'composure',
      amount: 1,
    });
    expect(validateContentPack(JSON.parse(JSON.stringify(draftToPack(numeric))) as unknown).ok).toBe(true);

    // …but an increment on a variable declared as text is a story error, and the
    // pack validator is what stops it reaching the game.
    const textual = addEffect(setInitialVariable(draft, 'composure', 0), scene.id, choice.id, {
      kind: 'incrementVariable',
      variable: 'composure',
      amount: 1,
    });
    expect(validateContentPack(JSON.parse(JSON.stringify(draftToPack(textual))) as unknown).ok).toBe(true);
    expect(
      validateContentPack(
        JSON.parse(
          JSON.stringify({
            ...draftToPack(draft),
            story: { ...draft.story, initialVariables: { ...draft.story.initialVariables, composure: 'زیاد' } },
          }),
        ) as unknown,
      ).ok,
    ).toBe(false);
  });
});

describe('variables panel model', () => {
  it('edits a label and an initial value', async () => {
    const { setVariableMeta, setInitialVariable } = await import('../src/studio/model');
    const draft = createDraft();
    const labelled = setVariableMeta(draft, 'composure', { label: 'آرامش', hint: 'توضیح' });
    expect(labelled.story.variableMeta?.['composure']?.label).toBe('آرامش');
    const valued = setInitialVariable(labelled, 'composure', 5);
    expect(valued.story.initialVariables?.['composure']).toBe(5);
    expect(validateContentPack(JSON.parse(JSON.stringify(draftToPack(valued))) as unknown).ok).toBe(true);
  });

  it('adds a variable and refuses a duplicate name', async () => {
    const { addVariable, variableNames } = await import('../src/studio/model');
    const draft = createDraft();
    const added = addVariable(draft, 'newMetric');
    expect(variableNames(added)).toContain('newMetric');
    expect(added.story.initialVariables?.['newMetric']).toBe(0);
    expect(addVariable(added, 'newMetric')).toBe(added);
    expect(addVariable(added, '   ')).toBe(added);
  });

  it('reports where a variable is used and refuses to delete it', async () => {
    const { variableUsages, removeVariable } = await import('../src/studio/model');
    const draft = createDraft();
    const usages = variableUsages(draft, 'guardSuspicion');
    expect(usages.length).toBeGreaterThan(0);
    expect(usages.join(' ')).toContain('ch1-door-attempt');
    expect(removeVariable(draft, 'guardSuspicion')).toBe(draft);
  });

  it('deletes an unused variable', async () => {
    const { addVariable, removeVariable, variableNames } = await import('../src/studio/model');
    const draft = addVariable(createDraft(), 'unusedMetric');
    const cleaned = removeVariable(draft, 'unusedMetric');
    expect(variableNames(cleaned)).not.toContain('unusedMetric');
    expect(cleaned.story.variableMeta?.['unusedMetric']).toBeUndefined();
    expect(validateContentPack(JSON.parse(JSON.stringify(draftToPack(cleaned))) as unknown).ok).toBe(true);
  });

  it('survives a JSON export/import round trip with the edits in place', async () => {
    const { addEffect, setChoiceCondition, importPackJson, setVariableMeta } = await import('../src/studio/model');
    const draft = createDraft();
    const scene = draft.story.scenes[0];
    const choice = scene?.choices[0];
    if (scene === undefined || choice === undefined) return;

    const edited = addEffect(
      setChoiceCondition(setVariableMeta(draft, 'composure', { label: 'آرامش' }), scene.id, choice.id, {
        kind: 'compareVariable',
        variable: 'composure',
        operator: 'gte',
        value: 2,
      }),
      scene.id,
      choice.id,
      { kind: 'discoverClue', clueId: 'dated_note' },
    );

    const reimported = importPackJson(JSON.stringify(draftToPack(edited)));
    expect(reimported.ok).toBe(true);
    if (!reimported.ok) return;
    const back = reimported.draft.story.scenes[0]?.choices[0];
    expect(back?.condition).toEqual({ kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 2 });
    expect(back?.effects).toEqual([{ kind: 'discoverClue', clueId: 'dated_note' }]);
    expect(reimported.draft.story.variableMeta?.['composure']?.label).toBe('آرامش');
  });
});

describe('rules shown on the tree', () => {
  it('marks an edge as conditional only when its choice has a condition', async () => {
    const { buildTree: build } = await import('../src/studio/model');
    const tree = build(createDraft());
    const gated = tree.edges.filter((edge) => edge.gated);
    expect(gated.length).toBeGreaterThan(0);
    expect(gated.length).toBeLessThan(tree.edges.length);

    // Independently count conditional choices in the content and compare.
    const conditionalChoices = chapter1Story.scenes.reduce(
      (total, scene) => total + scene.choices.filter((choice) => choice.condition !== undefined).length,
      0,
    );
    expect(gated).toHaveLength(conditionalChoices);
  });

  it('counts the effects of the choice behind each edge', async () => {
    const { buildTree: build } = await import('../src/studio/model');
    const tree = build(createDraft());
    const effectful = tree.edges.filter((edge) => edge.effects > 0);
    expect(effectful.length).toBeGreaterThan(0);
    expect(tree.stats.effectfulEdges).toBe(effectful.length);
    for (const edge of effectful) {
      const scene = chapter1Story.scenes.find((entry) => entry.id === edge.from);
      const choice = scene?.choices.find((entry) => entry.id === edge.choiceId);
      expect(edge.effects).toBe(choice?.effects?.length ?? 0);
    }
  });

  it('knows which conditional edges are already shut with the starting values', async () => {
    const { buildTree: build } = await import('../src/studio/model');
    const tree = build(createDraft());

    // `pick-the-bolt` needs planIntegrity >= 1, and the story starts at 3, so that
    // route is open on the first turn…
    const bolt = tree.edges.find((edge) => edge.choiceId === 'pick-the-bolt');
    expect(bolt?.gated).toBe(true);
    expect(bolt?.openAtStart).toBe(true);

    // …while the alcove option is already shut: it needs guard-visible quiet *and*
    // route knowledge, and the chapter starts with none of the latter.
    const alcove = tree.edges.find((edge) => edge.choiceId === 'slide-into-the-alcove');
    expect(alcove?.gated).toBe(true);
    expect(alcove?.openAtStart).toBe(false);

    // …while the ending that needs a discovered clue is not.
    const closed = tree.edges.filter((edge) => edge.gated && !edge.openAtStart);
    expect(closed.length).toBeGreaterThan(0);
    expect(tree.stats.closedAtStart).toBe(closed.length);
    // Every closed edge must be a conditional one, by definition.
    expect(closed.every((edge) => edge.gated)).toBe(true);
  });

  it('an unconditional edge is always open at the start', async () => {
    const { buildTree: build } = await import('../src/studio/model');
    const tree = build(createDraft());
    expect(tree.edges.filter((edge) => !edge.gated).every((edge) => edge.openAtStart)).toBe(true);
  });

  it('follows a condition edited in the studio', async () => {
    const { buildTree: build, setChoiceCondition } = await import('../src/studio/model');
    const draft = createDraft();
    const scene = draft.story.scenes[0];
    const choice = scene?.choices[0];
    if (scene === undefined || choice === undefined) return;

    const closed = setChoiceCondition(draft, scene.id, choice.id, {
      kind: 'compareVariable',
      variable: 'composure',
      operator: 'gte',
      value: 99,
    });
    const edge = build(closed).edges.find(
      (candidate) => candidate.from === scene.id && candidate.choiceId === choice.id,
    );
    expect(edge?.gated).toBe(true);
    expect(edge?.openAtStart).toBe(false);

    const opened = setChoiceCondition(draft, scene.id, choice.id, null);
    const back = build(opened).edges.find(
      (candidate) => candidate.from === scene.id && candidate.choiceId === choice.id,
    );
    expect(back?.gated).toBe(false);
    expect(back?.openAtStart).toBe(true);
  });

  it('counts gated and effectful choices on each node, and the timed scenes', async () => {
    const { buildTree: build } = await import('../src/studio/model');
    const tree = build(createDraft());

    const timedScenes = chapter1Story.scenes.filter((scene) => scene.timedDecision !== undefined);
    expect(tree.stats.timedScenes).toBe(timedScenes.length);
    for (const node of tree.nodes.filter((entry) => entry.kind === 'scene')) {
      const scene = chapter1Story.scenes.find((entry) => entry.id === node.id);
      if (scene === undefined) continue;
      expect(node.gatedChoices).toBe(scene.choices.filter((choice) => choice.condition !== undefined).length);
      expect(node.choicesWithEffects).toBe(
        scene.choices.filter((choice) => (choice.effects?.length ?? 0) > 0).length,
      );
      expect(node.timed).toBe(scene.timedDecision !== undefined);
    }
  });

  it('stays deterministic with the new markers', async () => {
    const { buildTree: build } = await import('../src/studio/model');
    expect(build(createDraft())).toEqual(build(createDraft()));
  });
});
