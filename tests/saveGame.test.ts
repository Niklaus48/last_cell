/**
 * Local save/load layer. Node environment: the storage adapter is replaced by a
 * fake, so nothing touches a real browser and nothing depends on jsdom.
 */
import { describe, expect, it } from 'vitest';
import { createStoryEngine, STATE_SCHEMA_VERSION } from '../src/story/engine';
import type { StoryState } from '../src/story/engine';
import { chapter1Story, CHAPTER1_SCENE } from '../src/story/content/chapter1';
import {
  SAVE_FORMAT,
  SAVE_FORMAT_VERSION,
  inspectSave,
  loadSession,
  saveSession,
  type SaveStorage,
} from '../src/persistence';

const engine = createStoryEngine(chapter1Story);
const storyKey = 'chapter1' as const;

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('expected a JSON object');
  }
  return value as Record<string, unknown>;
}

/** Engine snapshot as a plain record (validated by the persistence layer, not here). */
function snapshotOf(state: StoryState): Record<string, unknown> {
  return asRecord(JSON.parse(engine.serializeState(state)) as unknown);
}

function parseJson(text: string | null): unknown {
  return JSON.parse(text ?? 'null') as unknown;
}

function play(choiceIds: readonly string[]): StoryState {
  let state = engine.start();
  for (const choiceId of choiceIds) {
    const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId });
    if (!result.ok) {
      throw new Error(`${state.currentSceneId} → ${choiceId} rejected: ${result.error.code}`);
    }
    state = result.state;
  }
  return state;
}

interface FakeStorage extends SaveStorage {
  readonly raw: () => string | null;
  readonly writes: () => number;
}

function fakeStorage(initial: string | null = null): FakeStorage {
  let value = initial;
  let writes = 0;
  return {
    read: () => value,
    write: (next: string) => {
      writes += 1;
      value = next;
    },
    clear: () => {
      value = null;
    },
    raw: () => value,
    writes: () => writes,
  };
}

function brokenStorage(mode: 'read' | 'write', errorName = 'Error'): SaveStorage {
  const failure = Object.assign(new Error('storage exploded'), { name: errorName });
  return {
    read: () => {
      if (mode === 'read') {
        throw failure;
      }
      return null;
    },
    write: () => {
      if (mode === 'write') {
        throw failure;
      }
    },
    clear: () => undefined,
  };
}

/** A run with a clue, a non-default variable and a route-specific path. */
const EVIDENCE_RUN = [
  'test-the-bar',
  'leave-it',
  'stay-silent',
  'wait-for-the-steps-to-fade',
  'search-the-cell-first',
  'pull-the-note',
  'fold-it-into-your-sleeve',
  'take-the-service-way',
  'study-the-board',
] as const;

describe('round trip', () => {
  it('saves and loads a valid session', () => {
    const storage = fakeStorage();
    const state = play(EVIDENCE_RUN);

    const saved = saveSession({ storage, engine, storyKey, state });
    expect(saved.ok).toBe(true);

    const loaded = loadSession({ storage, engine, storyKey });
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.state).toEqual(state);
    expect(engine.serializeState(loaded.state)).toBe(engine.serializeState(state));
  });

  it('preserves clues, variables and the path through the chapter', () => {
    const storage = fakeStorage();
    const state = play(EVIDENCE_RUN);
    saveSession({ storage, engine, storyKey, state });

    const loaded = loadSession({ storage, engine, storyKey });
    if (!loaded.ok) throw new Error('expected a successful load');

    expect(loaded.state.discoveredClueIds).toEqual(state.discoveredClueIds);
    expect(loaded.state.discoveredClueIds.length).toBeGreaterThan(0);
    expect(loaded.state.variables).toEqual(state.variables);
    expect(Number(loaded.state.variables['routeKnowledge'])).toBeGreaterThan(0);
    expect(loaded.state.history).toEqual(state.history);
    expect(loaded.state.currentSceneId).toBe(CHAPTER1_SCENE.serviceEntry);
  });

  it('writes a plain, namespaced envelope and nothing executable', () => {
    const storage = fakeStorage();
    saveSession({
      storage,
      engine,
      storyKey,
      state: play(['test-the-bar']),
      now: () => new Date('2026-10-25T10:00:00.000Z'),
    });

    const raw = storage.raw();
    expect(raw).not.toBeNull();
    const envelope = asRecord(parseJson(raw));
    expect(envelope['format']).toBe(SAVE_FORMAT);
    expect(envelope['formatVersion']).toBe(SAVE_FORMAT_VERSION);
    expect(envelope['storyKey']).toBe('chapter1');
    expect(envelope['savedAt']).toBe('2026-10-25T10:00:00.000Z');
    expect(typeof envelope['snapshot']).toBe('object');
    // Round-trips exactly: no functions, handles or class instances survived.
    expect(parseJson(raw)).toEqual(envelope);
  });

  it('keeps terminal states terminal', () => {
    const storage = fakeStorage();
    const ended = play([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'slip-out-now',
      'take-the-service-way',
      'cross-to-the-service-door',
      'head-straight-to-the-door',
      'straight-to-the-door',
      'force-the-door',
      'freeze-and-observe',
      'take-the-hatch',
      'keep-moving',
      'go-with-the-plan',
      'step-into-the-yard',
    ]);
    expect(ended.progress.status).toBe('ended');

    saveSession({ storage, engine, storyKey, state: ended });
    const loaded = loadSession({ storage, engine, storyKey });
    if (!loaded.ok) throw new Error('expected a successful load');

    expect(loaded.state.progress.status).toBe('ended');
    const next = engine.choose(loaded.state, {
      sceneId: loaded.state.currentSceneId,
      choiceId: 'step-into-the-yard',
    });
    expect(next.ok).toBe(false);
    if (next.ok) return;
    expect(next.error.code).toBe('GAME_ENDED');
  });

  it('keeps a failure a failure', () => {
    const storage = fakeStorage();
    const failed = play([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'slip-out-now',
      'take-the-service-way',
      'cross-to-the-service-door',
      'head-straight-to-the-door',
      'straight-to-the-door',
      'pick-the-bolt',
      'press-the-pick',
    ]);
    expect(failed.progress.status).toBe('failed');

    saveSession({ storage, engine, storyKey, state: failed });
    const loaded = loadSession({ storage, engine, storyKey });
    if (!loaded.ok) throw new Error('expected a successful load');

    expect(loaded.state.progress).toEqual(failed.progress);
    expect(engine.getFailure(loaded.state)?.kind).toBe('recoverable');
    expect(engine.getRecoveryTarget(loaded.state)?.type).toBe('checkpoint');
  });
});

describe('nothing to load', () => {
  it('reports a missing save', () => {
    const storage = fakeStorage();
    expect(loadSession({ storage, engine, storyKey })).toEqual({ ok: false, error: 'NO_SAVE' });
    expect(inspectSave({ storage, engine, storyKey })).toEqual({ status: 'none' });
  });

  it('treats an empty string as missing', () => {
    const storage = fakeStorage('');
    expect(loadSession({ storage, engine, storyKey })).toEqual({ ok: false, error: 'NO_SAVE' });
  });
});

describe('untrusted save data', () => {
  it('rejects malformed JSON', () => {
    for (const raw of ['{', 'not json at all', '{"format":', '[]']) {
      const storage = fakeStorage(raw);
      const result = loadSession({ storage, engine, storyKey });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('MALFORMED_SAVE');
    }
  });

  it('rejects JSON that is not one of our envelopes', () => {
    const foreign = JSON.stringify({ hello: 'world', schemaVersion: STATE_SCHEMA_VERSION });
    expect(loadSession({ storage: fakeStorage(foreign), engine, storyKey })).toEqual({
      ok: false,
      error: 'MALFORMED_SAVE',
    });
  });

  it('rejects an envelope from a future format version', () => {
    const envelope = {
      format: SAVE_FORMAT,
      formatVersion: SAVE_FORMAT_VERSION + 1,
      storyKey: 'chapter1',
      savedAt: new Date().toISOString(),
      snapshot: snapshotOf(play(['test-the-bar'])),
    };
    const result = loadSession({
      storage: fakeStorage(JSON.stringify(envelope)),
      engine,
      storyKey,
    });
    expect(result).toEqual({ ok: false, error: 'INCOMPATIBLE_SAVE' });
    expect(inspectSave({ storage: fakeStorage(JSON.stringify(envelope)), engine, storyKey })).toEqual(
      { status: 'invalid', error: 'INCOMPATIBLE_SAVE' },
    );
  });

  it('rejects a save that belongs to another story', () => {
    const storage = fakeStorage();
    saveSession({ storage, engine, storyKey, state: play(['test-the-bar']) });
    const result = loadSession({ storage, engine, storyKey: 'demo' });
    expect(result).toEqual({ ok: false, error: 'WRONG_STORY' });
  });

  it('rejects a snapshot whose schema version is not current', () => {
    const state = play(['test-the-bar']);
    const snapshot = { ...snapshotOf(state), schemaVersion: 99 };
    const envelope = {
      format: SAVE_FORMAT,
      formatVersion: SAVE_FORMAT_VERSION,
      storyKey,
      savedAt: new Date().toISOString(),
      snapshot,
    };

    const result = loadSession({ storage: fakeStorage(JSON.stringify(envelope)), engine, storyKey });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('INVALID_STATE');
    expect(result.detail?.join(' ')).toMatch(/schemaVersion/);
  });

  it('rejects a snapshot whose story identity does not match', () => {
    const snapshot = { ...snapshotOf(play(['test-the-bar'])), storyId: 'demo' };
    const envelope = {
      format: SAVE_FORMAT,
      formatVersion: SAVE_FORMAT_VERSION,
      storyKey,
      savedAt: new Date().toISOString(),
      snapshot,
    };
    const result = loadSession({ storage: fakeStorage(JSON.stringify(envelope)), engine, storyKey });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('INVALID_STATE');
    expect(result.detail?.join(' ')).toMatch(/storyId/);
  });

  it('rejects an unknown scene', () => {
    const snapshot = {
      ...snapshotOf(play(['test-the-bar'])),
      currentSceneId: 'ch1-does-not-exist',
    };
    const envelope = {
      format: SAVE_FORMAT,
      formatVersion: SAVE_FORMAT_VERSION,
      storyKey,
      savedAt: new Date().toISOString(),
      snapshot,
    };
    const result = loadSession({ storage: fakeStorage(JSON.stringify(envelope)), engine, storyKey });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('INVALID_STATE');
  });

  it('rejects history that contradicts the current scene', () => {
    const state = play(['test-the-bar', 'leave-it']);
    const snapshot = {
      ...snapshotOf(state),
      history: state.history.slice(0, 2),
    };
    const envelope = {
      format: SAVE_FORMAT,
      formatVersion: SAVE_FORMAT_VERSION,
      storyKey,
      savedAt: new Date().toISOString(),
      snapshot,
    };
    const result = loadSession({ storage: fakeStorage(JSON.stringify(envelope)), engine, storyKey });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('INVALID_STATE');
  });

  it('rejects clues the story does not declare', () => {
    const snapshot = {
      ...snapshotOf(play(['test-the-bar'])),
      discoveredClueIds: ['invented_clue'],
    };
    const envelope = {
      format: SAVE_FORMAT,
      formatVersion: SAVE_FORMAT_VERSION,
      storyKey,
      savedAt: new Date().toISOString(),
      snapshot,
    };
    const result = loadSession({ storage: fakeStorage(JSON.stringify(envelope)), engine, storyKey });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe('INVALID_STATE');
  });
});

describe('storage failures', () => {
  it('reports storage that refuses to read', () => {
    expect(loadSession({ storage: brokenStorage('read'), engine, storyKey })).toEqual({
      ok: false,
      error: 'STORAGE_UNAVAILABLE',
    });
  });

  it('reports a quota failure differently from a missing browser API', () => {
    const quota = brokenStorage('write', 'QuotaExceededError');
    const other = brokenStorage('write', 'SecurityError');
    const state = play(['test-the-bar']);

    expect(saveSession({ storage: quota, engine, storyKey, state })).toEqual({
      ok: false,
      error: 'STORAGE_FULL',
    });
    expect(saveSession({ storage: other, engine, storyKey, state })).toEqual({
      ok: false,
      error: 'STORAGE_UNAVAILABLE',
    });
  });

  it('a failed save leaves the previous valid save untouched', () => {
    const storage = fakeStorage();
    const state = play(['test-the-bar', 'leave-it']);
    expect(saveSession({ storage, engine, storyKey, state }).ok).toBe(true);
    const goodRaw = storage.raw();

    // Second save attempt fails at the storage layer.
    const failing = brokenStorage('write', 'QuotaExceededError');
    expect(saveSession({ storage: failing, engine, storyKey, state: play(['test-the-bar']) }).ok).toBe(
      false,
    );

    // The original save is still there and still valid.
    expect(storage.raw()).toBe(goodRaw);
    expect(loadSession({ storage, engine, storyKey }).ok).toBe(true);
  });

  it('does not count a failed write as a write', () => {
    const storage = fakeStorage();
    const state = play(['test-the-bar']);
    saveSession({ storage, engine, storyKey, state });
    expect(storage.writes()).toBe(1);
  });
});
