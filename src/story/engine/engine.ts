/**
 * The story engine.
 *
 * ARCHITECTURAL RULE: this module is plain TypeScript. It must never import
 * React, UI components, CSS, or touch the DOM / localStorage. It takes explicit
 * inputs, returns new state, and describes what happened. The UI is responsible
 * for rendering and for persisting state if it ever chooses to.
 *
 * All functions here are pure: inputs are never mutated, and the returned
 * `StoryState` is a fresh object graph that a caller can hand to `useState`.
 * Exceptions are reserved for programming/infrastructure errors; every expected
 * gameplay outcome (invalid choice, unavailable choice, failed effect, bad
 * snapshot) is reported through a typed result instead.
 */
import { explainChoices, type ChoiceAvailability } from './availability';
import { evaluateCondition } from './conditions';
import { applyEffects } from './effects';
import { deriveChoiceSequence, deriveVisitedSceneIds, type SceneTransitionStep, deriveSceneTransitions } from './history';
import {
  buildStoryLookup,
  cloneState,
  validateCheckpointEnvelope,
  validateSnapshot,
  type StoryLookup,
} from './snapshot';
import {
  STATE_SCHEMA_VERSION,
  type Checkpoint,
  type CheckpointDefinition,
  type CheckpointId,
  type CheckpointResult,
  type ChoiceCondition,
  type ChoiceDefinition,
  type ChoiceId,
  type ChoiceSelection,
  type ClueDefinition,
  type ClueId,
  type EndingDefinition,
  type FailureDefinition,
  type HistoryEntry,
  type RecoveryTarget,
  type SceneDefinition,
  type SceneId,
  type StateChangeSummary,
  type VariableMeta,
  type StateRestoreResult,
  type StoryDefinition,
  type StoryEngineError,
  type StoryState,
  type StoryTransitionResult,
  type TransitionKind,
} from './types';
import { validateStory } from './validation';
import type { StoryValidationError } from './validation';

export class StoryDefinitionError extends Error {
  readonly errors: readonly StoryValidationError[];

  constructor(errors: readonly StoryValidationError[]) {
    const detail = errors.map((error) => `${error.path}: ${error.message}`).join('\n');
    super(`Invalid story definition:\n${detail}`);
    this.name = 'StoryDefinitionError';
    this.errors = errors;
  }
}

export interface StoryEngine {
  readonly story: StoryDefinition;

  // --- run lifecycle -------------------------------------------------------
  /** Creates a fresh run at the story's initial scene. */
  start(): StoryState;
  /** Applies a choice. Never mutates `state`; failures return `state` unchanged. */
  choose(state: StoryState, selection: ChoiceSelection | ChoiceId): StoryTransitionResult;

  // --- scene & choice queries ---------------------------------------------
  /** The scene the player is standing in right now. */
  getCurrentScene(state: StoryState): SceneDefinition;
  /** Every choice declared for the current scene, regardless of availability. */
  getChoices(state: StoryState): readonly ChoiceDefinition[];
  /** Choices the player can currently pick (conditions evaluated). */
  getAvailableChoices(state: StoryState): readonly ChoiceDefinition[];
  /** True when `choiceId` is currently selectable in the current scene. */
  isChoiceAvailable(state: StoryState, choiceId: ChoiceId): boolean;
  /**
   * Every declared choice of the current scene with its availability *and* the
   * requirements that fail, so the UI can show a locked option together with a
   * reason instead of hiding it. `available` always agrees with
   * `getAvailableChoices`.
   */
  getChoiceAvailability(state: StoryState): readonly ChoiceAvailability[];
  /** Player-facing labels declared by the story, keyed by variable. */
  getVariableMeta(): Readonly<Record<string, VariableMeta>>;

  // --- outcomes ------------------------------------------------------------
  /** The ending record when the run has finished, otherwise `null`. */
  getEnding(state: StoryState): EndingDefinition | null;
  /** The failure record when the run has failed, otherwise `null`. */
  getFailure(state: StoryState): FailureDefinition | null;
  /** Where a recoverable failure sends the player, otherwise `null`. */
  getRecoveryTarget(state: StoryState): RecoveryTarget | null;

  // --- clues ---------------------------------------------------------------
  /** Whether the clue was discovered. Reveals nothing about undiscovered clues. */
  hasClue(state: StoryState, clueId: ClueId): boolean;
  /** Full records for discovered clues only (in discovery order). */
  getDiscoveredClues(state: StoryState): readonly ClueDefinition[];

  // --- path ----------------------------------------------------------------
  getHistory(state: StoryState): readonly HistoryEntry[];
  /** Ordered, de-duplicated scene path (derived from history). */
  getVisitedSceneIds(state: StoryState): readonly SceneId[];
  /** Ordered choice ids the player actually took. */
  getTakenChoiceIds(state: StoryState): readonly ChoiceId[];
  /** Successful scene-to-scene moves, for a future flowchart. */
  getSceneTransitions(state: StoryState): readonly SceneTransitionStep[];

  // --- checkpoints & recovery ---------------------------------------------
  /** The checkpoint this scene offers, if content declared one. */
  getCheckpointOpportunity(state: StoryState): CheckpointDefinition | null;
  /** Snapshots the current state as a checkpoint. */
  createCheckpoint(state: StoryState, checkpointId?: CheckpointId): CheckpointResult;
  /** Restores a checkpoint produced by this story (validates untrusted input). */
  restoreCheckpoint(checkpoint: unknown): StateRestoreResult;
  /** Restores the checkpoint a recoverable failure points at. */
  recover(state: StoryState, checkpoint: unknown): StateRestoreResult;

  // --- snapshots -----------------------------------------------------------
  /** JSON text for a state; contains no functions or browser objects. */
  serializeState(state: StoryState): string;
  /** Validates an untrusted snapshot (object or JSON text) and returns state. */
  restoreSnapshot(input: unknown): StateRestoreResult;
  /** Strict variant for trusted in-process snapshots; throws on inconsistency. */
  restore(state: StoryState): StoryState;
}

function errorOf(state: StoryState, error: StoryEngineError): StoryTransitionResult {
  return { ok: false, state, error };
}

function restoreError(error: StoryEngineError): StateRestoreResult {
  return { ok: false, error };
}

function checkpointError(error: StoryEngineError): CheckpointResult {
  return { ok: false, error };
}

/** Creates an engine bound to a story definition. */
export function createStoryEngine(input: StoryDefinition): StoryEngine {
  const validation = validateStory(input);
  if (!validation.ok) {
    throw new StoryDefinitionError(validation.errors);
  }
  const story = validation.story;
  const lookup: StoryLookup = buildStoryLookup(story);
  const clueRegistry = new Map((story.clues ?? []).map((clue) => [clue.id, clue]));
  const checkpointById = new Map((story.checkpoints ?? []).map((entry) => [entry.id, entry]));
  const failureById = new Map((story.failures ?? []).map((entry) => [entry.id, entry]));
  const endingById = new Map(story.endings.map((ending) => [ending.id, ending]));

  const sceneOf = (state: StoryState): SceneDefinition | undefined =>
    lookup.sceneById.get(state.currentSceneId);

  /** Scene lookup that throws only if a state snapshot is inconsistent. */
  const requireScene = (state: StoryState): SceneDefinition => {
    const scene = sceneOf(state);
    if (scene === undefined) {
      throw new Error(
        `State refers to unknown scene "${state.currentSceneId}" in story "${story.id}".`,
      );
    }
    return scene;
  };

  const conditionHolds = (state: StoryState, condition: ChoiceCondition | undefined): boolean => {
    if (condition === undefined) {
      return true;
    }
    return evaluateCondition(condition, {
      variables: state.variables,
      visitedSceneIds: deriveVisitedSceneIds(state.history),
      discoveredClueIds: state.discoveredClueIds,
    });
  };

  const getHistory = (state: StoryState): readonly HistoryEntry[] => state.history;

  const getVisitedSceneIds = (state: StoryState): readonly SceneId[] =>
    deriveVisitedSceneIds(state.history);

  const getTakenChoiceIds = (state: StoryState): readonly ChoiceId[] =>
    deriveChoiceSequence(state.history);

  const getSceneTransitions = (state: StoryState): readonly SceneTransitionStep[] =>
    deriveSceneTransitions(state.history);

  const getCurrentScene = (state: StoryState): SceneDefinition => requireScene(state);

  const getChoices = (state: StoryState): readonly ChoiceDefinition[] =>
    requireScene(state).choices;

  const getAvailableChoices = (state: StoryState): readonly ChoiceDefinition[] => {
    if (state.progress.status !== 'playing') {
      return [];
    }
    return getChoices(state).filter((choice) => conditionHolds(state, choice.condition));
  };

  const isChoiceAvailable = (state: StoryState, choiceId: ChoiceId): boolean =>
    getAvailableChoices(state).some((choice) => choice.id === choiceId);

  const getChoiceAvailability = (state: StoryState): readonly ChoiceAvailability[] =>
    explainChoices(
      getChoices(state),
      {
        variables: state.variables,
        visitedSceneIds: deriveVisitedSceneIds(state.history),
        discoveredClueIds: state.discoveredClueIds,
      },
      state.progress.status === 'playing',
    );

  const getVariableMeta = (): Readonly<Record<string, VariableMeta>> =>
    story.variableMeta ?? {};

  const getEnding = (state: StoryState): EndingDefinition | null => {
    if (state.progress.status !== 'ended') {
      return null;
    }
    return endingById.get(state.progress.endingId) ?? null;
  };

  const getFailure = (state: StoryState): FailureDefinition | null => {
    if (state.progress.status !== 'failed') {
      return null;
    }
    return failureById.get(state.progress.failureId) ?? null;
  };

  const getRecoveryTarget = (state: StoryState): RecoveryTarget | null => {
    const failure = getFailure(state);
    if (failure === null || failure.kind !== 'recoverable') {
      return null;
    }
    return failure.recovery ?? null;
  };

  const hasClue = (state: StoryState, clueId: ClueId): boolean =>
    state.discoveredClueIds.includes(clueId);

  const getDiscoveredClues = (state: StoryState): readonly ClueDefinition[] =>
    state.discoveredClueIds.map(
      (clueId) => clueRegistry.get(clueId) ?? { id: clueId, label: clueId },
    );

  const start = (): StoryState => {
    const initialScene = lookup.sceneById.get(story.initialSceneId);
    if (initialScene === undefined) {
      throw new Error(`Initial scene "${story.initialSceneId}" is missing.`);
    }
    return {
      schemaVersion: STATE_SCHEMA_VERSION,
      storyId: story.id,
      currentSceneId: initialScene.id,
      progress: { status: 'playing' },
      variables: { ...(story.initialVariables ?? {}) },
      discoveredClueIds: [],
      history: [{ sceneId: initialScene.id, choiceId: null }],
    };
  };

  const choose = (
    state: StoryState,
    selection: ChoiceSelection | ChoiceId,
  ): StoryTransitionResult => {
    const choiceId = typeof selection === 'string' ? selection : selection.choiceId;
    const requestedSceneId =
      typeof selection === 'string' ? state.currentSceneId : selection.sceneId;

    if (state.storyId !== story.id) {
      return errorOf(state, {
        code: 'UNKNOWN_SCENE',
        message: `State belongs to story "${state.storyId}", not "${story.id}".`,
      });
    }
    if (requestedSceneId !== state.currentSceneId) {
      return errorOf(state, {
        code: 'STALE_SCENE',
        message: `Selection targets scene "${requestedSceneId}", but the player is in "${state.currentSceneId}".`,
        sceneId: requestedSceneId,
        choiceId,
      });
    }
    if (state.progress.status === 'ended') {
      return errorOf(state, {
        code: 'GAME_ENDED',
        message: 'The story has already reached an ending.',
        sceneId: state.currentSceneId,
        choiceId,
      });
    }
    if (state.progress.status === 'failed') {
      return errorOf(state, {
        code: 'GAME_FAILED',
        message: 'The run has failed and must be recovered before taking choices.',
        sceneId: state.currentSceneId,
        choiceId,
      });
    }

    const scene = requireScene(state);
    const choice = scene.choices.find((candidate) => candidate.id === choiceId);
    if (choice === undefined) {
      return errorOf(state, {
        code: 'INVALID_CHOICE',
        message: `Scene "${scene.id}" has no choice with id "${choiceId}".`,
        sceneId: scene.id,
        choiceId,
      });
    }
    if (!conditionHolds(state, choice.condition)) {
      return errorOf(state, {
        code: 'CHOICE_UNAVAILABLE',
        message: `Choice "${choice.id}" is not available in the current state.`,
        sceneId: scene.id,
        choiceId,
      });
    }

    // Effects are applied to a copy; a failure here leaves `state` untouched.
    const applied = applyEffects(
      { variables: state.variables, discoveredClueIds: state.discoveredClueIds },
      choice.effects,
    );
    if (!applied.ok) {
      return errorOf(state, {
        code: 'EFFECT_FAILED',
        message: applied.error.message,
        sceneId: scene.id,
        choiceId,
        ...(applied.error.variable === undefined ? {} : { variable: applied.error.variable }),
      });
    }

    const changes: StateChangeSummary = {
      variableChanges: applied.variableChanges,
      discoveredClueIds: applied.newlyDiscoveredClueIds,
    };
    const historyEntry: HistoryEntry = { sceneId: scene.id, choiceId: choice.id };
    const base = {
      ...state,
      variables: applied.variables,
      discoveredClueIds: applied.discoveredClueIds,
    };

    switch (choice.outcome.type) {
      case 'ending': {
        const endingId = choice.outcome.endingId;
        const transition: TransitionKind = { type: 'ending', fromSceneId: scene.id, endingId };
        return {
          ok: true,
          state: {
            ...base,
            progress: { status: 'ended', endingId },
            history: [...state.history, historyEntry],
          },
          choice,
          transition,
          changes,
        };
      }

      case 'failure': {
        const failureId = choice.outcome.failureId;
        const transition: TransitionKind = { type: 'failure', fromSceneId: scene.id, failureId };
        return {
          ok: true,
          state: {
            ...base,
            progress: { status: 'failed', failureId },
            history: [...state.history, historyEntry],
          },
          choice,
          transition,
          changes,
        };
      }

      case 'transition': {
        const nextScene = lookup.sceneById.get(choice.outcome.targetSceneId);
        if (nextScene === undefined) {
          // Guarded by validation; a missing target must never silently advance.
          return errorOf(state, {
            code: 'UNKNOWN_SCENE',
            message: `Choice "${choice.id}" targets unknown scene "${choice.outcome.targetSceneId}".`,
            sceneId: scene.id,
            choiceId,
          });
        }
        const transition: TransitionKind = {
          type: 'scene',
          fromSceneId: scene.id,
          toSceneId: nextScene.id,
        };
        return {
          ok: true,
          state: {
            ...base,
            currentSceneId: nextScene.id,
            history: [
              ...state.history,
              historyEntry,
              { sceneId: nextScene.id, choiceId: null },
            ],
          },
          choice,
          transition,
          changes,
        };
      }
    }
  };

  const getCheckpointOpportunity = (state: StoryState): CheckpointDefinition | null => {
    if (state.progress.status !== 'playing') {
      return null;
    }
    const candidate = (story.checkpoints ?? []).find(
      (entry) => entry.sceneId === state.currentSceneId,
    );
    return candidate ?? null;
  };

  const createCheckpoint = (
    state: StoryState,
    checkpointId?: CheckpointId,
  ): CheckpointResult => {
    const opportunity = getCheckpointOpportunity(state);
    const targetId = checkpointId ?? opportunity?.id;

    if (targetId === undefined) {
      return checkpointError({
        code: 'CHECKPOINT_UNAVAILABLE',
        message: `Scene "${state.currentSceneId}" declares no checkpoint.`,
        sceneId: state.currentSceneId,
      });
    }

    const declaration = checkpointById.get(targetId);
    if (declaration === undefined) {
      return checkpointError({
        code: 'UNKNOWN_CHECKPOINT',
        message: `Checkpoint "${targetId}" is not declared in story "${story.id}".`,
        checkpointId: targetId,
      });
    }
    if (declaration.sceneId !== state.currentSceneId) {
      return checkpointError({
        code: 'CHECKPOINT_UNAVAILABLE',
        message: `Checkpoint "${targetId}" belongs to scene "${declaration.sceneId}", not "${state.currentSceneId}".`,
        checkpointId: targetId,
        sceneId: state.currentSceneId,
      });
    }
    if (state.progress.status !== 'playing') {
      return checkpointError({
        code: 'CHECKPOINT_UNAVAILABLE',
        message: 'Only a running game can be checkpointed.',
        checkpointId: targetId,
        sceneId: state.currentSceneId,
      });
    }

    return {
      ok: true,
      checkpoint: {
        schemaVersion: STATE_SCHEMA_VERSION,
        checkpointId: declaration.id,
        storyId: story.id,
        sceneId: state.currentSceneId,
        step: state.history.length,
        state: cloneState(state),
      },
    };
  };

  const parseIfJson = (input: unknown): unknown => {
    if (typeof input !== 'string') {
      return input;
    }
    try {
      return JSON.parse(input) as unknown;
    } catch {
      return undefined;
    }
  };

  const restoreCheckpoint = (checkpoint: unknown): StateRestoreResult => {
    const parsed = parseIfJson(checkpoint);
    if (parsed === undefined) {
      return restoreError({
        code: 'INVALID_SNAPSHOT',
        message: 'Checkpoint is not valid JSON.',
      });
    }
    const envelope = validateCheckpointEnvelope(parsed, lookup);
    if (!envelope.ok) {
      return restoreError({
        code: 'INVALID_SNAPSHOT',
        message: 'Checkpoint failed validation.',
        detail: envelope.failure.messages,
      });
    }
    return { ok: true, state: cloneState(envelope.checkpoint.state) };
  };

  const recover = (state: StoryState, checkpoint: unknown): StateRestoreResult => {
    if (state.progress.status !== 'failed') {
      return restoreError({
        code: 'NOT_FAILED',
        message: 'Recovery is only available for a failed run.',
      });
    }
    const failure = getFailure(state);
    const target = getRecoveryTarget(state);
    if (failure === null) {
      return restoreError({
        code: 'INVALID_SNAPSHOT',
        message: `Failed state references unknown failure "${state.progress.failureId}".`,
      });
    }
    if (target === null) {
      return restoreError({
        code: 'NO_RECOVERY_TARGET',
        message: `Failure "${failure.id}" (${failure.kind}) offers no recovery target.`,
        failureId: failure.id,
      });
    }

    const restored = restoreCheckpoint(checkpoint);
    if (!restored.ok) {
      return restored;
    }
    const parsed = parseIfJson(checkpoint);
    const environment = validateCheckpointEnvelope(parsed, lookup);
    if (!environment.ok) {
      return restoreError({ code: 'INVALID_SNAPSHOT', message: 'Checkpoint failed validation.', detail: environment.failure.messages });
    }
    if (environment.checkpoint.checkpointId !== target.checkpointId) {
      return restoreError({
        code: 'CHECKPOINT_MISMATCH',
        message: `Failure "${failure.id}" recovers to checkpoint "${target.checkpointId}", not "${environment.checkpoint.checkpointId}".`,
        checkpointId: environment.checkpoint.checkpointId,
        failureId: failure.id,
      });
    }
    return restored;
  };

  const serializeState = (state: StoryState): string => JSON.stringify(state);

  const restoreSnapshot = (input: unknown): StateRestoreResult => {
    const parsed = parseIfJson(input);
    if (parsed === undefined) {
      return restoreError({ code: 'INVALID_SNAPSHOT', message: 'Snapshot is not valid JSON.' });
    }
    const result = validateSnapshot(parsed, lookup);
    if (!result.ok) {
      return restoreError({
        code: 'INVALID_SNAPSHOT',
        message: 'Snapshot failed validation.',
        detail: result.failure.messages,
      });
    }
    return { ok: true, state: cloneState(result.state) };
  };

  /**
   * Strict variant for trusted, in-process snapshots (e.g. React state reuse).
   * Throws because a mismatch here is a programming error, not gameplay.
   */
  const restore = (state: StoryState): StoryState => {
    const result = validateSnapshot(state, lookup);
    if (!result.ok) {
      throw new Error(`Cannot restore snapshot: ${result.failure.messages.join('; ')}`);
    }
    return cloneState(result.state);
  };

  return {
    story,
    start,
    choose,
    getCurrentScene,
    getChoices,
    getAvailableChoices,
    isChoiceAvailable,
    getChoiceAvailability,
    getVariableMeta,
    getEnding,
    getFailure,
    getRecoveryTarget,
    hasClue,
    getDiscoveredClues,
    getHistory,
    getVisitedSceneIds,
    getTakenChoiceIds,
    getSceneTransitions,
    getCheckpointOpportunity,
    createCheckpoint,
    restoreCheckpoint,
    recover,
    serializeState,
    restoreSnapshot,
    restore,
  };
}

/** Convenience helper for one-off calls. */
export function startStory(story: StoryDefinition): { engine: StoryEngine; state: StoryState } {
  const engine = createStoryEngine(story);
  return { engine, state: engine.start() };
}

/** Re-exported for convenience so consumers can `import type { Checkpoint }`. */
export type { Checkpoint };
