/**
 * Domain model for the «آخرین سلول» story engine.
 *
 * ARCHITECTURAL RULE: everything in `src/story/engine/` is plain TypeScript.
 * It must not import React, React hooks, UI components, CSS, or touch browser
 * DOM APIs / browser storage. It is safe to run in a plain Node test process.
 *
 * All story content is *declarative data*: no JavaScript functions are stored
 * inside story definitions to express conditions or effects.
 */

/** Stable identifier for a scene. */
export type SceneId = string;
/** Stable identifier for a choice, unique within its scene. */
export type ChoiceId = string;
/** Stable identifier for an ending. */
export type EndingId = string;
/** Stable identifier for a visual asset (resolved to a URL by the UI layer). */
export type AssetId = string;
/** Key of a numeric/string/boolean story variable. */
export type VariableKey = string;

/** The values a story variable may hold. */
export type StateValue = string | number | boolean;

/** Immutable bag of story variables (flags, counters, small metrics). */
export type StoryVariables = Readonly<Record<VariableKey, StateValue>>;

export type ComparisonOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';

/**
 * Declarative availability rule for a choice.
 * Conditions are evaluated against the state *before* the choice is taken.
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
  | { readonly kind: 'not'; readonly condition: ChoiceCondition }
  | { readonly kind: 'all'; readonly conditions: readonly ChoiceCondition[] }
  | { readonly kind: 'any'; readonly conditions: readonly ChoiceCondition[] };

/**
 * Declarative mutation applied to story variables when a choice is taken.
 * Effects are applied in declaration order and never mutate the input state.
 */
export type StateEffect =
  | { readonly kind: 'setVariable'; readonly variable: VariableKey; readonly value: StateValue }
  | { readonly kind: 'incrementVariable'; readonly variable: VariableKey; readonly amount: number }
  | { readonly kind: 'unsetVariable'; readonly variable: VariableKey };

/**
 * Where a choice leads: another scene, or an explicit ending.
 * A discriminated union keeps "both" and "neither" unrepresentable.
 */
export type ChoiceOutcome =
  | { readonly type: 'transition'; readonly targetSceneId: SceneId }
  | { readonly type: 'ending'; readonly endingId: EndingId };

/**
 * Timed-decision metadata. Modelled in this phase but intentionally *not*
 * evaluated by the engine yet (see README, scope boundaries).
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

export interface StoryDefinition {
  readonly id: string;
  readonly title: string;
  readonly initialSceneId: SceneId;
  readonly scenes: readonly SceneDefinition[];
  readonly endings: readonly EndingDefinition[];
  /** Optional starting values; omitted variables are simply absent. */
  readonly initialVariables?: StoryVariables;
}

/** One step of the player's path. The initial entry has `choiceId: null`. */
export interface HistoryEntry {
  readonly sceneId: SceneId;
  readonly choiceId: ChoiceId | null;
}

export type StoryProgress =
  | { readonly status: 'playing' }
  | { readonly status: 'ended'; readonly endingId: EndingId };

/**
 * Complete, serialisable snapshot of a run.
 * Contains no functions, class instances, or browser handles, so a later phase
 * can persist it as-is.
 */
export interface StoryState {
  readonly storyId: string;
  readonly currentSceneId: SceneId;
  readonly progress: StoryProgress;
  readonly variables: StoryVariables;
  readonly history: readonly HistoryEntry[];
  readonly visitedSceneIds: readonly SceneId[];
}

/** A player's request to take a choice in a specific scene. */
export interface ChoiceSelection {
  readonly sceneId: SceneId;
  readonly choiceId: ChoiceId;
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
  /** A persistence/integrity problem: the story has no such scene. */
  | 'UNKNOWN_SCENE';

export interface StoryEngineError {
  /** Developer-facing message (English). The UI maps `code` to Persian copy. */
  readonly message: string;
  readonly code: StoryErrorCode;
  readonly sceneId?: SceneId;
  readonly choiceId?: ChoiceId;
}

export type TransitionKind =
  | { readonly type: 'scene'; readonly fromSceneId: SceneId; readonly toSceneId: SceneId }
  | { readonly type: 'ending'; readonly fromSceneId: SceneId; readonly endingId: EndingId };

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
    }
  | {
      readonly ok: false;
      readonly state: StoryState;
      readonly error: StoryEngineError;
    };
