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
 */
import { evaluateCondition } from './conditions';
import { applyEffects } from './effects';
import type {
  ChoiceCondition,
  ChoiceDefinition,
  ChoiceId,
  ChoiceSelection,
  EndingDefinition,
  HistoryEntry,
  SceneDefinition,
  SceneId,
  StoryDefinition,
  StoryEngineError,
  StoryState,
  StoryTransitionResult,
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
  /** Creates a fresh run at the story's initial scene. */
  start(): StoryState;
  /** The scene the player is standing in right now. */
  getCurrentScene(state: StoryState): SceneDefinition;
  /** Choices the player can currently pick (conditions evaluated). */
  getAvailableChoices(state: StoryState): readonly ChoiceDefinition[];
  /** Every choice declared for the current scene, regardless of availability. */
  getChoices(state: StoryState): readonly ChoiceDefinition[];
  /** True when `choiceId` is currently selectable in the current scene. */
  isChoiceAvailable(state: StoryState, choiceId: ChoiceId): boolean;
  /** Applies a choice. Never mutates `state`; failures return `state` unchanged. */
  choose(state: StoryState, selection: ChoiceSelection | ChoiceId): StoryTransitionResult;
  /** The ending record when the run has finished, otherwise `null`. */
  getEnding(state: StoryState): EndingDefinition | null;
  /** Re-validates a state snapshot loaded from an untrusted source. */
  restore(state: StoryState): StoryState;
}

function errorOf(
  state: StoryState,
  error: StoryEngineError,
): StoryTransitionResult {
  return { ok: false, state, error };
}

function findScene(story: StoryDefinition, sceneId: SceneId): SceneDefinition | undefined {
  return story.scenes.find((scene) => scene.id === sceneId);
}

function findEnding(story: StoryDefinition, endingId: string): EndingDefinition | undefined {
  return story.endings.find((ending) => ending.id === endingId);
}

/** Scene lookup that throws only if a state snapshot is inconsistent. */
function requireScene(story: StoryDefinition, state: StoryState): SceneDefinition {
  const scene = findScene(story, state.currentSceneId);
  if (scene === undefined) {
    throw new Error(
      `State refers to unknown scene "${state.currentSceneId}" in story "${story.id}".`,
    );
  }
  return scene;
}

function isConditionSatisfied(state: StoryState, condition: ChoiceCondition | undefined): boolean {
  if (condition === undefined) {
    return true;
  }
  return evaluateCondition(condition, {
    variables: state.variables,
    visitedSceneIds: state.visitedSceneIds,
  });
}

/**
 * Creates an engine bound to a story definition.
 * Throws `StoryDefinitionError` for structurally invalid stories so authoring
 * mistakes surface immediately instead of during a playthrough.
 */
export function createStoryEngine(input: StoryDefinition): StoryEngine {
  const validation = validateStory(input);
  if (!validation.ok) {
    throw new StoryDefinitionError(validation.errors);
  }
  const story = validation.story;

  const getCurrentScene = (state: StoryState): SceneDefinition => requireScene(story, state);

  const getChoices = (state: StoryState): readonly ChoiceDefinition[] =>
    getCurrentScene(state).choices;

  const getAvailableChoices = (state: StoryState): readonly ChoiceDefinition[] => {
    if (state.progress.status === 'ended') {
      return [];
    }
    return getChoices(state).filter((choice) =>
      isConditionSatisfied(state, choice.condition),
    );
  };

  const isChoiceAvailable = (state: StoryState, choiceId: ChoiceId): boolean =>
    getAvailableChoices(state).some((choice) => choice.id === choiceId);

  const getEnding = (state: StoryState): EndingDefinition | null => {
    if (state.progress.status !== 'ended') {
      return null;
    }
    return findEnding(story, state.progress.endingId) ?? null;
  };

  const start = (): StoryState => {
    const initialScene = findScene(story, story.initialSceneId);
    if (initialScene === undefined) {
      // Guarded by validation, kept as defense in depth for future migration.
      throw new Error(`Initial scene "${story.initialSceneId}" is missing.`);
    }
    return {
      storyId: story.id,
      currentSceneId: initialScene.id,
      progress: { status: 'playing' },
      variables: story.initialVariables ?? {},
      history: [{ sceneId: initialScene.id, choiceId: null }],
      visitedSceneIds: [initialScene.id],
    };
  };

  const choose = (
    state: StoryState,
    selection: ChoiceSelection | ChoiceId,
  ): StoryTransitionResult => {
    const choiceId = typeof selection === 'string' ? selection : selection.choiceId;
    const requestedSceneId = typeof selection === 'string' ? state.currentSceneId : selection.sceneId;

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

    const scene = requireScene(story, state);
    const choice = scene.choices.find((candidate) => candidate.id === choiceId);
    if (choice === undefined) {
      return errorOf(state, {
        code: 'INVALID_CHOICE',
        message: `Scene "${scene.id}" has no choice with id "${choiceId}".`,
        sceneId: scene.id,
        choiceId,
      });
    }
    if (!isConditionSatisfied(state, choice.condition)) {
      return errorOf(state, {
        code: 'CHOICE_UNAVAILABLE',
        message: `Choice "${choice.id}" is not available in the current state.`,
        sceneId: scene.id,
        choiceId,
      });
    }

    const variables = applyEffects(state.variables, choice.effects);
    const historyEntry: HistoryEntry = { sceneId: scene.id, choiceId: choice.id };

    if (choice.outcome.type === 'ending') {
      const nextState: StoryState = {
        ...state,
        variables,
        progress: { status: 'ended', endingId: choice.outcome.endingId },
        history: [...state.history, historyEntry],
      };
      return {
        ok: true,
        state: nextState,
        choice,
        transition: { type: 'ending', fromSceneId: scene.id, endingId: choice.outcome.endingId },
      };
    }

    const nextScene = findScene(story, choice.outcome.targetSceneId);
    if (nextScene === undefined) {
      // Guarded by validation; a missing target must never silently advance.
      return errorOf(state, {
        code: 'UNKNOWN_SCENE',
        message: `Choice "${choice.id}" targets unknown scene "${choice.outcome.targetSceneId}".`,
        sceneId: scene.id,
        choiceId,
      });
    }

    const nextState: StoryState = {
      ...state,
      currentSceneId: nextScene.id,
      variables,
      history: [...state.history, historyEntry, { sceneId: nextScene.id, choiceId: null }],
      visitedSceneIds: state.visitedSceneIds.includes(nextScene.id)
        ? state.visitedSceneIds
        : [...state.visitedSceneIds, nextScene.id],
    };

    return {
      ok: true,
      state: nextState,
      choice,
      transition: { type: 'scene', fromSceneId: scene.id, toSceneId: nextScene.id },
    };
  };

  const restore = (state: StoryState): StoryState => {
    if (state.storyId !== story.id) {
      throw new Error(`Cannot restore a save from story "${state.storyId}" into "${story.id}".`);
    }
    if (findScene(story, state.currentSceneId) === undefined) {
      throw new Error(`Save refers to unknown scene "${state.currentSceneId}".`);
    }
    if (state.progress.status === 'ended' && findEnding(story, state.progress.endingId) === undefined) {
      throw new Error(`Save refers to unknown ending "${state.progress.endingId}".`);
    }
    return state;
  };

  return {
    story,
    start,
    getCurrentScene,
    getChoices,
    getAvailableChoices,
    isChoiceAvailable,
    choose,
    getEnding,
    restore,
  };
}

/** Convenience helper for one-off calls. */
export function startStory(story: StoryDefinition): { engine: StoryEngine; state: StoryState } {
  const engine = createStoryEngine(story);
  return { engine, state: engine.start() };
}
