/**
 * Integration test for the development-only demonstration story
 * (src/story/content/demoStory.ts). Still no React: the engine is driven directly.
 */
import { describe, expect, it } from 'vitest';
import { createStoryEngine, validateStory } from '../src/story/engine';
import {
  demoStory,
  DEMO_CHECKPOINT_IDS,
  DEMO_CLUE_IDS,
  DEMO_ENDING_IDS,
  DEMO_FAILURE_IDS,
  DEMO_SCENE_IDS,
} from '../src/story/content/demoStory';
import { getStory } from '../src/story/content';

function demoEngine() {
  return createStoryEngine(demoStory);
}

describe('demo story', () => {
  it('is structurally valid and registered in the content registry', () => {
    expect(validateStory(demoStory).ok).toBe(true);
    expect(getStory('demo')).toBe(demoStory);
  });

  it('starts at scene ۱ (سلول ۱۴) with two choices', () => {
    const engine = demoEngine();
    const state = engine.start();

    expect(state.currentSceneId).toBe(DEMO_SCENE_IDS.arrival);
    expect(engine.getAvailableChoices(state).map((choice) => choice.id)).toEqual([
      'speak',
      'stay-silent',
    ]);
    expect(engine.getCheckpointOpportunity(state)).toBeNull();
  });

  it('reaches the interrogation scene by speaking up', () => {
    const engine = demoEngine();
    const result = engine.choose(engine.start(), 'speak');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.currentSceneId).toBe(DEMO_SCENE_IDS.interrogation);
    expect(result.state.variables['suspicion']).toBe(1);
  });

  it('reaches the silence ending when the player keeps quiet', () => {
    const engine = demoEngine();
    const path = engine.choose(engine.start(), 'stay-silent');
    expect(path.ok).toBe(true);
    if (!path.ok) return;

    const result = engine.choose(path.state, 'keep-quiet');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.progress).toEqual({
      status: 'ended',
      endingId: DEMO_ENDING_IDS.closure,
    });
    expect(engine.getEnding(result.state)?.tone).toBe('ambiguous');
  });

  it('reaches a different ending for a different choice (branching works)', () => {
    const engine = demoEngine();
    const spoken = engine.choose(engine.start(), 'speak');
    expect(spoken.ok).toBe(true);
    if (!spoken.ok) return;

    const lied = engine.choose(spoken.state, 'lie');
    expect(lied.ok).toBe(true);
    if (!lied.ok) return;
    expect(lied.state.progress).toEqual({
      status: 'ended',
      endingId: DEMO_ENDING_IDS.brokenStory,
    });

    const truthful = engine.choose(spoken.state, 'reveal');
    expect(truthful.ok).toBe(true);
    if (!truthful.ok) return;
    expect(truthful.state.progress).toEqual({
      status: 'ended',
      endingId: DEMO_ENDING_IDS.smallTruth,
    });
  });

  it('gates choices on variables and clues', () => {
    const engine = demoEngine();
    const spoken = engine.choose(engine.start(), 'speak');
    expect(spoken.ok).toBe(true);
    if (!spoken.ok) return;

    // suspicion === 1 → the lawyer choice is available; no clue → note choice is not.
    expect(engine.isChoiceAvailable(spoken.state, 'demand-lawyer')).toBe(true);
    expect(engine.isChoiceAvailable(spoken.state, 'ask-note')).toBe(false);

    // Arriving at the interrogation scene without the suspicion effect hides it.
    const direct = { ...engine.start(), currentSceneId: DEMO_SCENE_IDS.interrogation };
    expect(engine.isChoiceAvailable(direct, 'demand-lawyer')).toBe(false);
    expect(engine.getAvailableChoices(direct).map((choice) => choice.id)).toEqual([
      'lie',
      'reveal',
      'press-guard',
    ]);
  });

  it('discovers a clue and then unlocks the clue-gated choice', () => {
    const engine = demoEngine();
    const silent = engine.choose(engine.start(), 'stay-silent');
    expect(silent.ok).toBe(true);
    if (!silent.ok) return;

    const read = engine.choose(silent.state, 'read-file');
    expect(read.ok).toBe(true);
    if (!read.ok) return;

    expect(read.changes.discoveredClueIds).toEqual([DEMO_CLUE_IDS.foldedNote]);
    expect(engine.getDiscoveredClues(read.state)[0]?.label).toBe('یادداشت تاشده');
    expect(engine.isChoiceAvailable(read.state, 'ask-note')).toBe(true);
  });

  it('offers the declared checkpoint in the corridor scene only', () => {
    const engine = demoEngine();
    const silent = engine.choose(engine.start(), 'stay-silent');
    expect(silent.ok).toBe(true);
    if (!silent.ok) return;

    const opportunity = engine.getCheckpointOpportunity(silent.state);
    expect(opportunity?.id).toBe(DEMO_CHECKPOINT_IDS.corridor);
    expect(opportunity?.label).toBe('راهروی بند');

    const checkpoint = engine.createCheckpoint(silent.state);
    expect(checkpoint.ok).toBe(true);
  });

  it('fails recoverably and recovers to the corridor checkpoint', () => {
    const engine = demoEngine();
    const silent = engine.choose(engine.start(), 'stay-silent');
    expect(silent.ok).toBe(true);
    if (!silent.ok) return;

    const checkpoint = engine.createCheckpoint(silent.state);
    expect(checkpoint.ok).toBe(true);
    if (!checkpoint.ok) return;

    const read = engine.choose(silent.state, 'read-file');
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(engine.hasClue(read.state, DEMO_CLUE_IDS.foldedNote)).toBe(true);

    const failed = engine.choose(read.state, 'press-guard');
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;

    expect(failed.transition).toEqual({
      type: 'failure',
      fromSceneId: DEMO_SCENE_IDS.interrogation,
      failureId: DEMO_FAILURE_IDS.guardAlert,
    });
    expect(engine.getFailure(failed.state)?.kind).toBe('recoverable');
    expect(engine.getEnding(failed.state)).toBeNull();

    const recovered = engine.recover(failed.state, checkpoint.checkpoint);
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;
    expect(recovered.state.currentSceneId).toBe(DEMO_SCENE_IDS.silence);
    expect(recovered.state.progress).toEqual({ status: 'playing' });
    // The clue was found *after* the checkpoint, so recovery rolls it back.
    expect(engine.hasClue(recovered.state, DEMO_CLUE_IDS.foldedNote)).toBe(false);
  });

  it('ignores invalid choice ids without changing the state', () => {
    const engine = demoEngine();
    const state = engine.start();
    const result = engine.choose(state, 'not-a-real-choice');

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
  });
});
