/**
 * Story engine unit tests.
 *
 * These tests import ONLY the engine and its types — no React, no UI modules,
 * no DOM. They run in Vitest's default `node` environment, which is itself
 * proof that the engine is framework-independent.
 */
import { describe, expect, it } from 'vitest';
import { createStoryEngine, startStory } from '../src/story/engine';
import type { StoryState } from '../src/story/engine';
import { makeTestStory, TEST_ENDING_IDS, TEST_SCENE_IDS } from './fixtures/testStory';

function createFixtureEngine() {
  return createStoryEngine(makeTestStory());
}

describe('initialisation', () => {
  it('creates a new game from a valid story definition', () => {
    const { engine, state } = startStory(makeTestStory());

    expect(engine.story.id).toBe('fixture-story');
    expect(state.storyId).toBe('fixture-story');
    expect(state.progress).toEqual({ status: 'playing' });
    expect(state.variables).toEqual({ courage: 0 });
  });

  it('starts at the configured initial scene', () => {
    const engine = createFixtureEngine();
    const state = engine.start();

    expect(state.currentSceneId).toBe(TEST_SCENE_IDS.start);
    expect(engine.getCurrentScene(state).id).toBe(TEST_SCENE_IDS.start);
    expect(engine.getCurrentScene(state).narration).toEqual(['نخستین صحنهٔ آزمون.']);
  });

  it('seeds the initial history with the initial scene and no choice', () => {
    const state = createFixtureEngine().start();

    expect(state.history).toEqual([{ sceneId: TEST_SCENE_IDS.start, choiceId: null }]);
    expect(state.visitedSceneIds).toEqual([TEST_SCENE_IDS.start]);
  });
});

describe('transitions', () => {
  it('moves to the expected destination for a valid choice', () => {
    const engine = createFixtureEngine();
    const result = engine.choose(engine.start(), 'go-fork');

    expect(result.ok).toBe(true);
    if (!result.ok) return; // narrows the union for TypeScript

    expect(result.state.currentSceneId).toBe(TEST_SCENE_IDS.fork);
    expect(result.choice.id).toBe('go-fork');
    expect(result.transition).toEqual({
      type: 'scene',
      fromSceneId: TEST_SCENE_IDS.start,
      toSceneId: TEST_SCENE_IDS.fork,
    });
  });

  it('applies declarative effects without mutating the previous state', () => {
    const engine = createFixtureEngine();
    const before = engine.start();
    const result = engine.choose(before, 'go-fork');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.variables).toEqual({ courage: 2 });
    expect(before.variables).toEqual({ courage: 0 });
    expect(before.currentSceneId).toBe(TEST_SCENE_IDS.start);
    expect(before.history).toHaveLength(1);
  });

  it('records successful transitions in scene history', () => {
    const engine = createFixtureEngine();
    const first = engine.choose(engine.start(), 'go-fork');
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(first.state.history).toEqual([
      { sceneId: TEST_SCENE_IDS.start, choiceId: null },
      { sceneId: TEST_SCENE_IDS.start, choiceId: 'go-fork' },
      { sceneId: TEST_SCENE_IDS.fork, choiceId: null },
    ]);
    expect(first.state.visitedSceneIds).toEqual([TEST_SCENE_IDS.start, TEST_SCENE_IDS.fork]);
  });

  it('accepts a scene-scoped selection object', () => {
    const engine = createFixtureEngine();
    const state = engine.start();
    const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId: 'go-fork' });

    expect(result.ok).toBe(true);
  });
});

describe('invalid input handling', () => {
  it('rejects an invalid choice id without advancing the story', () => {
    const engine = createFixtureEngine();
    const state = engine.start();
    const result = engine.choose(state, 'does-not-exist');

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.error.code).toBe('INVALID_CHOICE');
    expect(result.error.choiceId).toBe('does-not-exist');
    // The returned state is the exact same snapshot: nothing was corrupted.
    expect(result.state).toBe(state);
    expect(result.state.currentSceneId).toBe(TEST_SCENE_IDS.start);
    expect(result.state.history).toHaveLength(1);
  });

  it('rejects a selection aimed at a scene the player is not in', () => {
    const engine = createFixtureEngine();
    const state = engine.start();
    const result = engine.choose(state, { sceneId: TEST_SCENE_IDS.fork, choiceId: 'brave-path' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('STALE_SCENE');
    expect(result.state.currentSceneId).toBe(TEST_SCENE_IDS.start);
  });

  it('rejects an existing choice whose condition is not satisfied', () => {
    const engine = createFixtureEngine();
    const start = engine.start();
    // Reaching the fork without the courage effect requires a hand-built state.
    const lowCourage: StoryState = { ...start, currentSceneId: TEST_SCENE_IDS.fork };
    const result = engine.choose(lowCourage, 'brave-path');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CHOICE_UNAVAILABLE');
    expect(result.state.currentSceneId).toBe(TEST_SCENE_IDS.fork);
  });

  it('filters unavailable choices out of the available list', () => {
    const engine = createFixtureEngine();
    const before = engine.start();
    const atForkNoCourage = engine.choose(before, 'go-fork');
    expect(atForkNoCourage.ok).toBe(true);
    if (!atForkNoCourage.ok) return;

    const ids = engine.getAvailableChoices(atForkNoCourage.state).map((choice) => choice.id);
    // courage is 2 → brave-path available; secret-path needs a prior visit.
    expect(ids).toEqual(['brave-path', 'coward-path']);
    expect(engine.getChoices(atForkNoCourage.state)).toHaveLength(3);
    expect(engine.isChoiceAvailable(atForkNoCourage.state, 'secret-path')).toBe(false);
  });

  it('rejects any choice once the run has ended', () => {
    const engine = createFixtureEngine();
    const ended = engine.choose(engine.start(), 'stop');
    expect(ended.ok).toBe(true);
    if (!ended.ok) return;

    const result = engine.choose(ended.state, 'go-fork');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('GAME_ENDED');
    expect(result.state).toBe(ended.state);
  });
});

describe('endings', () => {
  it('recognises an ending reached through a choice', () => {
    const engine = createFixtureEngine();
    const result = engine.choose(engine.start(), 'stop');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.transition).toEqual({
      type: 'ending',
      fromSceneId: TEST_SCENE_IDS.start,
      endingId: TEST_ENDING_IDS.bad,
    });
    expect(result.state.progress).toEqual({ status: 'ended', endingId: TEST_ENDING_IDS.bad });
    expect(engine.getEnding(result.state)?.id).toBe(TEST_ENDING_IDS.bad);
    expect(engine.getEnding(result.state)?.tone).toBe('grim');
  });

  it('reports no ending while the story is still playing', () => {
    const engine = createFixtureEngine();
    expect(engine.getEnding(engine.start())).toBeNull();
  });

  it('does not advance the current scene when the run ends', () => {
    const engine = createFixtureEngine();
    const result = engine.choose(engine.start(), 'stop');
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.currentSceneId).toBe(TEST_SCENE_IDS.start);
    expect(result.state.history.at(-1)).toEqual({
      sceneId: TEST_SCENE_IDS.start,
      choiceId: 'stop',
    });
  });
});

describe('story data', () => {
  it('exposes the validated story definition on the engine', () => {
    const engine = createFixtureEngine();
    expect(engine.story.scenes).toHaveLength(3);
    expect(engine.story.endings.map((ending) => ending.id)).toEqual([
      TEST_ENDING_IDS.good,
      TEST_ENDING_IDS.bad,
    ]);
  });

  it('treats an omitted condition as always available', () => {
    const engine = createFixtureEngine();
    expect(engine.isChoiceAvailable(engine.start(), 'stop')).toBe(true);
  });
});

describe('restore', () => {
  it('accepts a consistent snapshot and rejects a foreign one', () => {
    const engine = createFixtureEngine();
    const state = engine.start();

    expect(engine.restore(state)).toBe(state);

    expect(() => engine.restore({ ...state, storyId: 'another-story' })).toThrow(
      /Cannot restore/,
    );
    expect(() => engine.restore({ ...state, currentSceneId: 'missing-scene' })).toThrow(
      /unknown scene/,
    );
  });
});
