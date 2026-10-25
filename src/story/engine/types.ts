/**
 * Domain model for the «آخرین سلول» story engine.
 *
 * ARCHITECTURAL RULE: everything in `src/story/engine/` is plain TypeScript.
 * It must not import React, React hooks, UI components, CSS, or touch browser
 * DOM APIs / browser storage. It is safe to run in a plain Node test process.
 *
 * All story content is *declarative data*: no JavaScript functions are stored
 * inside story definitions to express conditions, effects, transitions or
 * failure rules.
 */

/** Stable identifier for a scene. */
export type SceneId = string;
/** Stable identifier for a choice, unique within its scene. */
export type ChoiceId = string;
/** Stable identifier for an ending. */
export type EndingId = string;
/** Stable identifier for a declared recoverable/terminal failure. */
export type FailureId = string;
/** Stable identifier for a declared checkpoint (safe recovery point). */
export type CheckpointId = string;
/** Stable identifier for a declared clue. */
export type ClueId = string;
/** Stable identifier for a visual asset (resolved to a URL by the UI layer). */
export type AssetId = string;
/** Key of a numeric/string/boolean story variable. */
export type VariableKey = string;

/**
 * The values a story variable may hold. Deliberately limited to JSON-safe
 * primitives so that a `StoryState` can always be serialised.
 */
export type StateValue = string | number | boolean;

/** Immutable bag of story variables (flags, counters, small metrics). */
export type StoryVariables = Readonly<Record<VariableKey, StateValue>>;

export type ComparisonOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';

/**
 * Declarative availability rule for a choice.
 * Conditions are evaluated against the state *before* the choice is taken.
 *
 * Missing-variable semantics (documented once, applied everywhere):
 * a variable that is absent from `StoryState.variables` is treated as
 * "not equal to any value", so `eq` is false and `neq` is true; ordering
 * comparisons (`gt`/`gte`/`lt`/`lte`) are false because they require two
 * numbers. Conditions are never silently treated as true.
 */
export type ChoiceCondition =
  | { readonly kind: 'always' }
  | {
      readonly kind: 'compareVariable';
      readonly variable: VariableKey;
      readonly operator: ComparisonOperator;
      readonly value: StateValue;
    }
  | { readonly kind: 'visitedScene'; readonly sceneId: SceneId }
  /** True when the clue has been discovered in this run. */
  | { readonly kind: 'clueDiscovered'; readonly clueId: ClueId }
  | { readonly kind: 'not'; readonly condition: ChoiceCondition }
  | { readonly kind: 'all'; readonly conditions: readonly ChoiceCondition[] }
  | { readonly kind: 'any'; readonly conditions: readonly ChoiceCondition[] };

/**
 * Declarative mutation applied when a choice is taken.
 * Effects are applied in declaration order and never mutate the input state.
 *
 * `incrementVariable` requires the variable to be absent (treated as `0`) or
 * numeric at runtime; incrementing a string/boolean variable is an error, not
 * a silent coercion.
 */
export type StateEffect =
  | { readonly kind: 'setVariable'; readonly variable: VariableKey; readonly value: StateValue }
  | { readonly kind: 'incrementVariable'; readonly variable: VariableKey; readonly amount: number }
  | { readonly kind: 'unsetVariable'; readonly variable: VariableKey }
  | { readonly kind: 'discoverClue'; readonly clueId: ClueId };

/**
 * Where a choice leads: another scene, an explicit ending, or a defined failure.
 * A discriminated union keeps "both" and "neither" unrepresentable.
 */
export type ChoiceOutcome =
  | { readonly type: 'transition'; readonly targetSceneId: SceneId }
  | { readonly type: 'ending'; readonly endingId: EndingId }
  | { readonly type: 'failure'; readonly failureId: FailureId };

/**
 * Timed-decision metadata. Modelled and validated in this phase but
 * intentionally *not* executed by the engine yet.
 */
export interface TimedDecisionDefinition {
  /** Total time the player has to decide, in milliseconds. */
  readonly durationMs: number;
  /** Choice taken automatically when time runs out. */
  readonly defaultChoiceId: ChoiceId;
}

export interface ChoiceDefinition {
  readonly id: ChoiceId;
  /** Persian label shown to the player. */
  readonly label: string;
  readonly outcome: ChoiceOutcome;
  /** Omitted means "always available". */
  readonly condition?: ChoiceCondition;
  /** Applied in order when the choice is taken. */
  readonly effects?: readonly StateEffect[];
}

export interface SceneDefinition {
  readonly id: SceneId;
  /** Short Persian heading for the scene. */
  readonly title: string;
  /** Narrator paragraphs, rendered in order. */
  readonly narration: readonly string[];
  /** Optional reference to a visual asset; the UI resolves it to a URL. */
  readonly backgroundAssetId?: AssetId;
  readonly choices: readonly ChoiceDefinition[];
  readonly timedDecision?: TimedDecisionDefinition;
}

export type EndingTone = 'hopeful' | 'grim' | 'ambiguous';

export interface EndingDefinition {
  readonly id: EndingId;
  readonly title: string;
  readonly summary: string;
  readonly tone: EndingTone;
}

/** A clue the story may reveal. The engine stores only ids in game state. */
export interface ClueDefinition {
  readonly id: ClueId;
  /** Persian short name, shown in a future investigation UI. */
  readonly label: string;
  /** Optional longer Persian description. */
  readonly detail?: string;
}

/**
 * A declared checkpoint opportunity. Content decides which scenes are safe
 * recovery points; the engine never invents one.
 */
export interface CheckpointDefinition {
  readonly id: CheckpointId;
  /** Scene at which taking a snapshot is meaningful. */
  readonly sceneId: SceneId;
  /** Optional Persian label for the future save/recovery UI. */
  readonly label?: string;
}

/**
 * Where a recoverable failure sends the player back to.
 *
 * Only checkpoint recovery is modelled: restoring a real state snapshot is the
 * only way to roll back safely. "Jump to scene id" recovery is deliberately not
 * supported, because it would silently keep post-failure variables and history.
 */
export type RecoveryTarget = {
  readonly type: 'checkpoint';
  readonly checkpointId: CheckpointId;
};

/**
 * `recoverable` failures can be retried from `recovery`; `terminal` failures end
 * the run like an ending and must not declare a recovery target.
 */
export type FailureKind = 'recoverable' | 'terminal';

export interface FailureDefinition {
  readonly id: FailureId;
  readonly title: string;
  readonly summary: string;
  readonly kind: FailureKind;
  /** Required for `recoverable`, forbidden for `terminal`. */
  readonly recovery?: RecoveryTarget;
}

export interface StoryDefinition {
  readonly id: string;
  readonly title: string;
  readonly initialSceneId: SceneId;
  readonly scenes: readonly SceneDefinition[];
  readonly endings: readonly EndingDefinition[];
  /**
   * Optional clue registry. When present, every clue reference in the story is
   * validated against it; when absent, clue ids are accepted as-is (useful for
   * sketching content before the registry exists).
   */
  readonly clues?: readonly ClueDefinition[];
  readonly checkpoints?: readonly CheckpointDefinition[];
  readonly failures?: readonly FailureDefinition[];
  /** Optional starting values; omitted variables are simply absent. */
  readonly initialVariables?: StoryVariables;
}

/**
 * Bumped whenever the shape of `StoryState` / `Checkpoint` changes.
 * Snapshots carrying a different version are rejected with `INVALID_SNAPSHOT`
 * rather than guessed at. (No migration framework until one is genuinely needed.)
 */
export const STATE_SCHEMA_VERSION = 1 as const;

export type StateSchemaVersion = typeof STATE_SCHEMA_VERSION;

/** One step of the player's path. The entry for a freshly entered scene has `choiceId: null`. */
export interface HistoryEntry {
  readonly sceneId: SceneId;
  readonly choiceId: ChoiceId | null;
}

export type StoryProgress =
  | { readonly status: 'playing' }
  | { readonly status: 'ended'; readonly endingId: EndingId }
  | { readonly status: 'failed'; readonly failureId: FailureId };

/**
 * Complete, serialisable snapshot of a run.
 *
 * Contains no functions, class instances or browser handles, so it can be
 * `JSON.stringify`-ed as-is. `visitedSceneIds` is intentionally *not* stored:
 * it is derived from `history` (`engine.getVisitedSceneIds`), which keeps the
 * two representations from ever disagreeing.
 */
export interface StoryState {
  readonly schemaVersion: StateSchemaVersion;
  readonly storyId: string;
  readonly currentSceneId: SceneId;
  readonly progress: StoryProgress;
  readonly variables: StoryVariables;
  /** Discovered clues in discovery order; duplicates are never stored. */
  readonly discoveredClueIds: readonly ClueId[];
  readonly history: readonly HistoryEntry[];
}

/** A player's request to take a choice in a specific scene. */
export interface ChoiceSelection {
  readonly sceneId: SceneId;
  readonly choiceId: ChoiceId;
}

/** A safe recovery point: a declared checkpoint id plus the snapshot it holds. */
export interface Checkpoint {
  readonly schemaVersion: StateSchemaVersion;
  readonly checkpointId: CheckpointId;
  readonly storyId: string;
  /** Scene the snapshot belongs to; mirrors `state.currentSceneId`. */
  readonly sceneId: SceneId;
  /** Number of history entries at snapshot time (derived convenience). */
  readonly step: number;
  readonly state: StoryState;
}

/** `null` means "the variable was absent". */
export interface VariableChange {
  readonly variable: VariableKey;
  readonly before: StateValue | null;
  readonly after: StateValue | null;
}

/** What a successful transition actually changed, for UI feedback and tests. */
export interface StateChangeSummary {
  readonly variableChanges: readonly VariableChange[];
  /** Clues discovered by this transition only (already-known clues excluded). */
  readonly discoveredClueIds: readonly ClueId[];
}

export type StoryErrorCode =
  /** No choice with this id exists in the scene the player is standing in. */
  | 'INVALID_CHOICE'
  /** The choice exists but its condition is not satisfied. */
  | 'CHOICE_UNAVAILABLE'
  /** The selection refers to a scene the player is not currently in. */
  | 'STALE_SCENE'
  /** The run already reached an ending. */
  | 'GAME_ENDED'
  /** The run is in a failed state; take `recover` first. */
  | 'GAME_FAILED'
  /** A persistence/integrity problem: the story has no such scene. */
  | 'UNKNOWN_SCENE'
  /** An effect could not be applied (e.g. incrementing a non-numeric value). */
  | 'EFFECT_FAILED'
  /** `recover` was called on a state that is not failed. */
  | 'NOT_FAILED'
  /** The failure is terminal, or declares no usable recovery target. */
  | 'NO_RECOVERY_TARGET'
  /** A snapshot/checkpoint failed structural or semantic validation. */
  | 'INVALID_SNAPSHOT'
  /** The checkpoint id is not declared in the story. */
  | 'UNKNOWN_CHECKPOINT'
  /** The current scene does not offer that checkpoint. */
  | 'CHECKPOINT_UNAVAILABLE'
  /** The supplied checkpoint is not the one the failure points at. */
  | 'CHECKPOINT_MISMATCH';

export interface StoryEngineError {
  /** Developer-facing message (English). The UI maps `code` to Persian copy. */
  readonly message: string;
  readonly code: StoryErrorCode;
  readonly sceneId?: SceneId;
  readonly choiceId?: ChoiceId;
  readonly checkpointId?: CheckpointId;
  readonly failureId?: FailureId;
  readonly clueId?: ClueId;
  readonly variable?: VariableKey;
  /** Extra diagnostics, e.g. every problem found in an invalid snapshot. */
  readonly detail?: readonly string[];
}

export type TransitionKind =
  | { readonly type: 'scene'; readonly fromSceneId: SceneId; readonly toSceneId: SceneId }
  | { readonly type: 'ending'; readonly fromSceneId: SceneId; readonly endingId: EndingId }
  | { readonly type: 'failure'; readonly fromSceneId: SceneId; readonly failureId: FailureId };

/**
 * Result of taking a choice. On failure the *unchanged* state is returned, so
 * callers can keep rendering the previous state without a separate branch.
 */
export type StoryTransitionResult =
  | {
      readonly ok: true;
      readonly state: StoryState;
      readonly choice: ChoiceDefinition;
      readonly transition: TransitionKind;
      readonly changes: StateChangeSummary;
    }
  | {
      readonly ok: false;
      readonly state: StoryState;
      readonly error: StoryEngineError;
    };

/** Result of creating a checkpoint. */
export type CheckpointResult =
  | { readonly ok: true; readonly checkpoint: Checkpoint }
  | { readonly ok: false; readonly error: StoryEngineError };

/** Result of restoring a checkpoint or snapshot. */
export type StateRestoreResult =
  | { readonly ok: true; readonly state: StoryState }
  | { readonly ok: false; readonly error: StoryEngineError };
