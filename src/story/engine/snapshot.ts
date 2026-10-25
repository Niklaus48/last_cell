/**
 * Validation and cloning of untrusted state snapshots. Pure, React-free, DOM-free.
 *
 * `restoreSnapshot` must never trust arbitrary input (localStorage, a URL, a
 * future cloud save), so every field is checked structurally *and* semantically
 * against the story definition before a `StoryState` is handed back.
 */
import { deriveVisitedSceneIds, currentSceneOf } from './history';
import {
  STATE_SCHEMA_VERSION,
  type Checkpoint,
  type HistoryEntry,
  type SceneDefinition,
  type StateValue,
  type StoryDefinition,
  type StoryProgress,
  type StoryState,
  type StoryVariables,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStateValue(value: unknown): value is StateValue {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

export interface StoryLookup {
  readonly story: StoryDefinition;
  readonly sceneById: ReadonlyMap<string, SceneDefinition>;
  readonly endingIds: ReadonlySet<string>;
  readonly failureIds: ReadonlySet<string>;
  readonly checkpointIds: ReadonlySet<string>;
  readonly clueIds: ReadonlySet<string> | null;
}

export function buildStoryLookup(story: StoryDefinition): StoryLookup {
  return {
    story,
    sceneById: new Map(story.scenes.map((scene) => [scene.id, scene])),
    endingIds: new Set(story.endings.map((ending) => ending.id)),
    failureIds: new Set((story.failures ?? []).map((failure) => failure.id)),
    checkpointIds: new Set((story.checkpoints ?? []).map((checkpoint) => checkpoint.id)),
    clueIds: story.clues === undefined ? null : new Set(story.clues.map((clue) => clue.id)),
  };
}

export interface SnapshotValidationFailure {
  readonly messages: readonly string[];
}

/** Deep copy of a plain, JSON-shaped state object (no shared references). */
export function cloneState(state: StoryState): StoryState {
  return {
    schemaVersion: state.schemaVersion,
    storyId: state.storyId,
    currentSceneId: state.currentSceneId,
    progress: { ...state.progress },
    variables: { ...state.variables },
    discoveredClueIds: [...state.discoveredClueIds],
    history: state.history.map((entry) => ({ ...entry })),
  };
}

function validateHistory(
  input: unknown,
  lookup: StoryLookup,
  problems: string[],
): HistoryEntry[] | null {
  if (!Array.isArray(input) || input.length === 0) {
    problems.push('history must be a non-empty array');
    return null;
  }

  const history: HistoryEntry[] = [];
  input.forEach((rawEntry, index) => {
    if (!isRecord(rawEntry)) {
      problems.push(`history[${index}] must be an object`);
      return;
    }
    const { sceneId, choiceId } = rawEntry;
    if (typeof sceneId !== 'string') {
      problems.push(`history[${index}].sceneId must be a string`);
      return;
    }
    const scene = lookup.sceneById.get(sceneId);
    if (scene === undefined) {
      problems.push(`history[${index}] references unknown scene "${sceneId}"`);
      return;
    }
    if (choiceId === null) {
      history.push({ sceneId, choiceId: null });
      return;
    }
    if (typeof choiceId !== 'string') {
      problems.push(`history[${index}].choiceId must be a string or null`);
      return;
    }
    if (!scene.choices.some((choice) => choice.id === choiceId)) {
      problems.push(
        `history[${index}] references choice "${choiceId}" which does not exist in scene "${sceneId}"`,
      );
      return;
    }
    history.push({ sceneId, choiceId });
  });

  return problems.length === 0 ? history : null;
}

/**
 * Validates an untrusted snapshot against the story and returns a fresh
 * `StoryState`, or the list of problems found.
 */
export function validateSnapshot(
  input: unknown,
  lookup: StoryLookup,
): { ok: true; state: StoryState } | { ok: false; failure: SnapshotValidationFailure } {
  const problems: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, failure: { messages: ['snapshot must be an object'] } };
  }

  if (input['schemaVersion'] !== STATE_SCHEMA_VERSION) {
    problems.push(
      `schemaVersion must be ${STATE_SCHEMA_VERSION} (got ${String(input['schemaVersion'])})`,
    );
  }

  if (input['storyId'] !== lookup.story.id) {
    problems.push(
      `storyId must be "${lookup.story.id}" (got ${String(input['storyId'])})`,
    );
  }

  const rawCurrentSceneId = input['currentSceneId'];
  const currentSceneId = typeof rawCurrentSceneId === 'string' ? rawCurrentSceneId : null;
  if (currentSceneId === null) {
    problems.push('currentSceneId must be a string');
  } else if (!lookup.sceneById.has(currentSceneId)) {
    problems.push(`currentSceneId "${currentSceneId}" is not a scene in this story`);
  }

  // progress — rebuilt from validated pieces, never cast from unknown input
  const rawProgress = input['progress'];
  let progress: StoryProgress | null = null;
  if (!isRecord(rawProgress)) {
    problems.push('progress must be an object');
  } else if (rawProgress['status'] === 'playing') {
    progress = { status: 'playing' };
  } else if (rawProgress['status'] === 'ended') {
    const endingId = rawProgress['endingId'];
    if (typeof endingId === 'string' && lookup.endingIds.has(endingId)) {
      progress = { status: 'ended', endingId };
    } else {
      problems.push(`progress.endingId ${String(endingId)} is not a declared ending`);
    }
  } else if (rawProgress['status'] === 'failed') {
    const failureId = rawProgress['failureId'];
    if (typeof failureId === 'string' && lookup.failureIds.has(failureId)) {
      progress = { status: 'failed', failureId };
    } else {
      problems.push(`progress.failureId ${String(failureId)} is not a declared failure`);
    }
  } else {
    problems.push(`progress.status ${String(rawProgress['status'])} is not a known status`);
  }

  // variables
  let variables: StoryVariables | null = null;
  const rawVariables = input['variables'];
  if (!isRecord(rawVariables)) {
    problems.push('variables must be an object');
  } else {
    const collected: Record<string, StateValue> = {};
    for (const [key, value] of Object.entries(rawVariables)) {
      if (!isStateValue(value)) {
        problems.push(`variables.${key} must be a string, number or boolean`);
      } else {
        collected[key] = value;
      }
    }
    variables = collected;
  }

  // clues
  let discoveredClueIds: string[] | null = null;
  const rawClues = input['discoveredClueIds'];
  if (!Array.isArray(rawClues)) {
    problems.push('discoveredClueIds must be an array');
  } else {
    const collected: string[] = [];
    rawClues.forEach((clueId, index) => {
      if (typeof clueId !== 'string') {
        problems.push(`discoveredClueIds[${index}] must be a string`);
        return;
      }
      if (collected.includes(clueId)) {
        problems.push(`discoveredClueIds contains duplicate "${clueId}"`);
        return;
      }
      if (lookup.clueIds !== null && !lookup.clueIds.has(clueId)) {
        problems.push(`discoveredClueIds references undeclared clue "${clueId}"`);
        return;
      }
      collected.push(clueId);
    });
    discoveredClueIds = collected;
  }

  // history
  const history = validateHistory(input['history'], lookup, problems);

  if (history !== null && currentSceneId !== null && currentSceneOf(history) !== currentSceneId) {
    problems.push(
      `history ends at "${String(currentSceneOf(history))}" but currentSceneId is "${currentSceneId}"`,
    );
  }

  if (
    problems.length > 0 ||
    variables === null ||
    discoveredClueIds === null ||
    history === null ||
    progress === null ||
    currentSceneId === null
  ) {
    return { ok: false, failure: { messages: problems } };
  }

  return {
    ok: true,
    state: {
      schemaVersion: STATE_SCHEMA_VERSION,
      storyId: lookup.story.id,
      currentSceneId,
      progress,
      variables,
      discoveredClueIds,
      history,
    },
  };
}

/**
 * Validates a checkpoint envelope. The inner snapshot is validated by
 * `validateSnapshot`; here we only check the envelope and its declaration.
 */
export function validateCheckpointEnvelope(
  input: unknown,
  lookup: StoryLookup,
): { ok: true; checkpoint: Checkpoint } | { ok: false; failure: SnapshotValidationFailure } {
  const problems: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, failure: { messages: ['checkpoint must be an object'] } };
  }

  const checkpointId = input['checkpointId'];
  if (typeof checkpointId !== 'string') {
    problems.push('checkpointId must be a string');
  } else if (!lookup.checkpointIds.has(checkpointId)) {
    problems.push(`checkpointId "${checkpointId}" is not declared in this story`);
  }

  if (input['schemaVersion'] !== STATE_SCHEMA_VERSION) {
    problems.push(`schemaVersion must be ${STATE_SCHEMA_VERSION}`);
  }
  if (input['storyId'] !== lookup.story.id) {
    problems.push(`storyId must be "${lookup.story.id}"`);
  }

  const snapshot = validateSnapshot(input['state'], lookup);
  if (!snapshot.ok) {
    problems.push(...snapshot.failure.messages.map((message) => `state.${message}`));
  }

  const sceneId = input['sceneId'];
  if (snapshot.ok && sceneId !== snapshot.state.currentSceneId) {
    problems.push(
      `sceneId "${String(sceneId)}" does not match the snapshot scene "${snapshot.state.currentSceneId}"`,
    );
  }

  if (problems.length > 0 || !snapshot.ok) {
    return { ok: false, failure: { messages: problems } };
  }

  return {
    ok: true,
    checkpoint: {
      schemaVersion: STATE_SCHEMA_VERSION,
      checkpointId: String(checkpointId),
      storyId: lookup.story.id,
      sceneId: snapshot.state.currentSceneId,
      step: deriveVisitedSceneIds(snapshot.state.history).length,
      state: cloneState(snapshot.state),
    },
  };
}
