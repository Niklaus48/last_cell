/**
 * Story content registry.
 *
 * The UI never builds story data itself; it asks this module which story to
 * load. `chapter1` is the canonical content the application ships with; `demo`
 * is the disposable Phase 1 fixture kept only for engine-level development.
 */
import { chapter1Story } from './chapter1';
import { demoStory } from './demoStory';
import { packStatus, packStory } from './pack';
import type { StoryDefinition } from '../engine';

export type StoryKey = 'chapter1' | 'demo';

/** The story the application starts with. */
export const DEFAULT_STORY_KEY: StoryKey = 'chapter1';

/**
 * The story the game plays: the studio-authored content pack when one is
 * installed and valid, otherwise the canonical TypeScript content.
 */
const chapter1Active: StoryDefinition = packStory() ?? chapter1Story;

const registry: Readonly<Record<StoryKey, StoryDefinition>> = {
  chapter1: chapter1Active,
  demo: demoStory,
};

export function getStory(key: StoryKey): StoryDefinition {
  return registry[key];
}

/** True when the studio pack is what the game is currently playing. */
export const isStudioPackActive: boolean = packStatus.active;

export { chapter1Story, demoStory };
