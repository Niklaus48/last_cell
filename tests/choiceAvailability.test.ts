/**
 * The engine's explanation layer.
 *
 * `getChoiceAvailability` exists so the UI can show a locked option with a reason
 * instead of hiding it. The tests that matter most are the agreement tests: the
 * explanation may never disagree with the engine's own verdict.
 */
import { describe, expect, it } from 'vitest';
import {
  createStoryEngine,
  explainChoices,
  explainCondition,
  startStory,
  type ChoiceCondition,
  type StoryDefinition,
  type StoryState,
} from '../src/story/engine';
import { chapter1Story } from '../src/story/content/chapter1';

const engine = createStoryEngine(chapter1Story);
const start = startStory(chapter1Story).state;

function contextOf(state: StoryState) {
  return {
    variables: state.variables,
    visitedSceneIds: [] as string[],
    discoveredClueIds: [] as string[],
  };
}

describe('getChoiceAvailability', () => {
  it('agrees with isChoiceAvailable on the opening scene', () => {
    const availability = engine.getChoiceAvailability(start);
    const availableIds = engine.getAvailableChoices(start).map((choice) => choice.id);
    for (const entry of availability) {
      expect(engine.isChoiceAvailable(start, entry.choice.id)).toBe(entry.available);
      expect(entry.available).toBe(availableIds.includes(entry.choice.id));
    }
    expect(availability.map((entry) => entry.choice.id)).toEqual(
      engine.getChoices(start).map((choice) => choice.id),
    );
  });

  it('agrees with the engine on every scene of a real playthrough', () => {
    // Walk a deterministic path, checking the invariant at every step.
    let state: StoryState = start;
    const seen = new Set<string>();
    for (let step = 0; step < 40 && state.progress.status === 'playing'; step += 1) {
      seen.add(state.currentSceneId);
      const availability = engine.getChoiceAvailability(state);
      const available = new Set(engine.getAvailableChoices(state).map((choice) => choice.id));
      for (const entry of availability) {
        expect(entry.available, `${state.currentSceneId}/${entry.choice.id}`).toBe(
          available.has(entry.choice.id),
        );
        if (!entry.available) {
          expect(entry.unmet.length, `${entry.choice.id} needs a reason`).toBeGreaterThan(0);
        }
      }
      const next = availability.find((entry) => entry.available);
      if (next === undefined) break;
      const result = engine.choose(state, next.choice.id);
      expect(result.ok).toBe(true);
      if (!result.ok) break;
      state = result.state;
    }
    expect(seen.size).toBeGreaterThan(3);
  });

  it('reports a locked option with the variable, the requirement and the actual value', () => {
    // `slide-into-the-alcove` needs guardSuspicion <= 1.
    const scene = chapter1Story.scenes.find((entry) => entry.id === 'ch1-door-attempt');
    expect(scene).toBeDefined();
    const noisy: StoryState = {
      ...start,
      currentSceneId: 'ch1-door-attempt',
      variables: { ...start.variables, guardSuspicion: 3 },
    };
    const entry = engine
      .getChoiceAvailability(noisy)
      .find((candidate) => candidate.choice.id === 'slide-into-the-alcove');
    expect(entry).toBeDefined();
    expect(entry?.available).toBe(false);
    expect(entry?.unmet).toEqual([
      { kind: 'variable', variable: 'guardSuspicion', operator: 'lte', required: 1, actual: 3 },
    ]);
  });

  it('opens the same option when the variable is within range', () => {
    const calm: StoryState = {
      ...start,
      currentSceneId: 'ch1-door-attempt',
      variables: { ...start.variables, guardSuspicion: 1 },
    };
    const entry = engine
      .getChoiceAvailability(calm)
      .find((candidate) => candidate.choice.id === 'slide-into-the-alcove');
    expect(entry?.available).toBe(true);
    expect(entry?.unmet).toEqual([]);
    // …and the requirement is still visible, marked as met.
    expect(entry?.requirements).toEqual([
      {
        requirement: { kind: 'variable', variable: 'guardSuspicion', operator: 'lte', required: 1, actual: 1 },
        met: true,
      },
    ]);
  });

  it('describes an "all" condition by listing every failing part', () => {
    const condition: ChoiceCondition = {
      kind: 'all',
      conditions: [
        { kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 5 },
        { kind: 'compareVariable', variable: 'routeKnowledge', operator: 'gte', value: 2 },
      ],
    };
    const explanation = explainCondition(condition, contextOf(start));
    expect(explanation.met).toBe(false);
    expect(explanation.unmet).toHaveLength(2);
  });

  it('describes an unmet "any" condition as the set of alternatives', () => {
    const condition: ChoiceCondition = {
      kind: 'any',
      conditions: [
        { kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 9 },
        { kind: 'clueDiscovered', clueId: 'death_record_contradiction' },
      ],
    };
    const explanation = explainCondition(condition, contextOf(start));
    expect(explanation.met).toBe(false);
    expect(explanation.unmet.map((entry) => entry.kind).sort()).toEqual(['clue', 'variable']);
  });

  it('does not invent detail for a negated condition', () => {
    const explanation = explainCondition(
      { kind: 'not', condition: { kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 0 } },
      contextOf(start),
    );
    expect(explanation.met).toBe(false);
    expect(explanation.unmet).toEqual([{ kind: 'unknown' }]);
  });

  it('marks nothing available outside a live run', () => {
    const ended: StoryState = { ...start, progress: { status: 'ended', endingId: 'ch1-ending-plan' } };
    const availability = explainChoices(engine.getChoices(ended), contextOf(ended), false);
    expect(availability.every((entry) => !entry.available)).toBe(true);
  });

  it('treats a choice with no condition as available and requirement-free', () => {
    const availability = engine.getChoiceAvailability(start);
    const plain = availability.find((entry) => entry.choice.condition === undefined);
    expect(plain?.available).toBe(true);
    expect(plain?.requirements).toEqual([]);
  });

  it('keeps the order and count of declared choices', () => {
    const scene = chapter1Story.scenes[0];
    if (scene === undefined) return;
    const availability = engine.getChoiceAvailability(start);
    expect(availability).toHaveLength(scene.choices.length);
  });
});

describe('player-facing variable labels', () => {
  it('names every variable that a condition references', () => {
    const meta = engine.getVariableMeta();
    const referenced = new Set<string>();
    for (const scene of chapter1Story.scenes) {
      for (const choice of scene.choices) {
        for (const entry of explainChoices([choice], contextOf(start), true)) {
          for (const requirement of entry.requirements) {
            if (requirement.requirement.kind === 'variable') {
              referenced.add(requirement.requirement.variable);
            }
          }
        }
      }
    }
    expect(referenced.size).toBeGreaterThan(0);
    for (const variable of referenced) {
      expect(meta[variable]?.label, `missing label for ${variable}`).toBeTruthy();
    }
  });

  it('is validated: a label for an undeclared variable is rejected', () => {
    const broken: StoryDefinition = {
      ...chapter1Story,
      variableMeta: { ...chapter1Story.variableMeta, ghostVariable: { label: 'روح' } },
    };
    const invalid = createStoryEngineSafely(broken);
    expect(invalid).toBe(false);
  });
});

function createStoryEngineSafely(story: StoryDefinition): boolean {
  try {
    createStoryEngine(story);
    return true;
  } catch {
    return false;
  }
}
