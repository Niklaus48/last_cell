import { describe, expect, it } from 'vitest';
import { createStoryEngine, StoryDefinitionError, validateStory } from '../src/story/engine';
import type { StoryDefinition } from '../src/story/engine';
import {
  makeTestStory,
  TEST_CHECKPOINT_IDS,
  TEST_CLUE_IDS,
  TEST_FAILURE_IDS,
  TEST_SCENE_IDS,
} from './fixtures/testStory';

/**
 * Deep-mutable view of a story definition, used to inject authoring mistakes.
 * `structuredClone` keeps the fixture itself untouched between tests.
 */
type Mutable<Value> = Value extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : Value extends object
    ? { -readonly [Key in keyof Value]: Mutable<Value[Key]> }
    : Value;

function storyWith(mutate: (story: Mutable<StoryDefinition>) => void): StoryDefinition {
  // Localised assertion: the fixture is immutable; this clone is a mutable view for mutation.
  const story = structuredClone(makeTestStory()) as unknown as Mutable<StoryDefinition>;
  mutate(story);
  return story;
}

function sceneAt(story: Mutable<StoryDefinition>, index: number): Mutable<StoryDefinition>['scenes'][number] {
  const scene = story.scenes[index];
  if (scene === undefined) {
    throw new Error(`fixture must have a scene at index ${index}`);
  }
  return scene;
}

describe('validateStory', () => {
  it('accepts a well-formed story', () => {
    const result = validateStory(makeTestStory());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.story.id).toBe('fixture-story');
  });

  it('rejects a missing initial scene', () => {
    const result = validateStory(storyWith((story) => {
      story.initialSceneId = 'nope';
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toContain('UNKNOWN_INITIAL_SCENE');
  });

  it('rejects duplicate scene ids', () => {
    const result = validateStory(storyWith((story) => {
      story.scenes.push(structuredClone(sceneAt(story, 0)));
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toContain('DUPLICATE_SCENE_ID');
  });

  it('rejects a choice pointing at a nonexistent scene', () => {
    const result = validateStory(storyWith((story) => {
      const choice = sceneAt(story, 0).choices[0];
      if (choice === undefined) throw new Error('fixture must have a first choice');
      choice.outcome = { type: 'transition', targetSceneId: 'ghost-scene' };
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const unknownTarget = result.errors.find((error) => error.code === 'UNKNOWN_TARGET_SCENE');
    expect(unknownTarget?.path).toContain('choices[0].outcome.targetSceneId');
    expect(unknownTarget?.message).toContain('ghost-scene');
  });

  it('rejects duplicate choice ids inside one scene', () => {
    const result = validateStory(storyWith((story) => {
      const scene = sceneAt(story, 0);
      const choice = scene.choices[0];
      if (choice === undefined) throw new Error('fixture must have a first choice');
      scene.choices.push(structuredClone(choice));
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toContain('DUPLICATE_CHOICE_ID');
  });

  it('rejects a scene with no choices (dead end)', () => {
    const result = validateStory(storyWith((story) => {
      const fork = story.scenes.find((scene) => scene.id === TEST_SCENE_IDS.fork);
      if (fork === undefined) throw new Error('fixture must contain the fork scene');
      fork.choices = [];
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toContain('SCENE_WITHOUT_CHOICES');
  });

  it('rejects an ending reference that does not exist', () => {
    const result = validateStory(storyWith((story) => {
      const choice = sceneAt(story, 0).choices[1];
      if (choice === undefined) throw new Error('fixture must have a second choice');
      choice.outcome = { type: 'ending', endingId: 'ghost-ending' };
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toContain('UNKNOWN_ENDING');
  });

  it('rejects a malformed timed decision', () => {
    const result = validateStory(storyWith((story) => {
      sceneAt(story, 0).timedDecision = { durationMs: -5, defaultChoiceId: 'not-a-choice' };
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.filter((error) => error.code === 'INVALID_TIMED_DECISION')).toHaveLength(2);
  });

  it('rejects an empty scene id and an empty story id', () => {
    const result = validateStory(storyWith((story) => {
      story.id = '   ';
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toContain('EMPTY_FIELD');
  });
});

describe('createStoryEngine', () => {
  it('throws a StoryDefinitionError with a readable message for invalid stories', () => {
    const story = storyWith((draft) => {
      draft.initialSceneId = 'missing';
    });

    expect(() => createStoryEngine(story)).toThrow(StoryDefinitionError);
    try {
      createStoryEngine(story);
      expect.unreachable('engine creation should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(StoryDefinitionError);
      const definitionError = error as StoryDefinitionError;
      expect(definitionError.errors).toHaveLength(1);
      expect(definitionError.message).toContain('missing');
    }
  });
});

describe('validateStory — clues, checkpoints, failures', () => {
  const codes = (story: StoryDefinition): string[] => {
    const result = validateStory(story);
    return result.ok ? [] : result.errors.map((error) => error.code);
  };

  it('rejects an undeclared clue in an effect', () => {
    expect(
      codes(storyWith((story) => {
        const choice = sceneAt(story, 0).choices[0];
        if (choice === undefined) throw new Error('fixture');
        choice.effects = [{ kind: 'discoverClue', clueId: 'c-ghost' }];
      })),
    ).toContain('UNKNOWN_CLUE');
  });

  it('rejects an undeclared clue in a condition', () => {
    expect(
      codes(storyWith((story) => {
        const choice = sceneAt(story, 1).choices[0];
        if (choice === undefined) throw new Error('fixture');
        choice.condition = { kind: 'clueDiscovered', clueId: 'c-ghost' };
      })),
    ).toContain('UNKNOWN_CLUE');
  });

  it('rejects duplicate clue ids and empty labels', () => {
    expect(
      codes(storyWith((story) => {
        story.clues?.push({ id: TEST_CLUE_IDS.note, label: 'دوباره' });
      })),
    ).toContain('DUPLICATE_CLUE_ID');
  });

  it('allows free-form clue ids when no registry is declared', () => {
    const story = storyWith((draft) => {
      delete draft.clues;
    });
    expect(validateStory(story).ok).toBe(true);
  });

  it('rejects a checkpoint pointing at an unknown scene', () => {
    expect(
      codes(storyWith((story) => {
        const checkpoint = story.checkpoints?.[0];
        if (checkpoint === undefined) throw new Error('fixture');
        checkpoint.sceneId = 's-ghost';
      })),
    ).toContain('UNKNOWN_CHECKPOINT_SCENE');
  });

  it('rejects duplicate checkpoint ids', () => {
    expect(
      codes(storyWith((story) => {
        story.checkpoints?.push({ id: TEST_CHECKPOINT_IDS.start, sceneId: TEST_SCENE_IDS.fork });
      })),
    ).toContain('DUPLICATE_CHECKPOINT_ID');
  });

  it('rejects a failure that recovers to an undeclared checkpoint', () => {
    expect(
      codes(storyWith((story) => {
        const failure = story.failures?.[0];
        if (failure === undefined) throw new Error('fixture');
        failure.recovery = { type: 'checkpoint', checkpointId: 'cp-ghost' };
      })),
    ).toContain('UNKNOWN_CHECKPOINT');
  });

  it('rejects a recoverable failure without a recovery target', () => {
    expect(
      codes(storyWith((story) => {
        const failure = story.failures?.[0];
        if (failure === undefined) throw new Error('fixture');
        delete failure.recovery;
      })),
    ).toContain('INVALID_RECOVERY');
  });

  it('rejects a terminal failure that declares a recovery target', () => {
    expect(
      codes(storyWith((story) => {
        const failure = story.failures?.find((entry) => entry.id === TEST_FAILURE_IDS.terminal);
        if (failure === undefined) throw new Error('fixture');
        failure.recovery = { type: 'checkpoint', checkpointId: TEST_CHECKPOINT_IDS.fork };
      })),
    ).toContain('INVALID_RECOVERY');
  });

  it('rejects a choice that leads to an undeclared failure', () => {
    expect(
      codes(storyWith((story) => {
        const choice = sceneAt(story, 0).choices[0];
        if (choice === undefined) throw new Error('fixture');
        choice.outcome = { type: 'failure', failureId: 'f-ghost' };
      })),
    ).toContain('UNKNOWN_FAILURE');
  });

  it('rejects an increment on a variable declared as non-numeric', () => {
    const result = validateStory(storyWith((story) => {
      story.initialVariables = { ...story.initialVariables, tone: 'calm' };
      const choice = sceneAt(story, 0).choices[0];
      if (choice === undefined) throw new Error('fixture');
      choice.effects = [{ kind: 'incrementVariable', variable: 'tone', amount: 1 }];
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    const invalidIncrement = result.errors.find((error) => error.code === 'INVALID_INCREMENT');
    expect(invalidIncrement?.message).toContain('tone');
  });

  it('rejects a non-finite increment amount', () => {
    expect(
      codes(storyWith((story) => {
        const choice = sceneAt(story, 0).choices[0];
        if (choice === undefined) throw new Error('fixture');
        choice.effects = [
          { kind: 'incrementVariable', variable: 'courage', amount: Number.NaN },
        ];
      })),
    ).toContain('INVALID_INCREMENT');
  });

  it('rejects an ordered comparison against a non-numeric value', () => {
    const result = validateStory(storyWith((story) => {
      const choice = sceneAt(story, 1).choices[0];
      if (choice === undefined) throw new Error('fixture');
      choice.condition = {
        kind: 'compareVariable',
        variable: 'courage',
        operator: 'gte',
        value: 'many',
      };
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toContain('INVALID_CONDITION');
  });

  it('rejects empty all/any combinators and dangling visitedScene references', () => {
    const result = validateStory(storyWith((story) => {
      const first = sceneAt(story, 1).choices[0];
      const second = sceneAt(story, 1).choices[1];
      if (first === undefined || second === undefined) throw new Error('fixture');
      first.condition = { kind: 'all', conditions: [] };
      second.condition = { kind: 'visitedScene', sceneId: 's-ghost' };
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.filter((error) => error.code === 'INVALID_CONDITION')).toHaveLength(2);
  });

  it('rejects a story with no endings array instead of throwing', () => {
    const result = validateStory(storyWith((story) => {
      delete (story as { endings?: unknown }).endings;
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toContain('EMPTY_FIELD');
  });

  it('rejects a scene whose choices are missing instead of throwing', () => {
    const result = validateStory(storyWith((story) => {
      delete (sceneAt(story, 0) as { choices?: unknown }).choices;
    }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.code)).toContain('SCENE_WITHOUT_CHOICES');
  });
});
