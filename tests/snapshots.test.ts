/**
 * State-snapshot tests: JSON safety, validation of untrusted input, and
 * independence from the objects handed in.
 */
import { describe, expect, it } from 'vitest';
import { createStoryEngine, STATE_SCHEMA_VERSION } from '../src/story/engine';
import type { StoryEngine, StoryState } from '../src/story/engine';
import { makeTestStory, TEST_CLUE_IDS, TEST_SCENE_IDS } from './fixtures/testStory';

function advancedState(engine: StoryEngine): StoryState {
  const discovered = engine.choose(engine.start(), 'find-note');
  if (!discovered.ok) throw new Error('fixture walk failed');
  return discovered.state;
}

describe('serialisation', () => {
  it('round-trips through JSON without losing anything', () => {
    const engine = createStoryEngine(makeTestStory());
    const state = advancedState(engine);

    const json = engine.serializeState(state);
    const restored = engine.restoreSnapshot(json);

    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.state).toEqual(state);
    expect(JSON.parse(json)).toEqual(state);
  });

  it('contains only JSON-safe primitives and arrays', () => {
    const engine = createStoryEngine(makeTestStory());
    const state = advancedState(engine);
    const parsed: unknown = JSON.parse(engine.serializeState(state));

    const walk = (value: unknown, path: string): void => {
      if (value === null) return;
      const type = typeof value;
      if (type === 'string' || type === 'number' || type === 'boolean') return;
      if (Array.isArray(value)) {
        value.forEach((item, index) => walk(item, `${path}[${index}]`));
        return;
      }
      if (type === 'object') {
        for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
          walk(child, `${path}.${key}`);
        }
        return;
      }
      throw new Error(`${path} is a ${type}, which is not JSON-safe`);
    };
    expect(() => walk(parsed, 'state')).not.toThrow();
  });

  it('stamps the schema version so future formats can be rejected', () => {
    const engine = createStoryEngine(makeTestStory());
    expect(engine.start().schemaVersion).toBe(STATE_SCHEMA_VERSION);
  });
});

describe('restoration', () => {
  it('returns a state independent of the input snapshot', () => {
    const engine = createStoryEngine(makeTestStory());
    const state = advancedState(engine);
    const snapshot = structuredClone(state);

    const restored = engine.restoreSnapshot(snapshot);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;

    // Mutating the returned state must not leak into the snapshot we passed in.
    (restored.state.discoveredClueIds as string[]).push('c-injected');
    (restored.state.variables as Record<string, unknown>)['courage'] = 42;

    expect(snapshot.discoveredClueIds).toEqual([TEST_CLUE_IDS.note]);
    expect(snapshot.variables['courage']).toBe(0);
    expect(restored.state.discoveredClueIds).toContain('c-injected');
  });

  it('keeps discovered clues and history intact', () => {
    const engine = createStoryEngine(makeTestStory());
    const state = advancedState(engine);
    const restored = engine.restoreSnapshot(engine.serializeState(state));

    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.state.discoveredClueIds).toEqual([TEST_CLUE_IDS.note]);
    expect(restored.state.history).toEqual([
      { sceneId: TEST_SCENE_IDS.start, choiceId: null },
      { sceneId: TEST_SCENE_IDS.start, choiceId: 'find-note' },
      { sceneId: TEST_SCENE_IDS.fork, choiceId: null },
    ]);
    // Derived path survives a round-trip.
    expect(engine.getVisitedSceneIds(restored.state)).toEqual([
      TEST_SCENE_IDS.start,
      TEST_SCENE_IDS.fork,
    ]);
  });

  it('reports every problem found instead of throwing', () => {
    const engine = createStoryEngine(makeTestStory());
    const result = engine.restoreSnapshot({
      schemaVersion: 7,
      storyId: 'someone-elses-story',
      currentSceneId: 's-ghost',
      progress: { status: 'exploded' },
      variables: { broken: { nested: true } },
      discoveredClueIds: ['c-undeclared', 'c-undeclared'],
      history: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_SNAPSHOT');
    const detail = result.error.detail?.join('\n') ?? '';
    expect(detail).toContain('schemaVersion');
    expect(detail).toContain('storyId');
    expect(detail).toContain('s-ghost');
    expect(detail).toContain('progress.status');
    expect(detail).toContain('variables.broken');
    expect(detail).toContain('c-undeclared');
    expect(detail).toContain('history');
  });

  it('rejects snapshots for each documented failure mode', () => {
    const engine = createStoryEngine(makeTestStory());
    const good = advancedState(engine);
    const bad = (patch: Record<string, unknown>): boolean =>
      engine.restoreSnapshot({ ...good, ...patch }).ok;

    expect(bad({ schemaVersion: 2 })).toBe(false);
    expect(bad({ storyId: 'other' })).toBe(false);
    expect(bad({ currentSceneId: 's-ghost' })).toBe(false);
    expect(bad({ progress: { status: 'ended', endingId: 'e-ghost' } })).toBe(false);
    expect(bad({ progress: { status: 'failed', failureId: 'f-ghost' } })).toBe(false);
    expect(bad({ variables: { courage: null } })).toBe(false);
    expect(bad({ variables: { courage: [1] } })).toBe(false);
    expect(bad({ discoveredClueIds: 'c-note' })).toBe(false);
    expect(bad({ discoveredClueIds: ['c-undeclared'] })).toBe(false);
    expect(bad({ discoveredClueIds: ['c-note', 'c-note'] })).toBe(false);
    expect(bad({ history: [] })).toBe(false);
    expect(bad({ history: [{ sceneId: 's-ghost', choiceId: null }] })).toBe(false);
    expect(bad({ history: [{ sceneId: TEST_SCENE_IDS.start, choiceId: 'not-a-choice' }] })).toBe(false);
    // history must end at the current scene
    expect(bad({ currentSceneId: TEST_SCENE_IDS.start })).toBe(false);
    // everything unmodified is accepted
    expect(bad({})).toBe(true);
  });

  it('rejects non-object and malformed JSON input', () => {
    const engine = createStoryEngine(makeTestStory());
    expect(engine.restoreSnapshot('{oops').ok).toBe(false);
    expect(engine.restoreSnapshot('null').ok).toBe(false);
    expect(engine.restoreSnapshot(42).ok).toBe(false);
    expect(engine.restoreSnapshot(undefined).ok).toBe(false);
  });

  it('accepts valid JSON text as well as already-parsed objects', () => {
    const engine = createStoryEngine(makeTestStory());
    const state = advancedState(engine);
    expect(engine.restoreSnapshot(engine.serializeState(state)).ok).toBe(true);
    expect(engine.restoreSnapshot(structuredClone(state)).ok).toBe(true);
  });

  it('keeps the strict restore() helper throwing for programming errors', () => {
    const engine = createStoryEngine(makeTestStory());
    const state = advancedState(engine);

    expect(engine.restore(state)).toEqual(state);
    expect(() => engine.restore({ ...state, storyId: 'other-story' })).toThrow(/Cannot restore/);
    expect(() => engine.restore({ ...state, currentSceneId: 's-ghost' })).toThrow(
      /is not a scene in this story/,
    );
  });

  it('refuses a snapshot whose history contradicts the current scene', () => {
    const engine = createStoryEngine(makeTestStory());
    const state = advancedState(engine);
    const result = engine.restoreSnapshot({
      ...state,
      currentSceneId: TEST_SCENE_IDS.hidden,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.detail?.join(' ')).toContain('history ends at');
  });
});
