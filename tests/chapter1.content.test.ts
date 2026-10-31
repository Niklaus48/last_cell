/**
 * Chapter 1 — structural and narrative-rule tests.
 *
 * Engine-only (Vitest `node` environment): no React, no DOM. These tests are
 * about the *content contract* — valid references, no dead ends, reachability,
 * and the narration rules the chapter must obey.
 */
import { describe, expect, it } from 'vitest';
import { createStoryEngine, validateStory } from '../src/story/engine';
import type { StoryDefinition, StoryState } from '../src/story/engine';
import {
  chapter1Story,
  CHAPTER1_CHECKPOINT,
  CHAPTER1_CLUE,
  CHAPTER1_ENDING,
  CHAPTER1_FAILURE,
  CHAPTER1_SCENE,
} from '../src/story/content/chapter1';
import { DEFAULT_STORY_KEY, getStory } from '../src/story/content';

interface ExplorationResult {
  readonly visitedSceneIds: ReadonlySet<string>;
  readonly takenChoiceIds: ReadonlySet<string>;
  readonly reachedEndingIds: ReadonlySet<string>;
  readonly reachedFailureIds: ReadonlySet<string>;
  readonly exploredStates: number;
}

/**
 * Canonicalises a variable value for state de-duplication.
 *
 * Sound for this chapter: every condition compares a numeric variable against a
 * threshold inside [-2, 5] (`composure >= 4`, `planIntegrity >= 1`,
 * `guardSuspicion <= 3`, …), so values outside that window are interchangeable
 * for *every* condition in the story. The upper bound matters: the chapter has
 * thresholds at 3 and 4, so clamping lower than that would merge states that
 * really do behave differently.
 * `history` is also left out of the signature, which is only safe because the
 * chapter uses no `visitedScene` conditions (asserted below).
 */
function canonicalValue(value: unknown): unknown {
  return typeof value === 'number' ? Math.max(-2, Math.min(5, value)) : value;
}

/**
 * Exhaustively plays the story from its initial scene, following every
 * available choice from every reachable state. This is what proves that no
 * scene, ending or failure is unreachable — and that no reachable state is a
 * dead end (a dead end simply produces no successor states).
 */
function exploreStory(story: StoryDefinition): ExplorationResult {
  const engine = createStoryEngine(story);
  const visitedSceneIds = new Set<string>();
  const takenChoiceIds = new Set<string>();
  const reachedEndingIds = new Set<string>();
  const reachedFailureIds = new Set<string>();
  const seen = new Set<string>();
  const queue: StoryState[] = [engine.start()];

  while (queue.length > 0) {
    const state = queue.pop();
    if (state === undefined) break;

    const signature = JSON.stringify([
      state.currentSceneId,
      state.progress,
      Object.entries(state.variables)
        .map(([key, value]) => [key, canonicalValue(value)])
        .sort(([a], [b]) => String(a).localeCompare(String(b))),
      [...state.discoveredClueIds].sort(),
    ]);
    if (seen.has(signature)) continue;
    seen.add(signature);
    visitedSceneIds.add(state.currentSceneId);

    if (state.progress.status === 'ended') {
      reachedEndingIds.add(state.progress.endingId);
      continue;
    }
    if (state.progress.status === 'failed') {
      reachedFailureIds.add(state.progress.failureId);
      continue;
    }

    for (const choice of engine.getAvailableChoices(state)) {
      const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId: choice.id });
      if (!result.ok) {
        throw new Error(`${state.currentSceneId} → ${choice.id} rejected: ${result.error.code}`);
      }
      takenChoiceIds.add(choice.id);
      queue.push(result.state);
    }
  }

  return {
    visitedSceneIds,
    takenChoiceIds,
    reachedEndingIds,
    reachedFailureIds,
    exploredStates: seen.size,
  };
}

const exploration = exploreStory(chapter1Story);

describe('story definition', () => {
  it('passes engine validation', () => {
    const result = validateStory(chapter1Story);
    if (!result.ok) {
      throw new Error(result.errors.map((error) => `${error.path}: ${error.message}`).join('\n'));
    }
    expect(result.ok).toBe(true);
  });

  it('is the default story the application loads', () => {
    expect(DEFAULT_STORY_KEY).toBe('chapter1');
    expect(getStory('chapter1')).toBe(chapter1Story);
  });

  it('has 24–40 narrative scenes, each with a unique id', () => {
    const ids = chapter1Story.scenes.map((scene) => scene.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(24);
    expect(ids.length).toBeLessThanOrEqual(40);
  });

  it('has unique choice ids within every scene', () => {
    for (const scene of chapter1Story.scenes) {
      const ids = scene.choices.map((choice) => choice.id);
      expect(new Set(ids).size, `scene ${scene.id}`).toBe(ids.length);
    }
  });

  it('declares every clue, checkpoint, failure and ending it uses', () => {
    expect(chapter1Story.clues?.length).toBe(Object.keys(CHAPTER1_CLUE).length);
    expect(chapter1Story.checkpoints?.length).toBe(Object.keys(CHAPTER1_CHECKPOINT).length);
    expect(chapter1Story.failures?.length).toBe(Object.keys(CHAPTER1_FAILURE).length);
    expect(chapter1Story.endings.length).toBe(Object.keys(CHAPTER1_ENDING).length);
    expect(chapter1Story.endings.length).toBeGreaterThanOrEqual(3);
  });

  it('starts in the cell, before the escape', () => {
    expect(chapter1Story.initialSceneId).toBe(CHAPTER1_SCENE.cellDawn);
  });

  it('contains no executable functions anywhere in its data', () => {
    const walk = (value: unknown, path: string): void => {
      expect(typeof value, path).not.toBe('function');
      if (value === null || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        walk(child, `${path}.${key}`);
      }
    };
    walk(chapter1Story, 'chapter1Story');
    expect(JSON.parse(JSON.stringify(chapter1Story))).toEqual(chapter1Story);
  });
});

describe('graph integrity', () => {
  it('reaches every declared scene from the initial scene', () => {
    const unreachable = chapter1Story.scenes
      .map((scene) => scene.id)
      .filter((sceneId) => !exploration.visitedSceneIds.has(sceneId));
    expect(unreachable).toEqual([]);
  });

  it('can reach every declared choice (no unreachable-looking option)', () => {
    const unreached = chapter1Story.scenes
      .flatMap((scene) => scene.choices.map((choice) => ({ sceneId: scene.id, id: choice.id })))
      .filter((choice) => !exploration.takenChoiceIds.has(choice.id))
      .map((choice) => `${choice.sceneId}/${choice.id}`);
    expect(unreached).toEqual([]);
  });

  it('can reach every declared ending', () => {
    expect([...exploration.reachedEndingIds].sort()).toEqual(
      chapter1Story.endings
        .map((ending) => ending.id)
        .sort(),
    );
  });

  it('can reach every recoverable failure', () => {
    expect([...exploration.reachedFailureIds].sort()).toEqual(
      (chapter1Story.failures ?? []).map((failure) => failure.id).sort(),
    );
  });

  it('has no dead-end scene: every scene offers at least one unconditional choice', () => {
    const deadEnds = chapter1Story.scenes
      .filter((scene) => !scene.choices.some((choice) => choice.condition === undefined))
      .map((scene) => scene.id);
    expect(deadEnds).toEqual([]);
  });

  it('never traps the player in an infinite loop (exploration terminates)', () => {
    // The only cycle is the deliberate fall-back to the safe corner, which costs
    // planIntegrity each time and therefore cannot repeat indefinitely.
    expect(exploration.exploredStates).toBeGreaterThan(1_000);
    expect(exploration.exploredStates).toBeLessThan(600_000);
  });

  it('uses no visitedScene conditions (keeps the exhaustive search sound)', () => {
    const usesHistory = JSON.stringify(chapter1Story.scenes).includes('"visitedScene"');
    expect(usesHistory).toBe(false);
  });
});

describe('state variables', () => {
  const variables = Object.keys(chapter1Story.initialVariables ?? {});

  it('declares only variables that actually gate something', () => {
    const storyJson = JSON.stringify({
      scenes: chapter1Story.scenes,
      failures: chapter1Story.failures,
    });

    for (const variable of variables) {
      // Every variable must appear in at least one condition…
      const gatesSomething = chapter1Story.scenes.some((scene) =>
        scene.choices.some((choice) =>
          choice.condition === undefined
            ? false
            : JSON.stringify(choice.condition).includes(`"${variable}"`),
        ),
      );
      // …and be written by at least one effect.
      const changesSomething = storyJson.includes(`"variable":"${variable}"`);

      expect(gatesSomething, `${variable} should gate at least one choice`).toBe(true);
      expect(changesSomething, `${variable} should be changed by at least one effect`).toBe(true);
    }
  });

  it('uses only numeric and boolean values that the engine can increment', () => {
    for (const [key, value] of Object.entries(chapter1Story.initialVariables ?? {})) {
      expect(['number', 'boolean'], key).toContain(typeof value);
    }
  });
});

describe('narrative rules', () => {
  const allNarration = chapter1Story.scenes.flatMap((scene) =>
    scene.narration.map((paragraph) => ({ sceneId: scene.id, paragraph })),
  );

  it('titles every scene in Persian and gives it narration', () => {
    for (const scene of chapter1Story.scenes) {
      expect(scene.title.trim().length, scene.id).toBeGreaterThan(0);
      expect(scene.title, scene.id).toMatch(/[\u0600-\u06FF]/);
      expect(scene.narration.length, scene.id).toBeGreaterThan(0);
    }
  });

  it('labels every choice in Persian', () => {
    for (const scene of chapter1Story.scenes) {
      for (const choice of scene.choices) {
        expect(choice.label, `${scene.id}/${choice.id}`).toMatch(/[\u0600-\u06FF]/);
        expect(choice.label.trim().length).toBeGreaterThan(3);
      }
    }
  });

  it('uses no dialogue-window speaker labels', () => {
    for (const { sceneId, paragraph } of allNarration) {
      expect(paragraph, sceneId).not.toMatch(/(^|\s)(Stranger|Kian|نوید|مرد)\s*:/);
      expect(paragraph, sceneId).not.toMatch(/^\s*(کیان|مرد|نوید)\s*:/);
    }
  });

  it('keeps every narration paragraph free of raw technical ids', () => {
    for (const { sceneId, paragraph } of allNarration) {
      expect(paragraph, sceneId).not.toMatch(/ch1-|cp-ch1|f-ch1|dated_note|clueDiscovered/);
    }
  });

  it('records the dated note verbatim, with a date and a reference number', () => {
    const noteScene = chapter1Story.scenes.find((scene) => scene.id === CHAPTER1_SCENE.note);
    const text = noteScene?.narration.join(' ') ?? '';

    // The note carries the transfer date and the file reference, and nothing
    // that would claim who wrote it.
    expect(text).toMatch(/چهاردهم مهر|۱۴ مهر/);
    expect(text).toMatch(/۴۱۷-ب/);
    expect(text).toContain('انتقال');
    expect(text).not.toContain('۹۲۰-۴');
  });
});

describe('timed decisions', () => {
  it('gives the first stranger encounter a 12s timer defaulting to silence', () => {
    const scene = chapter1Story.scenes.find((item) => item.id === CHAPTER1_SCENE.strangerArrives);
    expect(scene?.timedDecision).toEqual({ durationMs: 12000, defaultChoiceId: 'stay-silent' });
    expect(scene?.choices.map((choice) => choice.id)).toContain('stay-silent');
  });

  it('gives the guard encounter an 8s timer defaulting to a cautious action', () => {
    const scene = chapter1Story.scenes.find((item) => item.id === CHAPTER1_SCENE.doorAttempt);
    expect(scene?.timedDecision).toEqual({
      durationMs: 8000,
      defaultChoiceId: 'freeze-and-observe',
    });
    const defaultChoice = scene?.choices.find((choice) => choice.id === 'freeze-and-observe');
    // The default must be safe: it must not lead to a failure.
    expect(defaultChoice?.outcome.type).toBe('transition');
  });

  it('declares timers for exactly the two high-pressure scenes', () => {
    const withTimers = chapter1Story.scenes
      .filter((scene) => scene.timedDecision !== undefined)
      .map((scene) => scene.id);
    expect(withTimers.sort()).toEqual(
      [CHAPTER1_SCENE.strangerArrives, CHAPTER1_SCENE.doorAttempt].sort(),
    );
  });
});

describe('checkpoints', () => {
  it('declares three checkpoints at meaningful, distinct scenes', () => {
    const checkpoints = chapter1Story.checkpoints ?? [];
    expect(checkpoints).toHaveLength(3);

    const sceneIds = checkpoints.map((checkpoint) => checkpoint.sceneId);
    expect(new Set(sceneIds).size).toBe(3);
    // The escape attempt, a safe spot right after it, and the risk threshold.
    expect(sceneIds).toContain(CHAPTER1_SCENE.leavingCell);
    expect(sceneIds).toContain(CHAPTER1_SCENE.corridorFirst);
    expect(sceneIds).toContain(CHAPTER1_SCENE.corridorMid);
  });

  it('does not declare a checkpoint on every scene', () => {
    expect((chapter1Story.checkpoints ?? []).length).toBeLessThan(chapter1Story.scenes.length / 4);
  });
});
