/**
 * Chapter 1, narrative failure sequences.
 *
 * The promise of this pack is about *how* a failed attempt is told, not only that
 * it ends: a bad decision must never cut straight to a result screen. The mistake
 * is played out (the guards notice, the arrest or the shooting happens), the
 * player reads it at their own pace, and only then does the attempt end. Coming
 * back is a rewind of the attempt — not Kian walking back to the door.
 *
 * Three sequences are covered:
 *  A. the door: `press-the-pick` / `search-caught` → detected → captured → caught at door;
 *  B. the office: `take-the-loose-page` → exposed → captured → office alarm;
 *  C. the corridor (new): `forced-dash-into-gunfire` → warning → outcome → fatal.
 *
 * Engine-only (Vitest `node`): no React, no DOM.
 */
import { describe, expect, it } from 'vitest';
import { createStoryEngine, validateStory } from '../src/story/engine';
import type { StoryEngine, StoryState } from '../src/story/engine';
import {
  chapter1Story,
  CHAPTER1_CHECKPOINT,
  CHAPTER1_CLUE,
  CHAPTER1_ENDING,
  CHAPTER1_FAILURE,
  CHAPTER1_SCENE as S,
} from '../src/story/content/chapter1';
import baselineIds from './fixtures/chapter1-baseline-ids.json';

interface Step {
  readonly choiceId: string;
  readonly sceneId: string;
  readonly progress: StoryState['progress'];
}

interface Run {
  readonly engine: StoryEngine;
  readonly state: StoryState;
  readonly steps: readonly Step[];
}

function play(choiceIds: readonly string[]): Run {
  const engine = createStoryEngine(chapter1Story);
  let state = engine.start();
  const steps: Step[] = [];
  for (const choiceId of choiceIds) {
    const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId });
    if (!result.ok) {
      throw new Error(`step "${choiceId}" rejected in "${state.currentSceneId}": ${result.error.code}`);
    }
    state = result.state;
    steps.push({ choiceId, sceneId: state.currentSceneId, progress: state.progress });
  }
  return { engine, state, steps };
}

function numeric(state: StoryState, name: string): number {
  return Number(state.variables[name] ?? 0);
}

/** Quiet opening, service corridor, and the steel door. */
const TO_DOOR = [
  'listen-to-the-corridor',
  'go-back-to-the-bed',
  'stay-silent',
  'wait-for-the-steps-to-fade',
  'slip-out-now',
  'take-the-service-way',
  'cross-to-the-service-door',
  'head-straight-to-the-door',
  'straight-to-the-door',
];

/** Scenario A: a rushed pick at the lock gets Kian caught at the door. */
const DOOR_FAILURE = [...TO_DOOR, 'pick-the-bolt', 'press-the-pick'];
const DOOR_ACT = [S.failDoorDetected, S.failDoorCaptured];

/** Scenario A, second entrance: the guard's search catches him. */
const SEARCH_FAILURE = [
  ...TO_DOOR,
  'force-the-door',
  'forced-press',
  'freeze-and-observe',
  'search-caught',
];

/** Scenario B: the loose page is missed before Kian is out of the office. */
const OFFICE_FAILURE = [
  'test-the-bar',
  'leave-it',
  'stay-silent',
  'wait-for-the-steps-to-fade',
  'search-the-cell-first',
  'pull-the-note',
  'fold-it-into-your-sleeve',
  'take-the-office-way',
  'slip-past-the-door',
  'read-the-transfer-ledger',
  'take-the-loose-page',
];
const OFFICE_ACT = [S.failOfficeExposed, S.failOfficeCaptured];

/** Scenario C: running at an armed guard in a lit corridor. */
const FATAL_FAILURE = [...TO_DOOR, 'force-the-door', 'forced-dash-into-gunfire'];
const FATAL_ACT = [S.failFatalWarning, S.failFatalOutcome];

const CONTINUE = {
  door: 'failure-door-continue',
  office: 'failure-office-continue',
  fatal: 'failure-fatal-continue',
} as const;
const RESULT = {
  door: 'failure-door-result',
  office: 'failure-office-result',
  fatal: 'failure-fatal-result',
} as const;

describe('the failure scenes, as content', () => {
  it('adds exactly the six failure scenes and keeps every previous scene', () => {
    const ids = chapter1Story.scenes.map((scene) => scene.id);
    for (const sceneId of [...DOOR_ACT, ...OFFICE_ACT, ...FATAL_ACT]) {
      expect(ids).toContain(sceneId);
    }
    // Every id that existed before the two redesign packs is still there.
    for (const sceneId of baselineIds.sceneIds) {
      expect(ids, sceneId).toContain(sceneId);
    }
    expect(ids).toHaveLength(43);
  });

  it('keeps the three failure ids and their recovery targets declared', () => {
    const failures = chapter1Story.failures ?? [];
    expect(failures.map((failure) => failure.id).sort()).toEqual(
      [
        CHAPTER1_FAILURE.caughtAtDoor,
        CHAPTER1_FAILURE.officeAlarm,
        CHAPTER1_FAILURE.shotInCorridor,
      ].sort(),
    );
    expect(failures.find((f) => f.id === CHAPTER1_FAILURE.caughtAtDoor)).toMatchObject({
      kind: 'recoverable',
      recovery: { type: 'checkpoint', checkpointId: CHAPTER1_CHECKPOINT.doorApproach },
    });
    expect(failures.find((f) => f.id === CHAPTER1_FAILURE.officeAlarm)).toMatchObject({
      kind: 'recoverable',
      recovery: { type: 'checkpoint', checkpointId: CHAPTER1_CHECKPOINT.corridorFirst },
    });
    expect(failures.find((f) => f.id === CHAPTER1_FAILURE.shotInCorridor)).toMatchObject({
      kind: 'fatal',
      recovery: { type: 'checkpoint', checkpointId: CHAPTER1_CHECKPOINT.doorApproach },
    });
  });

  it('keeps the previous checkpoints, endings and clue ids untouched', () => {
    const checkpointIds = (chapter1Story.checkpoints ?? []).map((entry) => entry.id);
    expect(checkpointIds).toEqual([
      CHAPTER1_CHECKPOINT.cellExit,
      CHAPTER1_CHECKPOINT.corridorFirst,
      CHAPTER1_CHECKPOINT.doorApproach,
    ]);
    const endingIds = (chapter1Story.endings ?? []).map((entry) => entry.id).sort();
    expect(endingIds).toEqual(
      [
        CHAPTER1_ENDING.ambiguousTruth,
        CHAPTER1_ENDING.contradictoryDossier,
        CHAPTER1_ENDING.possibleConnection,
      ].sort(),
    );
    const clueIds = (chapter1Story.clues ?? []).map((entry) => entry.id).sort();
    expect(clueIds).toEqual([...Object.values(CHAPTER1_CLUE)].sort());
  });

  it('never lets a failing choice end the run on the spot', () => {
    // Each act scene hands the player the next beat; only the *result* choice,
    // after both scenes have been read, declares the failure.
    for (const [firstSceneId, secondSceneId, ownContinue, ownResult] of [
      [S.failDoorDetected, S.failDoorCaptured, CONTINUE.door, RESULT.door],
      [S.failOfficeExposed, S.failOfficeCaptured, CONTINUE.office, RESULT.office],
      [S.failFatalWarning, S.failFatalOutcome, CONTINUE.fatal, RESULT.fatal],
    ] as const) {
      const first = chapter1Story.scenes.find((candidate) => candidate.id === firstSceneId);
      const second = chapter1Story.scenes.find((candidate) => candidate.id === secondSceneId);
      expect(first, firstSceneId).toBeDefined();
      expect(second, secondSceneId).toBeDefined();
      // The first scene only moves on — it cannot end the attempt yet.
      expect(first?.choices.map((choice) => choice.id), firstSceneId).toEqual([ownContinue]);
      expect(first?.narration.length ?? 0, firstSceneId).toBeGreaterThan(0);
      // The second scene is the one that lets the player see the outcome.
      expect(second?.choices.map((choice) => choice.id), secondSceneId).toEqual([ownResult]);
      expect(second?.narration.length ?? 0, secondSceneId).toBeGreaterThan(0);
    }

    // The two act scenes of a sequence share the same continue/result pair, so the
    // pair is the sequence's, not a single scene's.
    const actScenes = new Set<string>([...DOOR_ACT, ...OFFICE_ACT, ...FATAL_ACT]);
    for (const scene of chapter1Story.scenes) {
      if (actScenes.has(scene.id)) {
        continue;
      }
      for (const choice of scene.choices) {
        expect(choice.outcome.type, `${scene.id}/${choice.id}`).not.toBe('failure');
      }
    }
  });

  it('reaches every scene from the start once conditions are ignored', () => {
    const scenes = new Map(chapter1Story.scenes.map((scene) => [scene.id, scene]));
    const seen = new Set<string>([chapter1Story.initialSceneId]);
    const queue = [chapter1Story.initialSceneId];
    while (queue.length > 0) {
      const sceneId = queue.shift() as string;
      const scene = scenes.get(sceneId);
      if (scene === undefined) continue;
      for (const choice of scene.choices) {
        const target =
          choice.outcome.type === 'transition' ? choice.outcome.targetSceneId : undefined;
        if (target !== undefined && !seen.has(target)) {
          seen.add(target);
          queue.push(target);
        }
      }
    }
    for (const scene of chapter1Story.scenes) {
      expect(seen.has(scene.id), `unreachable scene ${scene.id}`).toBe(true);
    }
  });

  it('offers the fatal dash as a visible risk, not a hidden trap', () => {
    const scene = chapter1Story.scenes.find((candidate) => candidate.id === S.forcedDoorNoise);
    const choice = scene?.choices.find((candidate) => candidate.id === 'forced-dash-into-gunfire');
    expect(choice).toBeDefined();
    expect(choice?.condition).toBeUndefined();
    // The label itself warns that the guard is armed and the corridor is lit.
    expect(choice?.label).toMatch(/نگهبان مسلح/);
    expect(choice?.label).toMatch(/روشن/);
    // The scene's narration says the same thing before the choice is made.
    const narration = (scene?.narration ?? []).join(' ');
    expect(narration).toMatch(/نگهبان|مسلح/);
  });
});

describe('scenario A — caught at the door', () => {
  it('plays the detection and the capture before anything ends', () => {
    const run = play([...DOOR_FAILURE, CONTINUE.door]);
    const sceneIds = run.steps.map((step) => step.sceneId);
    // The failing choice opens the sequence, it does not end it.
    expect(sceneIds.slice(-2)).toEqual([S.failDoorDetected, S.failDoorCaptured]);
    expect(sceneIds).toHaveLength(DOOR_FAILURE.length + 1);

    for (const step of run.steps) {
      expect(step.progress, step.choiceId).toEqual({ status: 'playing' });
    }
    // One scene in, the attempt is still alive: the capture is a scene, not a result.
    expect(run.state.currentSceneId).toBe(S.failDoorCaptured);

    const failed = play([...DOOR_FAILURE, CONTINUE.door, RESULT.door]);
    expect(failed.state.progress).toEqual({
      status: 'failed',
      failureId: CHAPTER1_FAILURE.caughtAtDoor,
    });
    expect(failed.engine.getFailure(failed.state)?.kind).toBe('recoverable');
    expect(failed.engine.getRecoveryTarget(failed.state)).toEqual({
      type: 'checkpoint',
      checkpointId: CHAPTER1_CHECKPOINT.doorApproach,
    });
  });

  it('names the specific cause on the result screen data', () => {
    const failure = (chapter1Story.failures ?? []).find(
      (entry) => entry.id === CHAPTER1_FAILURE.caughtAtDoor,
    );
    expect(failure?.title).toMatch(/سلول ۱۴/);
    // The summary says what Kian did wrong, not just that he failed.
    expect(failure?.summary).toMatch(/عجله/);
  });

  it('rewinds the attempt to the pre-door checkpoint, with no leaked state', () => {
    const engine = createStoryEngine(chapter1Story);
    let state = engine.start();
    for (const choiceId of [...TO_DOOR.slice(0, 8)]) {
      const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId });
      if (!result.ok) throw new Error(result.error.code);
      state = result.state;
    }
    // corridorMid declares the pre-door checkpoint.
    const checkpoint = engine.createCheckpoint(state);
    expect(checkpoint.ok).toBe(true);
    if (!checkpoint.ok) return;

    const suffix = [
      'straight-to-the-door',
      'pick-the-bolt',
      'press-the-pick',
      CONTINUE.door,
      RESULT.door,
    ];
    let failedState = state;
    for (const choiceId of suffix) {
      const result = engine.choose(failedState, {
        sceneId: failedState.currentSceneId,
        choiceId,
      });
      if (!result.ok) throw new Error(`${choiceId}: ${result.error.code}`);
      failedState = result.state;
    }
    expect(failedState.progress.status).toBe('failed');
    // The mistake was recorded *during* the attempt…
    expect(numeric(failedState, 'criticalMistakes')).toBeGreaterThan(
      numeric(checkpoint.checkpoint.state, 'criticalMistakes'),
    );

    const recovered = engine.recover(failedState, checkpoint.checkpoint);
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;

    // …and rolled back with the rest of the attempt: no grinding, no leftovers.
    expect(recovered.state.currentSceneId).toBe(S.corridorMid);
    expect(recovered.state.progress).toEqual({ status: 'playing' });
    expect(recovered.state.variables).toEqual(checkpoint.checkpoint.state.variables);
    expect(numeric(recovered.state, 'criticalMistakes')).toBe(
      numeric(checkpoint.checkpoint.state, 'criticalMistakes'),
    );
    expect(numeric(recovered.state, 'guardSuspicion')).toBe(
      numeric(checkpoint.checkpoint.state, 'guardSuspicion'),
    );
    expect(engine.hasClue(recovered.state, CHAPTER1_CLUE.corridorInitials)).toBe(false);
  });

  it('reaches the same sequence through the guard’s search', () => {
    const run = play([...SEARCH_FAILURE, CONTINUE.door, RESULT.door]);
    const sceneIds = run.steps.map((step) => step.sceneId);
    expect(sceneIds).toContain(S.failDoorDetected);
    expect(sceneIds).toContain(S.failDoorCaptured);
    expect(run.state.progress).toEqual({
      status: 'failed',
      failureId: CHAPTER1_FAILURE.caughtAtDoor,
    });
  });
});

describe('scenario B — caught in the office', () => {
  it('plays the missing page and the arrest before the result', () => {
    const run = play([...OFFICE_FAILURE, CONTINUE.office]);
    expect(run.state.currentSceneId).toBe(S.failOfficeCaptured);
    for (const step of run.steps) {
      expect(step.progress, step.choiceId).toEqual({ status: 'playing' });
    }

    const failed = play([...OFFICE_FAILURE, CONTINUE.office, RESULT.office]);
    expect(failed.state.progress).toEqual({
      status: 'failed',
      failureId: CHAPTER1_FAILURE.officeAlarm,
    });
    expect(failed.engine.getFailure(failed.state)?.kind).toBe('recoverable');
    expect(failed.engine.getRecoveryTarget(failed.state)).toEqual({
      type: 'checkpoint',
      checkpointId: CHAPTER1_CHECKPOINT.corridorFirst,
    });
  });

  it('keeps the discrepancy found before the arrest out of the rewound run', () => {
    const run = play([...OFFICE_FAILURE, CONTINUE.office, RESULT.office]);
    expect(run.engine.hasClue(run.state, CHAPTER1_CLUE.officeRecordDiscrepancy)).toBe(true);

    // The checkpoint that this failure points at is the first corridor scene.
    const fresh = play([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'search-the-cell-first',
      'pull-the-note',
      'memorize-and-leave-it',
    ]);
    expect(fresh.state.currentSceneId).toBe(S.corridorFirst);
    const checkpoint = fresh.engine.createCheckpoint(fresh.state);
    expect(checkpoint.ok).toBe(true);
    if (!checkpoint.ok) return;

    const recovered = run.engine.recover(run.state, checkpoint.checkpoint);
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;
    expect(recovered.state.currentSceneId).toBe(S.corridorFirst);
    expect(run.engine.hasClue(recovered.state, CHAPTER1_CLUE.officeRecordDiscrepancy)).toBe(false);
    expect(recovered.state.variables).toEqual(checkpoint.checkpoint.state.variables);
  });
});

describe('scenario C — the fatal dash', () => {
  it('is a fatal failure with a rewind, not a recoverable rescue', () => {
    const run = play([...FATAL_FAILURE, CONTINUE.fatal]);
    expect(run.state.currentSceneId).toBe(S.failFatalOutcome);
    for (const step of run.steps) {
      expect(step.progress, step.choiceId).toEqual({ status: 'playing' });
    }

    const failed = play([...FATAL_FAILURE, CONTINUE.fatal, RESULT.fatal]);
    const failure = failed.engine.getFailure(failed.state);
    expect(failure?.id).toBe(CHAPTER1_FAILURE.shotInCorridor);
    expect(failure?.kind).toBe('fatal');
    // Fatal is not silently downgraded to recoverable…
    expect(failure?.kind).not.toBe('recoverable');
    // …and it still offers exactly one honest way back: the rewind point.
    expect(failed.engine.getRecoveryTarget(failed.state)).toEqual({
      type: 'checkpoint',
      checkpointId: CHAPTER1_CHECKPOINT.doorApproach,
    });
  });

  it('rewinds to the checkpoint without resurrecting the run in the fiction', () => {
    const engine = createStoryEngine(chapter1Story);
    let state = engine.start();
    for (const choiceId of TO_DOOR.slice(0, 8)) {
      const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId });
      if (!result.ok) throw new Error(result.error.code);
      state = result.state;
    }
    const checkpoint = engine.createCheckpoint(state);
    expect(checkpoint.ok).toBe(true);
    if (!checkpoint.ok) return;
    const snapshot = checkpoint.checkpoint.state;

    let failedState = state;
    for (const choiceId of [
      'straight-to-the-door',
      'force-the-door',
      'forced-dash-into-gunfire',
      CONTINUE.fatal,
      RESULT.fatal,
    ]) {
      const result = engine.choose(failedState, {
        sceneId: failedState.currentSceneId,
        choiceId,
      });
      if (!result.ok) throw new Error(`${choiceId}: ${result.error.code}`);
      failedState = result.state;
    }
    expect(failedState.progress).toEqual({
      status: 'failed',
      failureId: CHAPTER1_FAILURE.shotInCorridor,
    });

    const recovered = engine.recover(failedState, checkpoint.checkpoint);
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;
    // A rewind of the attempt: the exact snapshot, not a new state that happens to
    // contain the same scene.
    expect(recovered.state).toEqual(snapshot);
    expect(recovered.state.currentSceneId).toBe(S.corridorMid);
    expect(recovered.state.progress).toEqual({ status: 'playing' });
  });

  it('survives a save/load round trip as a fatal failure', () => {
    const run = play([...FATAL_FAILURE, CONTINUE.fatal, RESULT.fatal]);
    const snapshot = run.engine.serializeState(run.state);
    const reloaded = run.engine.restoreSnapshot(snapshot);
    expect(reloaded.ok).toBe(true);
    if (!reloaded.ok) return;
    expect(reloaded.state.progress).toEqual(run.state.progress);
    expect(run.engine.getFailure(reloaded.state)?.kind).toBe('fatal');
    expect(run.engine.getRecoveryTarget(reloaded.state)).toEqual({
      type: 'checkpoint',
      checkpointId: CHAPTER1_CHECKPOINT.doorApproach,
    });
  });
});

describe('retrying a failure', () => {
  it('does not accumulate mistakes, suspicion or duplicate clues across two cycles', () => {
    const engine = createStoryEngine(chapter1Story);
    let state = engine.start();
    for (const choiceId of TO_DOOR.slice(0, 8)) {
      const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId });
      if (!result.ok) throw new Error(result.error.code);
      state = result.state;
    }
    // NOTE: recovering needs the checkpoint the failure declares; the engine
    // refuses a mismatch, so we build it from the same scene the target names.
    const checkpoint = engine.createCheckpoint(state);
    expect(checkpoint.ok).toBe(true);
    if (!checkpoint.ok) return;
    const baselineVariables = { ...checkpoint.checkpoint.state.variables };
    const baselineClues = [...checkpoint.checkpoint.state.discoveredClueIds].sort();

    const failingTail = [
      'straight-to-the-door',
      'pick-the-bolt',
      'press-the-pick',
      CONTINUE.door,
      RESULT.door,
    ];

    let current = state;
    for (let cycle = 0; cycle < 2; cycle += 1) {
      for (const choiceId of failingTail) {
        const result = engine.choose(current, { sceneId: current.currentSceneId, choiceId });
        if (!result.ok) throw new Error(`${cycle}/${choiceId}: ${result.error.code}`);
        current = result.state;
      }
      expect(current.progress.status).toBe('failed');
      const recovered = engine.recover(current, checkpoint.checkpoint);
      expect(recovered.ok).toBe(true);
      if (!recovered.ok) return;
      expect(recovered.state.variables).toEqual(baselineVariables);
      expect([...recovered.state.discoveredClueIds].sort()).toEqual(baselineClues);
      expect(recovered.state.history).toEqual(checkpoint.checkpoint.state.history);
      current = recovered.state;
    }
  });
});

describe('the fatal kind in the schema', () => {
  /** Rewrites the shipped fatal failure, keeping every reference intact. */
  const withFatalFailure = (patch: Record<string, unknown>) => ({
    ...chapter1Story,
    failures: (chapter1Story.failures ?? []).map((failure) =>
      failure.id === CHAPTER1_FAILURE.shotInCorridor ? { ...failure, ...patch } : failure,
    ),
  });

  it('accepts the shipped fatal failure with its checkpoint rewind', () => {
    expect(validateStory(chapter1Story).ok).toBe(true);
  });

  it('rejects a fatal failure without a rewind point', () => {
    const result = validateStory(withFatalFailure({ recovery: undefined }));
    if (result.ok) throw new Error('expected a fatal failure without a rewind to be rejected');
    expect(result.errors.map((error) => error.code)).toContain('INVALID_RECOVERY');
  });

  it('rejects a fatal failure that points at a checkpoint that does not exist', () => {
    const result = validateStory(
      withFatalFailure({
        recovery: { type: 'checkpoint', checkpointId: 'cp-does-not-exist' },
      }),
    );
    if (result.ok) throw new Error('expected an unknown checkpoint to be rejected');
    expect(result.errors.map((error) => error.code)).toContain('UNKNOWN_CHECKPOINT');
  });

  it('still rejects a terminal failure that declares a recovery target', () => {
    const result = validateStory(
      withFatalFailure({
        kind: 'terminal',
        recovery: { type: 'checkpoint', checkpointId: CHAPTER1_CHECKPOINT.doorApproach },
      }),
    );
    if (result.ok) throw new Error('expected a terminal failure with a recovery to be rejected');
    expect(result.errors.map((error) => error.code)).toContain('INVALID_RECOVERY');
  });
});
