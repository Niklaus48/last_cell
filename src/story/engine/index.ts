/**
 * Public surface of the story engine.
 *
 * Consumers (React UI, tests, future persistence layer) import from here only.
 * Nothing in this module knows about React, the DOM, or browser storage.
 */
export * from './types';
export { STATE_SCHEMA_VERSION } from './types';

export { evaluateCondition } from './conditions';
export type { ConditionContext } from './conditions';

export { applyEffects } from './effects';
export type { EffectApplicationResult, EffectApplicationError, EffectTarget } from './effects';

export {
  deriveChoiceSequence,
  deriveSceneTransitions,
  deriveVisitedSceneIds,
} from './history';
export type { SceneTransitionStep } from './history';

export { validateStory } from './validation';
export type {
  StoryValidationCode,
  StoryValidationError,
  StoryValidationResult,
} from './validation';

export { createStoryEngine, startStory, StoryDefinitionError } from './engine';
export type { StoryEngine } from './engine';
