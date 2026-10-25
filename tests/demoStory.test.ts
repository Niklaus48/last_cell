/**
 * Integration test for the development-only demonstration story
 * (src/story/content/demoStory.ts). Still no React: the engine is driven directly.
 */
import { describe, expect, it } from 'vitest';
import { createStoryEngine, validateStory } from '../src/story/engine';
import { demoStory, DEMO_ENDING_IDS, DEMO_SCENE_IDS } from '../src/story/content/demoStory';
import { getStory } from '../src/story/content';

describe('demo story', () => {
  it('is structurally valid and registered in the content registry', () => {
    expect(validateStory(demoStory).ok).toBe(true);
    expect(getStory('demo')).toBe(demoStory);
  });

  it('starts at scene ۱ (سلول ۱۴) with two choices', () => {
    const engine = createStoryEngine(demoStory);
    const state = engine.start();

    expect(state.currentSceneId).toBe(DEMO_SCENE_IDS.arrival);
    expect(engine.getAvailableChoices(state).map((choice) => choice.id)).toEqual([
      'speak',
      'stay-silent',
    ]);
  });

  it('reaches the interrogation scene by speaking up', () => {
    const engine = createStoryEngine(demoStory);
    const result = engine.choose(engine.start(), 'speak');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.currentSceneId).toBe(DEMO_SCENE_IDS.interrogation);
    expect(result.state.variables['suspicion']).toBe(1);
  });

  it('reaches the silence ending when the player keeps quiet', () => {
    const engine = createStoryEngine(demoStory);
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
    const engine = createStoryEngine(demoStory);
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

  it('hides the conditional lawyer choice until suspicion is high enough', () => {
    const engine = createStoryEngine(demoStory);
    const spoken = engine.choose(engine.start(), 'speak');
    expect(spoken.ok).toBe(true);
    if (!spoken.ok) return;

    // suspicion === 1 at this point, so the conditional choice is available.
    expect(engine.isChoiceAvailable(spoken.state, 'demand-lawyer')).toBe(true);

    // Arriving at the interrogation scene without the suspicion effect hides it.
    const direct = { ...engine.start(), currentSceneId: DEMO_SCENE_IDS.interrogation };
    expect(engine.isChoiceAvailable(direct, 'demand-lawyer')).toBe(false);
    expect(engine.getAvailableChoices(direct).map((choice) => choice.id)).toEqual([
      'lie',
      'reveal',
    ]);
  });

  it('ignores invalid choice ids without changing the state', () => {
    const engine = createStoryEngine(demoStory);
    const state = engine.start();
    const result = engine.choose(state, 'not-a-real-choice');

    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
  });
});
