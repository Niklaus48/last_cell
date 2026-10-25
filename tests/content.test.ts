/**
 * Architectural test for story content: definitions must be declarative data.
 * Executable functions, class instances or non-JSON values in story content are
 * a design regression, because such content cannot be validated, serialised or
 * moved out of the bundle later.
 */
import { describe, expect, it } from 'vitest';
import { demoStory } from '../src/story/content/demoStory';
import { getStory } from '../src/story/content';
import { makeTestStory } from './fixtures/testStory';
import type { StoryDefinition } from '../src/story/engine';

function collectNonData(value: unknown, path: string, problems: string[]): void {
  if (value === null) return;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return;
  if (type === 'function') {
    problems.push(`${path} is a function`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectNonData(item, `${path}[${index}]`, problems));
    return;
  }
  if (type === 'object') {
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      problems.push(`${path} is not a plain object`);
      return;
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      collectNonData(child, `${path}.${key}`, problems);
    }
    return;
  }
  problems.push(`${path} is a ${type}`);
}

describe('story content is declarative data', () => {
  const stories: ReadonlyArray<{ name: string; story: StoryDefinition }> = [
    { name: 'demoStory', story: demoStory },
    { name: 'registry:demo', story: getStory('demo') },
    { name: 'fixture', story: makeTestStory() },
  ];

  it.each(stories)('$name contains no functions, classes or non-JSON values', ({ story }) => {
    const problems: string[] = [];
    collectNonData(story, 'story', problems);
    expect(problems).toEqual([]);
  });

  it.each(stories)('$name survives a JSON round-trip unchanged', ({ story }) => {
    expect(JSON.parse(JSON.stringify(story))).toEqual(story);
  });

  it('declares its clue, checkpoint and failure ids explicitly in the demo', () => {
    // Content, not the engine, decides which ids exist.
    expect(demoStory.clues?.map((clue) => clue.id)).toEqual(['folded-note']);
    expect(demoStory.checkpoints?.map((entry) => entry.id)).toEqual(['cp-corridor']);
    expect(demoStory.failures?.map((entry) => entry.id)).toEqual(['f-guard-alert']);
  });
});
