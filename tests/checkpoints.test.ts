/**
 * Checkpoint creation/restoration and recoverable-vs-terminal failure tests.
 * Engine-only: no React, no DOM, no browser storage.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createStoryEngine } from '../src/story/engine';
import type { Checkpoint, StoryEngine, StoryState } from '../src/story/engine';
import {
  makeTestStory,
  TEST_CHECKPOINT_IDS,
  TEST_CLUE_IDS,
  TEST_FAILURE_IDS,
  TEST_SCENE_IDS,
} from './fixtures/testStory';

function setup(): { engine: StoryEngine; state: StoryState } {
  const engine = createStoryEngine(makeTestStory());
  return { engine, state: engine.start() };
}

/** Walks to the fork (a declared checkpoint opportunity). */
function atFork(engine: StoryEngine): StoryState {
  const result = engine.choose(engine.start(), 'go-fork');
  if (!result.ok) throw new Error(`fixture walk failed: ${result.error.code}`);
  return result.state;
}

describe('checkpoint opportunities', () => {
  it('reports the checkpoint a scene declares', () => {
    const { engine, state } = setup();
    expect(engine.getCheckpointOpportunity(state)?.id).toBe(TEST_CHECKPOINT_IDS.start);

    const fork = atFork(engine);
    expect(engine.getCheckpointOpportunity(fork)?.id).toBe(TEST_CHECKPOINT_IDS.fork);
  });

  it('does not invent checkpoints for scenes that declare none', () => {
    const { engine, state } = setup();
    const found = engine.choose(state, 'find-note');
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    const hidden = engine.choose(found.state, 'note-path');
    expect(hidden.ok).toBe(true);
    if (!hidden.ok) return;

    expect(hidden.state.currentSceneId).toBe(TEST_SCENE_IDS.hidden);
    expect(engine.getCheckpointOpportunity(hidden.state)).toBeNull();
    const created = engine.createCheckpoint(hidden.state);
    expect(created.ok).toBe(false);
    if (created.ok) return;
    expect(created.error.code).toBe('CHECKPOINT_UNAVAILABLE');
  });
});

describe('creating checkpoints', () => {
  it('snapshots the current state as a serialisable checkpoint', () => {
    const { engine } = setup();
    const state = atFork(engine);
    const created = engine.createCheckpoint(state);

    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const checkpoint = created.checkpoint;
    expect(checkpoint.checkpointId).toBe(TEST_CHECKPOINT_IDS.fork);
    expect(checkpoint.storyId).toBe('fixture-story');
    expect(checkpoint.sceneId).toBe(TEST_SCENE_IDS.fork);
    expect(checkpoint.step).toBe(state.history.length);
    expect(checkpoint.state.variables).toEqual({ courage: 2 });

    // JSON-safe: no functions, no cycles.
    expect(JSON.parse(JSON.stringify(checkpoint))).toEqual(checkpoint);
  });

  it('is a snapshot, not a live reference to later state', () => {
    const { engine } = setup();
    const state = atFork(engine);
    const created = engine.createCheckpoint(state);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const next = engine.choose(state, 'trigger-trap');
    expect(next.ok).toBe(true);

    expect(created.checkpoint.state.currentSceneId).toBe(TEST_SCENE_IDS.fork);
    expect(created.checkpoint.state.variables).toEqual({ courage: 2 });
  });

  it('rejects an undeclared checkpoint id', () => {
    const { engine, state } = setup();
    const result = engine.createCheckpoint(state, 'cp-ghost');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('UNKNOWN_CHECKPOINT');
  });

  it('rejects a declared checkpoint that belongs to another scene', () => {
    const { engine, state } = setup();
    const result = engine.createCheckpoint(state, TEST_CHECKPOINT_IDS.fork);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('CHECKPOINT_UNAVAILABLE');
    expect(result.error.checkpointId).toBe(TEST_CHECKPOINT_IDS.fork);
  });

  it('refuses to checkpoint a finished run', () => {
    const { engine, state } = setup();
    const ended = engine.choose(state, 'stop');
    expect(ended.ok).toBe(true);
    if (!ended.ok) return;

    const result = engine.createCheckpoint(ended.state);
    expect(result.ok).toBe(false);
  });
});

describe('restoring checkpoints', () => {
  let engine: StoryEngine;
  let checkpoint: Checkpoint;

  beforeEach(() => {
    const setupResult = setup();
    engine = setupResult.engine;
    const created = engine.createCheckpoint(atFork(engine));
    if (!created.ok) throw new Error('fixture checkpoint failed');
    checkpoint = created.checkpoint;
  });

  it('restores the snapshot the checkpoint holds', () => {
    const restored = engine.restoreCheckpoint(checkpoint);

    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.state).toEqual(checkpoint.state);
    expect(restored.state.currentSceneId).toBe(TEST_SCENE_IDS.fork);
    expect(restored.state.progress).toEqual({ status: 'playing' });
  });

  it('does not mutate or alias the checkpoint it restores from', () => {
    const restored = engine.restoreCheckpoint(checkpoint);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;

    // Mutating the returned state must not reach into the checkpoint.
    (restored.state.variables as Record<string, unknown>)['courage'] = 999;
    expect(checkpoint.state.variables['courage']).toBe(2);
    expect(engine.restoreCheckpoint(checkpoint).ok).toBe(true);
  });

  it('rejects tampered checkpoints without throwing', () => {
    const tampered = {
      ...checkpoint,
      state: { ...checkpoint.state, currentSceneId: 's-ghost' },
    };
    const result = engine.restoreCheckpoint(tampered);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('INVALID_SNAPSHOT');
    expect(result.error.detail?.join(' ')).toContain('s-ghost');
  });

  it('rejects a checkpoint for an unknown story or version', () => {
    expect(engine.restoreCheckpoint({ ...checkpoint, storyId: 'other-story' }).ok).toBe(false);
    expect(engine.restoreCheckpoint({ ...checkpoint, schemaVersion: 99 }).ok).toBe(false);
    expect(engine.restoreCheckpoint('not json').ok).toBe(false);
  });
});

describe('failures', () => {
  it('reports a recoverable failure as a typed outcome, not an exception', () => {
    const { engine } = setup();
    const state = atFork(engine);
    const result = engine.choose(state, 'trigger-trap');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transition).toEqual({
      type: 'failure',
      fromSceneId: TEST_SCENE_IDS.fork,
      failureId: TEST_FAILURE_IDS.recoverable,
    });
    expect(result.state.progress).toEqual({
      status: 'failed',
      failureId: TEST_FAILURE_IDS.recoverable,
    });
    // The failure's own effects are kept: the run failed *after* them.
    expect(result.state.variables['courage']).toBe(7);
    expect(result.changes.variableChanges).toEqual([
      { variable: 'courage', before: 2, after: 7 },
    ]);
  });

  it('exposes the failure record and its recovery target', () => {
    const { engine } = setup();
    const failed = engine.choose(atFork(engine), 'trigger-trap');
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;

    const failure = engine.getFailure(failed.state);
    expect(failure?.id).toBe(TEST_FAILURE_IDS.recoverable);
    expect(failure?.kind).toBe('recoverable');
    expect(engine.getRecoveryTarget(failed.state)).toEqual({
      type: 'checkpoint',
      checkpointId: TEST_CHECKPOINT_IDS.fork,
    });
    // A failure is not an ending.
    expect(engine.getEnding(failed.state)).toBeNull();
    expect(engine.getAvailableChoices(failed.state)).toEqual([]);
  });

  it('does not treat a terminal failure as a recoverable one', () => {
    const { engine, state } = setup();
    const found = engine.choose(state, 'find-note');
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    const hidden = engine.choose(found.state, 'note-path');
    expect(hidden.ok).toBe(true);
    if (!hidden.ok) return;
    const failed = engine.choose(hidden.state, 'final-trap');
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;

    expect(engine.getFailure(failed.state)?.kind).toBe('terminal');
    expect(engine.getRecoveryTarget(failed.state)).toBeNull();
    expect(engine.getEnding(failed.state)).toBeNull();

    const created = engine.createCheckpoint(state, TEST_CHECKPOINT_IDS.start);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const recovered = engine.recover(failed.state, created.checkpoint);
    expect(recovered.ok).toBe(false);
    if (recovered.ok) return;
    expect(recovered.error.code).toBe('NO_RECOVERY_TARGET');
  });

  it('blocks further choices while failed', () => {
    const { engine } = setup();
    const failed = engine.choose(atFork(engine), 'trigger-trap');
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;

    const result = engine.choose(failed.state, 'coward-path');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('GAME_FAILED');
    expect(result.state).toBe(failed.state);
  });
});

describe('recovery', () => {
  it('restores the checkpoint the failure points at', () => {
    const { engine, state } = setup();
    const startCheckpoint = engine.createCheckpoint(state);
    expect(startCheckpoint.ok).toBe(true);
    if (!startCheckpoint.ok) return;

    const fork = atFork(engine);
    const forkCheckpoint = engine.createCheckpoint(fork);
    expect(forkCheckpoint.ok).toBe(true);
    if (!forkCheckpoint.ok) return;

    const failed = engine.choose(fork, 'trigger-trap');
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;

    const recovered = engine.recover(failed.state, forkCheckpoint.checkpoint);
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;
    expect(recovered.state.currentSceneId).toBe(TEST_SCENE_IDS.fork);
    expect(recovered.state.progress).toEqual({ status: 'playing' });
  });

  it('keeps progress made before the checkpoint and drops what came after', () => {
    const { engine, state } = setup();
    // Discover a clue *before* walking to the fork: it must survive recovery.
    const withClue = engine.choose(state, 'find-note');
    expect(withClue.ok).toBe(true);
    if (!withClue.ok) return;

    const fork = atFork(engine);
    const forkCheckpoint = engine.createCheckpoint(fork);
    expect(forkCheckpoint.ok).toBe(true);
    if (!forkCheckpoint.ok) return;

    const failed = engine.choose(fork, 'trigger-trap');
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    expect(failed.state.variables['courage']).toBe(7);

    const recovered = engine.recover(failed.state, forkCheckpoint.checkpoint);
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;

    // Pre-checkpoint state is intact…
    expect(recovered.state.variables['courage']).toBe(2);
    expect(engine.getHistory(recovered.state)).toEqual(forkCheckpoint.checkpoint.state.history);
    // …and the failure's post-checkpoint increment is gone.
    expect(recovered.state.variables['courage']).not.toBe(7);
  });

  it('preserves clues discovered before the checkpoint', () => {
    const { engine } = setup();
    // Walk: start --find-note--> fork (clue discovered, then checkpoint).
    const discovered = engine.choose(engine.start(), 'find-note');
    expect(discovered.ok).toBe(true);
    if (!discovered.ok) return;
    expect(engine.hasClue(discovered.state, TEST_CLUE_IDS.note)).toBe(true);

    const checkpoint = engine.createCheckpoint(discovered.state);
    expect(checkpoint.ok).toBe(true);
    if (!checkpoint.ok) return;

    const failed = engine.choose(discovered.state, 'trigger-trap');
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;

    const recovered = engine.recover(failed.state, checkpoint.checkpoint);
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;
    expect(engine.hasClue(recovered.state, TEST_CLUE_IDS.note)).toBe(true);
    expect(engine.getDiscoveredClues(recovered.state)[0]?.id).toBe(TEST_CLUE_IDS.note);
  });

  it('rejects recovery from a state that did not fail', () => {
    const { engine, state } = setup();
    const created = engine.createCheckpoint(state);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = engine.recover(state, created.checkpoint);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('NOT_FAILED');
  });

  it('rejects a checkpoint that is not the failure’s target', () => {
    const { engine, state } = setup();
    const startCheckpoint = engine.createCheckpoint(state);
    expect(startCheckpoint.ok).toBe(true);
    if (!startCheckpoint.ok) return;

    const failed = engine.choose(atFork(engine), 'trigger-trap');
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;

    const recovered = engine.recover(failed.state, startCheckpoint.checkpoint);
    expect(recovered.ok).toBe(false);
    if (recovered.ok) return;
    expect(recovered.error.code).toBe('CHECKPOINT_MISMATCH');
  });

  it('rejects a corrupted checkpoint during recovery', () => {
    const { engine } = setup();
    const fork = atFork(engine);
    const created = engine.createCheckpoint(fork);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const failed = engine.choose(fork, 'trigger-trap');
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;

    const corrupted = { ...created.checkpoint, state: { ...created.checkpoint.state, storyId: 'x' } };
    const recovered = engine.recover(failed.state, corrupted);
    expect(recovered.ok).toBe(false);
    if (recovered.ok) return;
    expect(recovered.error.code).toBe('INVALID_SNAPSHOT');
  });

  it('does not recover automatically: the failed state stays until asked', () => {
    const { engine } = setup();
    const fork = atFork(engine);
    const created = engine.createCheckpoint(fork);
    expect(created.ok).toBe(true);

    const failed = engine.choose(fork, 'trigger-trap');
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;

    expect(failed.state.progress).toEqual({
      status: 'failed',
      failureId: TEST_FAILURE_IDS.recoverable,
    });
    expect(engine.getCurrentScene(failed.state).id).toBe(TEST_SCENE_IDS.fork);
  });
});
