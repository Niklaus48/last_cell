/**
 * Local save/load on top of the engine's existing snapshot format.
 *
 * Responsibility split (deliberate):
 * - this layer owns the *envelope* (format tag, format version, story key,
 *   timestamp) and the storage mechanics;
 * - the engine owns *state validation*. A save is never accepted because this
 *   layer liked the look of it: `engine.restoreSnapshot` re-validates schema
 *   version, story identity, scene identity, variables, clues, history and
 *   every cross-reference before a single field reaches the app.
 *
 * Nothing here throws at the caller: every failure is a typed result the UI can
 * explain in Persian. A failed load never returns partial state.
 */
import type { StoryEngine, StoryState } from '../story/engine';
import type { StoryKey } from '../story/content';
import type { SaveStorage } from './storage';

/** Envelope tag, so unrelated JSON in the same key is rejected immediately. */
export const SAVE_FORMAT = 'last-cell-save';

/** Envelope version. Bump only when the envelope shape changes. */
export const SAVE_FORMAT_VERSION = 1;

export interface SaveEnvelope {
  readonly format: string;
  readonly formatVersion: number;
  readonly storyKey: string;
  /** ISO timestamp of the save, for the "last saved" hint. */
  readonly savedAt: string;
  /** The engine snapshot, exactly as `engine.serializeState` produced it. */
  readonly snapshot: unknown;
}

export type SaveErrorCode =
  | 'NO_SAVE'
  | 'STORAGE_UNAVAILABLE'
  | 'STORAGE_FULL'
  | 'MALFORMED_SAVE'
  | 'INCOMPATIBLE_SAVE'
  | 'WRONG_STORY'
  | 'INVALID_STATE';

export interface PersistenceFailure {
  readonly ok: false;
  readonly error: SaveErrorCode;
  /** Engine diagnostics for `INVALID_STATE`; never shown verbatim to players. */
  readonly detail?: readonly string[];
}

export type SaveResult = { readonly ok: true; readonly savedAt: string } | PersistenceFailure;

export type LoadResult =
  | { readonly ok: true; readonly state: StoryState; readonly savedAt: string }
  | PersistenceFailure;

export type SaveAvailability =
  | { readonly status: 'none' }
  | { readonly status: 'valid'; readonly savedAt: string }
  | { readonly status: 'invalid'; readonly error: SaveErrorCode };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasStringName(value: unknown, names: readonly string[]): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const name = value['name'];
  return typeof name === 'string' && names.includes(name);
}

/** Maps a thrown storage error onto the two cases that actually differ for a player. */
export function classifyStorageError(error: unknown): 'STORAGE_FULL' | 'STORAGE_UNAVAILABLE' {
  const quotaNames = ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED', 'QuotaExceeded'];
  return hasStringName(error, quotaNames) ? 'STORAGE_FULL' : 'STORAGE_UNAVAILABLE';
}

export interface SaveOptions {
  readonly storage: SaveStorage;
  readonly engine: StoryEngine;
  readonly storyKey: StoryKey;
  readonly state: StoryState;
  /** Injectable clock, so tests can assert the timestamp. */
  readonly now?: () => Date;
}

export function saveSession({
  storage,
  engine,
  storyKey,
  state,
  now = () => new Date(),
}: SaveOptions): SaveResult {
  const savedAt = now().toISOString();

  let snapshot: unknown;
  try {
    // Round-tripping the engine's own JSON is what guarantees the envelope can
    // never contain functions, handles, React nodes or DOM references.
    snapshot = JSON.parse(engine.serializeState(state));
  } catch {
    return { ok: false, error: 'INVALID_STATE' };
  }

  const envelope: SaveEnvelope = {
    format: SAVE_FORMAT,
    formatVersion: SAVE_FORMAT_VERSION,
    storyKey,
    savedAt,
    snapshot,
  };

  try {
    storage.write(JSON.stringify(envelope));
  } catch (error) {
    return { ok: false, error: classifyStorageError(error) };
  }

  return { ok: true, savedAt };
}

export interface LoadOptions {
  readonly storage: SaveStorage;
  readonly engine: StoryEngine;
  readonly storyKey: StoryKey;
}

/** Reads and fully validates a save. Returns state only when everything checks out. */
export function loadSession({ storage, engine, storyKey }: LoadOptions): LoadResult {
  let raw: string | null;
  try {
    raw = storage.read();
  } catch (error) {
    return { ok: false, error: classifyStorageError(error) };
  }

  if (raw === null || raw === '') {
    return { ok: false, error: 'NO_SAVE' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'MALFORMED_SAVE' };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'MALFORMED_SAVE' };
  }
  if (parsed['format'] !== SAVE_FORMAT) {
    return { ok: false, error: 'MALFORMED_SAVE' };
  }
  if (parsed['formatVersion'] !== SAVE_FORMAT_VERSION) {
    return { ok: false, error: 'INCOMPATIBLE_SAVE' };
  }
  if (parsed['storyKey'] !== storyKey) {
    return { ok: false, error: 'WRONG_STORY' };
  }

  const savedAt = parsed['savedAt'];
  if (typeof savedAt !== 'string') {
    return { ok: false, error: 'MALFORMED_SAVE' };
  }

  const snapshot = parsed['snapshot'];
  if (!isRecord(snapshot)) {
    return { ok: false, error: 'MALFORMED_SAVE' };
  }

  // The engine is the authority: schema version, story identity, current scene,
  // progress, variables, clues and history consistency are all checked there.
  const restored = engine.restoreSnapshot(snapshot);
  if (!restored.ok) {
    return {
      ok: false,
      error: 'INVALID_STATE',
      detail: restored.error.detail ?? [restored.error.message],
    };
  }

  return { ok: true, state: restored.state, savedAt };
}

/**
 * Cheap availability probe for the UI ("is there something to continue from?").
 *
 * It runs the same validation as a real load, so the title screen never offers a
 * resume that would fail: an unusable save reports `invalid` instead of `valid`.
 */
export function inspectSave({ storage, engine, storyKey }: LoadOptions): SaveAvailability {
  const result = loadSession({ storage, engine, storyKey });
  if (result.ok) {
    return { status: 'valid', savedAt: result.savedAt };
  }
  return result.error === 'NO_SAVE'
    ? { status: 'none' }
    : { status: 'invalid', error: result.error };
}

/** Removes the save slot. Rarely needed, but keeps the adapter honest. */
export function clearSave(storage: SaveStorage): boolean {
  try {
    storage.clear();
    return true;
  } catch {
    return false;
  }
}
