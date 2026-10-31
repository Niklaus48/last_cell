/**
 * The «صحنهٔ n» counter must count scenes the player actually reached.
 *
 * The engine stores two history entries per scene (arrival + chosen option), so
 * deriving the counter from `history.length` made it jump 1 → 3 → 5. This pins
 * the corrected derivation, including revisits and terminal scenes.
 */
import { describe, expect, it } from 'vitest';
import { createStoryEngine } from '../src/story/engine';
import { toSceneViewModel } from '../src/story/state/sceneView';
import { chapter1Story } from '../src/story/content/chapter1';
import { demoStory } from '../src/story/content';

const engine = createStoryEngine(chapter1Story);

function stepAt(choiceIds: readonly string[]): readonly number[] {
  let state = engine.start();
  const steps = [toSceneViewModel(engine.getCurrentScene(state), [], state.history).step];
  for (const choiceId of choiceIds) {
    const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId });
    if (!result.ok) {
      throw new Error(`${state.currentSceneId} → ${choiceId}: ${result.error.code}`);
    }
    state = result.state;
    steps.push(toSceneViewModel(engine.getCurrentScene(state), [], state.history).step);
  }
  return steps;
}

describe('scene position counter', () => {
  it('starts at 1 on the opening scene', () => {
    const state = engine.start();
    expect(toSceneViewModel(engine.getCurrentScene(state), [], state.history).step).toBe(1);
  });

  it('increases by exactly one per scene change', () => {
    expect(stepAt(['test-the-bar', 'leave-it', 'stay-silent'])).toEqual([1, 2, 3, 4]);
    expect(stepAt(['listen-to-the-corridor', 'go-back-to-the-bed'])).toEqual([1, 2, 3]);
  });

  it('never reports the doubled history length', () => {
    let state = engine.start();
    for (const choiceId of ['test-the-bar', 'leave-it'] as const) {
      const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId });
      if (!result.ok) throw new Error(choiceId);
      state = result.state;
    }
    const view = toSceneViewModel(engine.getCurrentScene(state), [], state.history);
    expect(state.history.length).toBe(5);
    expect(view.step).toBe(3);
  });

  it('counts a revisit as a new position on the path', () => {
    // Two scenes, then back to the first: the path is three steps long.
    const steps = stepAt(['test-the-bar', 'leave-it']);
    expect(steps).toEqual([1, 2, 3]);
  });
});

describe('the demo fixture behaves the same way', () => {
  it('counts transitions, not entries', () => {
    const demo = createStoryEngine(demoStory);
    const first = demo.start();
    expect(toSceneViewModel(demo.getCurrentScene(first), [], first.history).step).toBe(1);

    const choice = demo.getAvailableChoices(first)[0];
    if (choice === undefined) throw new Error('demo story has no opening choice');
    const next = demo.choose(first, { sceneId: first.currentSceneId, choiceId: choice.id });
    if (!next.ok) throw new Error(next.error.code);
    expect(toSceneViewModel(demo.getCurrentScene(next.state), [], next.state.history).step).toBe(2);
  });
});
