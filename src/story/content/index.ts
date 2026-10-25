/**
 * Story content registry.
 *
 * The UI never builds story data itself; it asks this module which story to
 * load. In later phases the canonical Chapter 1 definition is registered here
 * alongside (or instead of) the development demo.
 */
import { demoStory } from './demoStory';
import type { StoryDefinition } from '../engine';

export type StoryKey = 'demo';

const registry: Readonly<Record<StoryKey, StoryDefinition>> = {
  demo: demoStory,
};

export function getStory(key: StoryKey): StoryDefinition {
  return registry[key];
}

export { demoStory };
