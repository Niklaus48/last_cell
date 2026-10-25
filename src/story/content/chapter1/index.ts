/**
 * Chapter 1 — «شش ماه سکوت» — canonical story definition.
 *
 * This is the story the application loads. It is pure declarative data: no
 * functions, no React, no timers, no browser APIs. Every scene id, clue id,
 * checkpoint id, failure id and ending id is registered here or in `ids.ts`, and
 * every reference is checked by `validateStory` at engine construction time.
 */
import type { StoryDefinition } from '../../engine';
import { chapter1Checkpoints, chapter1Endings, chapter1Failures } from './endings';
import { CHAPTER1_SCENE, chapter1Clues } from './ids';
import { finaleScenes } from './scenes.finale';
import { onsetScenes } from './scenes.onset';
import { routeScenes } from './scenes.routes';

/**
 * Only variables that actually gate or change something are declared.
 * `clue` discovery is separate state (see the clue registry) on purpose: what
 * Kian has in hand must never be confused with what a character claims.
 */
export const chapter1InitialVariables = {
  /** Steadiness under pressure; gates some composed actions. */
  composure: 2,
  /** How much attention the guards have on Kian; gates some hiding options. */
  guardSuspicion: 0,
  /** How much of the six-month plan is still usable. */
  planIntegrity: 3,
  /** Whether the stranger is still able to reach Kian at all. */
  strangerContact: 0,
  /** How far Kian has leaned toward believing the stranger. */
  strangerTrust: 0,
  /** How much the stranger has actually said (claims included). */
  strangerKnowledge: 0,
  /** What Kian knows about the building beyond his own plan. */
  routeKnowledge: 0,
  /** Reckless moves made; a noisy run closes some doors later. */
  criticalMistakes: 0,
} as const;

export const chapter1Story: StoryDefinition = {
  id: 'chapter-1-six-months-of-silence',
  title: 'فصل اول — شش ماه سکوت',
  initialSceneId: CHAPTER1_SCENE.cellDawn,
  initialVariables: chapter1InitialVariables,
  clues: chapter1Clues,
  checkpoints: chapter1Checkpoints,
  failures: chapter1Failures,
  scenes: [...onsetScenes, ...routeScenes, ...finaleScenes],
  endings: chapter1Endings,
};

export * from './ids';
