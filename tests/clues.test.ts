/**
 * Clue-tracking tests: discovery, de-duplication, gating, and non-leakage.
 */
import { describe, expect, it } from 'vitest';
import { createStoryEngine } from '../src/story/engine';
import type { StoryEngine, StoryState } from '../src/story/engine';
import { makeTestStory, TEST_CLUE_IDS, TEST_SCENE_IDS } from './fixtures/testStory';

function engineAndFork(): { engine: StoryEngine; state: StoryState } {
  const engine = createStoryEngine(makeTestStory());
  const result = engine.choose(engine.start(), 'find-note');
  if (!result.ok) throw new Error('fixture walk failed');
  return { engine, state: result.state };
}

describe('discovery', () => {
  it('starts with no clues', () => {
    const engine = createStoryEngine(makeTestStory());
    const state = engine.start();

    expect(state.discoveredClueIds).toEqual([]);
    expect(engine.getDiscoveredClues(state)).toEqual([]);
    expect(engine.hasClue(state, TEST_CLUE_IDS.note)).toBe(false);
  });

  it('records a discovered clue in state and reports it in the transition', () => {
    const engine = createStoryEngine(makeTestStory());
    const result = engine.choose(engine.start(), 'find-note');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.discoveredClueIds).toEqual([TEST_CLUE_IDS.note]);
    expect(result.changes.discoveredClueIds).toEqual([TEST_CLUE_IDS.note]);
    expect(engine.hasClue(result.state, TEST_CLUE_IDS.note)).toBe(true);
  });

  it('exposes full records only for discovered clues', () => {
    const { engine, state } = engineAndFork();
    const discovered = engine.getDiscoveredClues(state);

    expect(discovered).toHaveLength(1);
    expect(discovered[0]).toEqual({
      id: TEST_CLUE_IDS.note,
      label: 'یادداشت آزمون',
      detail: 'متنی که فقط پس از کشف قابل خواندن است.',
    });
  });

  it('handles re-discovery without duplicating state', () => {
    const engine = createStoryEngine(makeTestStory());
    const story = makeTestStory();

    // A second choice that rediscovers the same clue, added locally to the fixture.
    const fork = story.scenes.find((scene) => scene.id === TEST_SCENE_IDS.fork);
    if (fork === undefined) throw new Error('fixture missing fork');
    (fork.choices as unknown[]).push({
      id: 're-read-note',
      label: 'یادداشت را دوباره می‌خوانم.',
      outcome: { type: 'ending', endingId: 'e-good' },
      effects: [{ kind: 'discoverClue', clueId: TEST_CLUE_IDS.note }],
    });

    const localEngine = createStoryEngine(story);
    const first = localEngine.choose(engine.start(), 'find-note');
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = localEngine.choose(first.state, 're-read-note');
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(second.state.discoveredClueIds).toEqual([TEST_CLUE_IDS.note]);
    // Nothing new was discovered by the second choice.
    expect(second.changes.discoveredClueIds).toEqual([]);
  });
});

describe('gating and non-leakage', () => {
  it('unlocks a clue-gated choice only after discovery', () => {
    const engine = createStoryEngine(makeTestStory());
    const plain = engine.choose(engine.start(), 'go-fork');
    expect(plain.ok).toBe(true);
    if (!plain.ok) return;
    expect(engine.isChoiceAvailable(plain.state, 'note-path')).toBe(false);

    const { state } = engineAndFork();
    expect(engine.isChoiceAvailable(state, 'note-path')).toBe(true);
    expect(engine.getAvailableChoices(state).map((choice) => choice.id)).toContain('note-path');
  });

  it('does not reveal clue descriptions through the availability API', () => {
    const engine = createStoryEngine(makeTestStory());
    const plain = engine.choose(engine.start(), 'go-fork');
    expect(plain.ok).toBe(true);
    if (!plain.ok) return;

    const available = engine.getAvailableChoices(plain.state);
    const serialized = JSON.stringify(available);

    // The hidden, clue-gated choice is absent…
    expect(available.map((choice) => choice.id)).not.toContain('note-path');
    // …and no clue text leaks through what *is* returned.
    expect(serialized).not.toContain('یادداشت آزمون');
    expect(serialized).not.toContain('فقط پس از کشف');
  });

  it('keeps the clue-gated choice locked when the state says it is locked', () => {
    const engine = createStoryEngine(makeTestStory());
    const plain = engine.choose(engine.start(), 'go-fork');
    expect(plain.ok).toBe(true);
    if (!plain.ok) return;

    const result = engine.choose(plain.state, 'note-path');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CHOICE_UNAVAILABLE');
    expect(result.state).toBe(plain.state);
  });
});
