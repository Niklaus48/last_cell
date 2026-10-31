/**
 * Chapter 1 — branch, ending-eligibility and recovery tests.
 *
 * Every test drives the real engine through real choice sequences: no mocks, no
 * React, no DOM. Paths are written out as choice-id lists so a reader can follow
 * the playthrough the test asserts on.
 */
import { describe, expect, it } from 'vitest';
import { createStoryEngine } from '../src/story/engine';
import type { ChoiceDefinition, StoryEngine, StoryState } from '../src/story/engine';
import {
  chapter1Story,
  CHAPTER1_CHECKPOINT,
  CHAPTER1_CLUE,
  CHAPTER1_ENDING,
  CHAPTER1_FAILURE,
  CHAPTER1_SCENE as S,
} from '../src/story/content/chapter1';

interface Run {
  readonly engine: StoryEngine;
  readonly state: StoryState;
  readonly visited: readonly string[];
}

function startRun(): { engine: StoryEngine; state: StoryState } {
  const engine = createStoryEngine(chapter1Story);
  return { engine, state: engine.start() };
}

/** Plays the given choice ids in order, throwing on the first rejection. */
function playThrough(choiceIds: readonly string[]): Run {
  const { engine, state } = startRun();
  let current = state;
  const visited: string[] = [current.currentSceneId];

  for (const choiceId of choiceIds) {
    const result = engine.choose(current, { sceneId: current.currentSceneId, choiceId });
    if (!result.ok) {
      throw new Error(
        `step "${choiceId}" rejected in scene "${current.currentSceneId}": ${result.error.code}`,
      );
    }
    current = result.state;
    visited.push(current.currentSceneId);
  }
  return { engine, state: current, visited };
}

/** Continues a run from an existing state (used after taking a checkpoint). */
function continuePlay(
  engine: StoryEngine,
  from: StoryState,
  choiceIds: readonly string[],
): StoryState {
  let current = from;
  for (const choiceId of choiceIds) {
    const result = engine.choose(current, { sceneId: current.currentSceneId, choiceId });
    if (!result.ok) {
      throw new Error(
        `step "${choiceId}" rejected in scene "${current.currentSceneId}": ${result.error.code}`,
      );
    }
    current = result.state;
  }
  return current;
}

/** Reads a numeric variable without trusting the loose `StateValue` union. */
function numeric(state: StoryState, name: string): number {
  return Number(state.variables[name] ?? 0);
}

function availableChoiceIds(engine: StoryEngine, state: StoryState): string[] {
  return engine.getAvailableChoices(state).map((choice: ChoiceDefinition) => choice.id);
}

/**
 * A deliberately clue-free run: listen, stay silent, take the service corridor,
 * work the door quietly, then take the hatch the torch leaves open.
 *
 * It collects no evidence and never opens a line to the stranger, which is what
 * makes it the baseline for "you can always just leave".
 */
const MINIMAL_PATH = [
  'listen-to-the-corridor',
  'go-back-to-the-bed',
  'stay-silent',
  'wait-for-the-steps-to-fade',
  'slip-out-now',
  'take-the-service-way',
  'cross-to-the-service-door',
  'head-straight-to-the-door',
  'straight-to-the-door',
  'pick-the-bolt',
  'freeze-and-observe',
  'search-steady',
  'take-the-hatch',
  'keep-moving',
  'go-with-the-plan',
  'step-into-the-yard',
];

/**
 * Office route: finds the note, reads the ledger, correlates it, then takes the
 * evidence decision at the yard.
 */
const OFFICE_EVIDENCE_PATH = [
  'test-the-bar',
  'leave-it',
  'ask-who-he-is',
  'say-nothing-more',
  'search-the-cell-first',
  'pull-the-note',
  'fold-it-into-your-sleeve',
  'take-the-office-way',
  'slip-past-the-door',
  'read-the-transfer-ledger',
  'compare-with-a-number-you-know',
  'close-it-and-move',
  'look-at-the-scratches',
  'pick-the-bolt',
  'freeze-quiet',
  'take-the-hatch',
  'keep-moving',
  'ask-for-evidence-first',
  'put-the-two-dates-together',
];

/** Service route: finds the note and the altered schedule, then the archive. */
const SERVICE_EVIDENCE_PATH = [
  'test-the-bar',
  'leave-it',
  'ask-who-he-is',
  'say-nothing-more',
  'search-the-cell-first',
  'pull-the-note',
  'memorize-and-leave-it',
  'take-the-service-way',
  'study-the-board',
  'head-straight-to-the-door',
  'look-at-the-scratches',
  'pick-the-bolt',
  'freeze-quiet',
  'take-the-hatch',
  'search-the-old-folders',
  'note-the-archive-number',
  'ask-for-evidence-first',
  'put-the-two-dates-together',
];

/** Full evidence plus an open, trusting line to the stranger. */
const CONNECTION_PATH = [
  'listen-to-the-corridor',
  'memorize-the-rhythm',
  'ask-who-he-is',
  'press-for-a-name',
  'search-the-cell-first',
  'pull-the-note',
  'fold-it-into-your-sleeve',
  'take-the-office-way',
  'slip-past-the-door',
  'read-the-transfer-ledger',
  'compare-with-a-number-you-know',
  'close-it-and-move',
  'look-at-the-scratches',
  'pick-the-bolt',
  'freeze-quiet',
  'take-the-hatch',
  'answer-the-internal-phone',
  'let-him-explain',
  'ask-what-he-wants',
  'ask-him-about-navid',
  'show-him-the-record',
];

describe('Act II — the stranger', () => {
  it('offers exactly the three required choices at the first encounter', () => {
    const { engine, state } = startRun();
    const arriving = engine.choose(state, 'listen-to-the-corridor');
    expect(arriving.ok).toBe(true);
    if (!arriving.ok) return;
    const listened = engine.choose(arriving.state, 'go-back-to-the-bed');
    expect(listened.ok).toBe(true);
    if (!listened.ok) return;

    expect(listened.state.currentSceneId).toBe(S.strangerArrives);
    expect(availableChoiceIds(engine, listened.state).sort()).toEqual([
      'ask-who-he-is',
      'stay-silent',
      'threaten-him',
    ]);
  });

  it('silence reveals no clue, no contact and no knowledge', () => {
    const { engine, state } = startRun();
    const arriving = engine.choose(state, 'listen-to-the-corridor');
    if (!arriving.ok) throw new Error('walk failed');
    const before = engine.choose(arriving.state, 'go-back-to-the-bed');
    if (!before.ok) throw new Error('walk failed');

    const silent = engine.choose(before.state, 'stay-silent');
    expect(silent.ok).toBe(true);
    if (!silent.ok) return;

    expect(silent.state.currentSceneId).toBe(S.silence);
    expect(silent.state.discoveredClueIds).toEqual([]);
    expect(silent.changes.discoveredClueIds).toEqual([]);
    expect(silent.state.variables['strangerContact']).toBe(0);
    expect(silent.state.variables['strangerKnowledge']).toBe(0);
    expect(silent.state.variables['strangerTrust']).toBe(0);

    // …and nothing is awarded later in the silence branch either.
    const after = engine.choose(silent.state, 'wait-for-the-steps-to-fade');
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.state.discoveredClueIds).toEqual([]);
    expect(engine.hasClue(after.state, CHAPTER1_CLUE.datedNote)).toBe(false);
  });

  it('the silence choice carries no discovery effect in the story data', () => {
    const arriving = chapter1Story.scenes.find((scene) => scene.id === S.strangerArrives);
    const silence = arriving?.choices.find((choice) => choice.id === 'stay-silent');
    const effects = silence?.effects ?? [];
    expect(effects.some((effect) => effect.kind === 'discoverClue')).toBe(false);
  });

  it('asking and threatening change state differently, without resolving anything', () => {
    const { engine, state } = startRun();
    const arriving = engine.choose(state, 'listen-to-the-corridor');
    if (!arriving.ok) throw new Error('walk failed');
    const before = engine.choose(arriving.state, 'go-back-to-the-bed');
    if (!before.ok) throw new Error('walk failed');

    const asked = engine.choose(before.state, 'ask-who-he-is');
    const threatened = engine.choose(before.state, 'threaten-him');
    expect(asked.ok && threatened.ok).toBe(true);
    if (!asked.ok || !threatened.ok) return;

    expect(asked.state.variables['strangerContact']).toBe(1);
    expect(threatened.state.variables['strangerContact']).toBe(0);
    expect(threatened.state.variables['criticalMistakes']).toBe(1);
    expect(numeric(threatened.state, 'guardSuspicion')).toBeGreaterThan(
      numeric(asked.state, 'guardSuspicion'),
    );
    // Neither branch hands the player a clue.
    expect(asked.state.discoveredClueIds).toEqual([]);
    expect(threatened.state.discoveredClueIds).toEqual([]);
  });
});

describe('Act III — the dated note', () => {
  it('is discovered only by the examining choice', () => {
    const skipping = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'slip-out-now',
    ]);
    expect(skipping.state.currentSceneId).toBe(S.corridorFirst);
    expect(skipping.engine.hasClue(skipping.state, CHAPTER1_CLUE.datedNote)).toBe(false);

    const declining = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'search-the-cell-first',
      'leave-it-where-it-is',
    ]);
    expect(declining.engine.hasClue(declining.state, CHAPTER1_CLUE.datedNote)).toBe(false);

    const examining = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'search-the-cell-first',
      'pull-the-note',
    ]);
    expect(examining.state.currentSceneId).toBe(S.note);
    expect(examining.engine.hasClue(examining.state, CHAPTER1_CLUE.datedNote)).toBe(true);
  });
});

describe('Act IV — two routes, different information, shared convergence', () => {
  it('the office route yields the record discrepancy', () => {
    const run = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'slip-out-now',
      'take-the-office-way',
      'slip-past-the-door',
      'read-the-transfer-ledger',
    ]);
    expect(run.state.currentSceneId).toBe(S.officeLedger);
    expect(run.engine.hasClue(run.state, CHAPTER1_CLUE.officeRecordDiscrepancy)).toBe(true);
    expect(run.engine.hasClue(run.state, CHAPTER1_CLUE.scheduleReference)).toBe(false);
  });

  it('the service route yields the altered schedule and a second reference number', () => {
    const run = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'slip-out-now',
      'take-the-service-way',
      'study-the-board',
    ]);
    expect(run.state.currentSceneId).toBe(S.serviceEntry);
    expect(run.engine.hasClue(run.state, CHAPTER1_CLUE.scheduleReference)).toBe(true);
    expect(run.engine.hasClue(run.state, CHAPTER1_CLUE.officeRecordDiscrepancy)).toBe(false);
  });

  it('both routes converge on the same junction with their own state intact', () => {
    const office = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'slip-out-now',
      'take-the-office-way',
      'slip-past-the-door',
      'read-the-transfer-ledger',
      'close-the-folder',
    ]);
    const service = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'slip-out-now',
      'take-the-service-way',
      'study-the-board',
      'head-straight-to-the-door',
    ]);

    expect(office.state.currentSceneId).toBe(S.corridorMid);
    expect(service.state.currentSceneId).toBe(S.corridorMid);

    // Each route keeps its own information…
    expect(office.engine.hasClue(office.state, CHAPTER1_CLUE.officeRecordDiscrepancy)).toBe(true);
    expect(office.engine.hasClue(office.state, CHAPTER1_CLUE.scheduleReference)).toBe(false);
    expect(service.engine.hasClue(service.state, CHAPTER1_CLUE.scheduleReference)).toBe(true);
    expect(service.engine.hasClue(service.state, CHAPTER1_CLUE.officeRecordDiscrepancy)).toBe(
      false,
    );

    // …and everything the player built up before the split is carried through.
    expect(office.state.variables['strangerContact']).toBe(
      service.state.variables['strangerContact'],
    );
    expect(office.state.variables['strangerKnowledge']).toBe(
      service.state.variables['strangerKnowledge'],
    );
    expect(office.state.variables['guardSuspicion']).toBe(
      service.state.variables['guardSuspicion'],
    );
    expect(office.state.variables['planIntegrity']).toBe(
      service.state.variables['planIntegrity'],
    );
    expect(office.engine.getVisitedSceneIds(office.state)).toContain(S.leavingCell);
    expect(service.engine.getVisitedSceneIds(service.state)).toContain(S.leavingCell);
  });

  it('does not force the player through both routes', () => {
    const run = playThrough(SERVICE_EVIDENCE_PATH);
    expect(run.visited).not.toContain(S.officeEntry);
    expect(run.engine.getVisitedSceneIds(run.state)).not.toContain(S.officeEntry);
  });
});

describe('clue-gated options stay hidden without their evidence', () => {
  it('hides the reference-number comparison without a reference number', () => {
    const run = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'slip-out-now',
      'take-the-office-way',
      'slip-past-the-door',
      'read-the-transfer-ledger',
    ]);
    expect(run.state.currentSceneId).toBe(S.officeLedger);
    // The ledger itself is in hand, but nothing to correlate it with.
    expect(run.engine.hasClue(run.state, CHAPTER1_CLUE.officeRecordDiscrepancy)).toBe(true);
    expect(availableChoiceIds(run.engine, run.state)).not.toContain(
      'compare-with-a-number-you-know',
    );

    const rejected = run.engine.choose(run.state, 'compare-with-a-number-you-know');
    expect(rejected.ok).toBe(false);
    if (rejected.ok) return;
    expect(rejected.error.code).toBe('CHOICE_UNAVAILABLE');
  });

  it('hides the archive search without any reference number', () => {
    const run = playThrough([
      ...MINIMAL_PATH.slice(0, MINIMAL_PATH.indexOf('keep-moving')),
    ]);
    expect(run.state.currentSceneId).toBe(S.recordsAlcove);
    expect(availableChoiceIds(run.engine, run.state)).not.toContain('search-the-old-folders');
  });

  it('hides the alternative route without local knowledge', () => {
    const run = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'slip-out-now',
      'take-the-service-way',
      'cross-to-the-service-door',
      'head-straight-to-the-door',
      'straight-to-the-door',
    ]);
    expect(run.state.currentSceneId).toBe(S.lockedDoor);
    expect(run.state.variables['routeKnowledge']).toBe(0);
    expect(availableChoiceIds(run.engine, run.state)).not.toContain('look-for-another-way');
    // …but the door can still be forced, so the player is never stuck.
    expect(availableChoiceIds(run.engine, run.state)).toContain('force-the-door');
  });

  it('hides the alcove option once the guards are watching', () => {
    const run = playThrough([
      'test-the-bar',
      'ease-the-bolt',
      'threaten-him',
      'keep-pressing',
      'slip-out-now',
      'take-the-service-way',
      'cross-to-the-service-door',
      'follow-the-wet-track',
      'keep-following-the-track',
      'straight-to-the-door',
      'force-the-door',
      'forced-press',
    ]);
    expect(run.state.currentSceneId).toBe(S.doorAttempt);
    expect(run.state.variables['guardSuspicion']).toBeGreaterThanOrEqual(2);
    expect(availableChoiceIds(run.engine, run.state)).not.toContain('slide-into-the-alcove');
    // The cautious default is always there, whatever the suspicion level.
    expect(availableChoiceIds(run.engine, run.state)).toContain('freeze-and-observe');
  });
});

describe('endings', () => {
  it('Ending A is reachable with no clues at all', () => {
    const run = playThrough(MINIMAL_PATH);
    expect(run.state.discoveredClueIds).toEqual([]);
    expect(run.state.progress).toEqual({
      status: 'ended',
      endingId: CHAPTER1_ENDING.ambiguousTruth,
    });
    expect(run.engine.getEnding(run.state)?.tone).toBe('ambiguous');
  });

  it('a player who never contacts the stranger still finishes coherently', () => {
    const run = playThrough(MINIMAL_PATH);
    expect(run.state.variables['strangerContact']).toBe(0);

    const alcove = playThrough([...MINIMAL_PATH.slice(0, MINIMAL_PATH.indexOf('keep-moving'))]);
    expect(alcove.state.currentSceneId).toBe(S.recordsAlcove);
    expect(availableChoiceIds(alcove.engine, alcove.state)).not.toContain(
      'answer-the-internal-phone',
    );

    const finalStep = playThrough([
      ...MINIMAL_PATH.slice(0, MINIMAL_PATH.indexOf('keep-moving') + 1),
    ]);
    expect(finalStep.state.currentSceneId).toBe(S.finalApproach);
    expect(availableChoiceIds(finalStep.engine, finalStep.state)).not.toContain(
      'ask-him-about-navid',
    );
    expect(availableChoiceIds(finalStep.engine, finalStep.state)).toContain('go-with-the-plan');
  });

  it('Ending B is reachable through the office route', () => {
    const run = playThrough(OFFICE_EVIDENCE_PATH);
    expect(run.state.progress).toEqual({
      status: 'ended',
      endingId: CHAPTER1_ENDING.contradictoryDossier,
    });
    expect(run.engine.hasClue(run.state, CHAPTER1_CLUE.deathRecordContradiction)).toBe(true);
    // …and it never claims Navid is alive: the ending prose is about a record.
    expect(run.engine.getEnding(run.state)?.summary).toBe('چه کسی گزارش مرگ او را امضا کرده بود؟');
  });

  it('Ending B is reachable through the service route as well', () => {
    const run = playThrough(SERVICE_EVIDENCE_PATH);
    expect(run.state.progress).toEqual({
      status: 'ended',
      endingId: CHAPTER1_ENDING.contradictoryDossier,
    });
    expect(run.visited).toContain(S.recordsAlcove);
    expect(run.visited).not.toContain(S.officeLedger);
  });

  it('Ending B cannot be reached without the death-record contradiction', () => {
    // Same evidence path, but the ledger comparison is skipped: only the note is in hand.
    const run = playThrough([
      'test-the-bar',
      'leave-it',
      'ask-who-he-is',
      'say-nothing-more',
      'search-the-cell-first',
      'pull-the-note',
      'fold-it-into-your-sleeve',
      'take-the-office-way',
      'slip-past-the-door',
      'memorize-the-room-and-go',
      'look-at-the-scratches',
      'pick-the-bolt',
      'freeze-quiet',
      'take-the-hatch',
      'keep-moving',
      'ask-for-evidence-first',
    ]);

    expect(run.state.currentSceneId).toBe(S.endingEvidence);
    expect(run.engine.hasClue(run.state, CHAPTER1_CLUE.deathRecordContradiction)).toBe(false);
    expect(availableChoiceIds(run.engine, run.state)).not.toContain('put-the-two-dates-together');

    const rejected = run.engine.choose(run.state, 'put-the-two-dates-together');
    expect(rejected.ok).toBe(false);

    const fallback = run.engine.choose(run.state, 'go-forward-without-proof');
    expect(fallback.ok).toBe(true);
    if (!fallback.ok) return;
    const stepped = run.engine.choose(fallback.state, 'step-into-the-yard');
    expect(stepped.ok).toBe(true);
    if (!stepped.ok) return;
    // Without the contradiction the chapter resolves to Ending A.
    expect(stepped.state.progress).toEqual({
      status: 'ended',
      endingId: CHAPTER1_ENDING.ambiguousTruth,
    });
  });

  it('Ending C is reachable with the right evidence and choices', () => {
    const run = playThrough(CONNECTION_PATH);
    expect(run.state.progress).toEqual({
      status: 'ended',
      endingId: CHAPTER1_ENDING.possibleConnection,
    });
    expect(run.engine.getEnding(run.state)?.tone).toBe('hopeful');
  });

  it('Ending C requires the stranger conversation to have happened', () => {
    const run = playThrough([
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
      'compare-with-a-number-you-know',
      'close-it-and-move',
      'look-at-the-scratches',
      'pick-the-bolt',
      'freeze-quiet',
      'take-the-hatch',
      'keep-moving',
    ]);
    expect(run.state.currentSceneId).toBe(S.finalApproach);
    expect(run.engine.hasClue(run.state, CHAPTER1_CLUE.deathRecordContradiction)).toBe(true);
    // Full evidence, but the player stayed silent in Act II: no line to the stranger.
    expect(availableChoiceIds(run.engine, run.state)).not.toContain('ask-him-about-navid');
  });

  it('Ending C is locked for a player with the record but no lean toward the stranger', () => {
    // Full evidence and enough conversation to ask about Navid — but the phone
    // line is never answered, so trust stays at zero and the record alone is not
    // enough to make the accusation land.
    const run = playThrough([
      'test-the-bar',
      'leave-it',
      'ask-who-he-is',
      'press-for-a-name',
      'search-the-cell-first',
      'pull-the-note',
      'fold-it-into-your-sleeve',
      'take-the-office-way',
      'slip-past-the-door',
      'read-the-transfer-ledger',
      'compare-with-a-number-you-know',
      'close-it-and-move',
      'look-at-the-scratches',
      'pick-the-bolt',
      'freeze-quiet',
      'take-the-hatch',
      'keep-moving',
      'ask-him-about-navid',
    ]);

    expect(run.state.currentSceneId).toBe(S.endingConnection);
    expect(run.engine.hasClue(run.state, CHAPTER1_CLUE.deathRecordContradiction)).toBe(true);
    expect(run.state.variables['strangerTrust']).toBe(0);
    expect(availableChoiceIds(run.engine, run.state)).not.toContain('show-him-the-record');

    const thin = run.engine.choose(run.state, 'ask-without-a-paper-in-your-hand');
    expect(thin.ok).toBe(true);
    if (!thin.ok) return;
    const walked = run.engine.choose(thin.state, 'walk-out-anyway');
    expect(walked.ok).toBe(true);
    if (!walked.ok) return;
    expect(walked.state.progress).toEqual({
      status: 'ended',
      endingId: CHAPTER1_ENDING.ambiguousTruth,
    });
  });

  it('a player who trusts the stranger but found nothing gets no evidence ending', () => {
    const run = playThrough([
      'test-the-bar',
      'leave-it',
      'ask-who-he-is',
      'press-for-a-name',
      'slip-out-now',
      'take-the-service-way',
      'cross-to-the-service-door',
      'head-straight-to-the-door',
      'straight-to-the-door',
      'force-the-door',
      'forced-press',
      'freeze-and-observe',
      'search-steady',
      'take-the-hatch',
      'answer-the-internal-phone',
      'let-him-explain',
      'ask-what-he-wants',
    ]);
    expect(run.state.currentSceneId).toBe(S.finalApproach);
    expect(run.state.discoveredClueIds).toEqual([]);
    expect(availableChoiceIds(run.engine, run.state)).not.toContain('ask-for-evidence-first');
    expect(availableChoiceIds(run.engine, run.state)).toContain('ask-him-about-navid');

    const asked = run.engine.choose(run.state, 'ask-him-about-navid');
    expect(asked.ok).toBe(true);
    if (!asked.ok) return;
    // Without evidence the conversation has no leverage: C stays locked.
    expect(availableChoiceIds(run.engine, asked.state)).not.toContain('show-him-the-record');
  });

  it('never exposes more than one ending revelation in a single run', () => {
    for (const path of [MINIMAL_PATH, OFFICE_EVIDENCE_PATH, CONNECTION_PATH]) {
      const run = playThrough(path);
      expect(run.state.progress.status).toBe('ended');
      // A finished run refuses further choices, so no second ending can follow.
      const further = run.engine.choose(run.state, 'step-into-the-yard');
      expect(further.ok).toBe(false);
    }
  });
});

describe('checkpoints and recoverable failures', () => {
  it('offers the three declared checkpoints in their own scenes', () => {
    const cell = playThrough([]);
    expect(cell.engine.getCheckpointOpportunity(cell.state)?.id).toBeUndefined();

    const threshold = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
    ]);
    expect(threshold.state.currentSceneId).toBe(S.leavingCell);
    expect(threshold.engine.getCheckpointOpportunity(threshold.state)?.id).toBe(
      CHAPTER1_CHECKPOINT.cellExit,
    );

    const corridor = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'slip-out-now',
    ]);
    expect(corridor.engine.getCheckpointOpportunity(corridor.state)?.id).toBe(
      CHAPTER1_CHECKPOINT.corridorFirst,
    );

    const junction = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'slip-out-now',
      'take-the-service-way',
      'cross-to-the-service-door',
      'head-straight-to-the-door',
    ]);
    expect(junction.engine.getCheckpointOpportunity(junction.state)?.id).toBe(
      CHAPTER1_CHECKPOINT.doorApproach,
    );
  });

  it('recovers from the door failure to the pre-door checkpoint', () => {
    const run = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'slip-out-now',
      'take-the-service-way',
      'cross-to-the-service-door',
      'head-straight-to-the-door',
    ]);
    expect(run.state.currentSceneId).toBe(S.corridorMid);

    const checkpoint = run.engine.createCheckpoint(run.state);
    expect(checkpoint.ok).toBe(true);
    if (!checkpoint.ok) return;
    expect(checkpoint.checkpoint.checkpointId).toBe(CHAPTER1_CHECKPOINT.doorApproach);

    const failed = continuePlay(run.engine, run.state, [
      'look-at-the-scratches',
      'pick-the-bolt',
      'press-the-pick',
    ]);
    expect(failed.progress).toEqual({
      status: 'failed',
      failureId: CHAPTER1_FAILURE.caughtAtDoor,
    });
    expect(run.engine.getFailure(failed)?.kind).toBe('recoverable');
    expect(run.engine.getRecoveryTarget(failed)).toEqual({
      type: 'checkpoint',
      checkpointId: CHAPTER1_CHECKPOINT.doorApproach,
    });

    const recovered = run.engine.recover(failed, checkpoint.checkpoint);
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;

    expect(recovered.state.currentSceneId).toBe(S.corridorMid);
    expect(recovered.state.progress).toEqual({ status: 'playing' });
    expect(recovered.state).toEqual(checkpoint.checkpoint.state);
    // The initials were found after the checkpoint, so they are rolled back too.
    expect(run.engine.hasClue(recovered.state, CHAPTER1_CLUE.corridorInitials)).toBe(false);
  });

  it('rolls back clues found after the checkpoint and keeps clues found before it', () => {
    const run = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'search-the-cell-first',
      'pull-the-note',
      'memorize-and-leave-it',
    ]);
    expect(run.state.currentSceneId).toBe(S.corridorFirst);
    expect(run.engine.hasClue(run.state, CHAPTER1_CLUE.datedNote)).toBe(true);

    const checkpoint = run.engine.createCheckpoint(run.state);
    expect(checkpoint.ok).toBe(true);
    if (!checkpoint.ok) return;

    // Now discover something *after* the checkpoint, then get caught.
    const office = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'search-the-cell-first',
      'pull-the-note',
      'memorize-and-leave-it',
      'take-the-office-way',
      'slip-past-the-door',
      'read-the-transfer-ledger',
      'take-the-loose-page',
    ]);
    expect(office.state.progress).toEqual({
      status: 'failed',
      failureId: CHAPTER1_FAILURE.officeAlarm,
    });
    expect(office.engine.hasClue(office.state, CHAPTER1_CLUE.officeRecordDiscrepancy)).toBe(true);

    const recovered = office.engine.recover(office.state, checkpoint.checkpoint);
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;

    expect(recovered.state.currentSceneId).toBe(S.corridorFirst);
    // Discovered before the checkpoint → kept.
    expect(office.engine.hasClue(recovered.state, CHAPTER1_CLUE.datedNote)).toBe(true);
    // Discovered after the checkpoint → rolled back with the rest of the run.
    expect(office.engine.hasClue(recovered.state, CHAPTER1_CLUE.officeRecordDiscrepancy)).toBe(
      false,
    );
    expect(recovered.state.variables).toEqual(checkpoint.checkpoint.state.variables);
  });

  it('refuses recovery to a checkpoint that is not the failure’s target', () => {
    const run = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
    ]);
    const wrong = run.engine.createCheckpoint(run.state);
    expect(wrong.ok).toBe(true);
    if (!wrong.ok) return;

    const failed = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'slip-out-now',
      'take-the-service-way',
      'cross-to-the-service-door',
      'head-straight-to-the-door',
      'straight-to-the-door',
      'pick-the-bolt',
      'press-the-pick',
    ]);
    expect(failed.state.progress.status).toBe('failed');

    const recovered = failed.engine.recover(failed.state, wrong.checkpoint);
    expect(recovered.ok).toBe(false);
    if (recovered.ok) return;
    expect(recovered.error.code).toBe('CHECKPOINT_MISMATCH');
  });
});

describe('the deliberate fall-back to the safe corner', () => {
  it('costs plan integrity and cannot loop forever', () => {
    const run = playThrough([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'slip-out-now',
      'take-the-service-way',
      'cross-to-the-service-door',
      'head-straight-to-the-door',
      'look-at-the-scratches',
      'fall-back-to-the-safe-corner',
    ]);
    expect(run.state.currentSceneId).toBe(S.corridorFirst);
    expect(run.state.variables['planIntegrity']).toBe(2);

    // Each lap through the junction costs one point of plan integrity.
    const oneLap = [
      'take-the-service-way',
      'cross-to-the-service-door',
      'head-straight-to-the-door',
      'straight-to-the-door',
      'fall-back-to-the-safe-corner',
    ];

    const secondLap = continuePlay(run.engine, run.state, oneLap);
    expect(secondLap.currentSceneId).toBe(S.corridorFirst);
    expect(secondLap.variables['planIntegrity']).toBe(1);

    // With a single point left the fall-back is still legal…
    const thirdApproach = continuePlay(run.engine, secondLap, oneLap.slice(0, 4));
    expect(thirdApproach.currentSceneId).toBe(S.lockedDoor);
    expect(availableChoiceIds(run.engine, thirdApproach)).toContain(
      'fall-back-to-the-safe-corner',
    );

    // …but once the plan is spent the loop closes: only the risky ways remain.
    const spent = continuePlay(run.engine, thirdApproach, ['fall-back-to-the-safe-corner']);
    expect(spent.variables['planIntegrity']).toBe(0);
    const backAtDoor = continuePlay(run.engine, spent, [
      'take-the-service-way',
      'cross-to-the-service-door',
      'head-straight-to-the-door',
      'straight-to-the-door',
    ]);
    expect(backAtDoor.currentSceneId).toBe(S.lockedDoor);
    expect(availableChoiceIds(run.engine, backAtDoor)).not.toContain(
      'fall-back-to-the-safe-corner',
    );
    // There is still a way forward, so the player can never be stuck.
    expect(availableChoiceIds(run.engine, backAtDoor)).toContain('force-the-door');
  });
});
