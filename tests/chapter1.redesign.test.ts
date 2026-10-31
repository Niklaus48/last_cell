/**
 * Chapter 1, branching redesign — the behaviour the redesign promised.
 *
 * These tests are about *consequences*, not shape: that suspicion really changes
 * which scene follows, that composure buys a safer response, that route knowledge
 * opens a path the map never had, that the stranger's line/trust/knowledge are
 * three different things, that no loop farms the plan, and that a player can
 * never be left without a move.
 *
 * Engine-only (Vitest `node`): no React, no DOM.
 */
import { describe, expect, it } from 'vitest';
import { createStoryEngine } from '../src/story/engine';
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

interface Run {
  readonly engine: StoryEngine;
  readonly state: StoryState;
  readonly visited: readonly string[];
}

function play(choiceIds: readonly string[]): Run {
  const engine = createStoryEngine(chapter1Story);
  let state = engine.start();
  const visited: string[] = [state.currentSceneId];
  for (const choiceId of choiceIds) {
    const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId });
    if (!result.ok) {
      throw new Error(`step "${choiceId}" rejected in "${state.currentSceneId}": ${result.error.code}`);
    }
    state = result.state;
    visited.push(state.currentSceneId);
  }
  return { engine, state, visited };
}

/** Continues a run inside an existing engine (needed when a checkpoint is used). */
function playThrough(
  prefix: readonly string[],
  engine: StoryEngine,
  suffix: readonly string[],
): StoryState {
  let state = engine.start();
  for (const choiceId of [...prefix, ...suffix]) {
    const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId });
    if (!result.ok) {
      throw new Error(`step "${choiceId}" rejected in "${state.currentSceneId}": ${result.error.code}`);
    }
    state = result.state;
  }
  return state;
}

function numeric(state: StoryState, name: string): number {
  return Number(state.variables[name] ?? 0);
}

function choicesAt(engine: StoryEngine, state: StoryState): string[] {
  return engine.getAvailableChoices(state).map((choice) => choice.id);
}

/** The quiet opening: listen, stay silent, then walk the service corridor. */
const QUIET_START = [
  'listen-to-the-corridor',
  'go-back-to-the-bed',
  'stay-silent',
  'wait-for-the-steps-to-fade',
  'slip-out-now',
];

/** Quiet start plus the service corridor all the way to the steel door. */
const TO_DOOR = [
  ...QUIET_START,
  'take-the-service-way',
  'cross-to-the-service-door',
  'head-straight-to-the-door',
  'straight-to-the-door',
];

/** Quiet start plus the office: note, ledger, correlated dates, initials. */
const OFFICE_EVIDENCE = [
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
];

describe('the redesigned chapter, as content', () => {
  it('keeps the eight original variables and their starting values', () => {
    expect(chapter1Story.initialVariables).toEqual({
      composure: 2,
      guardSuspicion: 0,
      planIntegrity: 3,
      strangerContact: 0,
      strangerTrust: 0,
      strangerKnowledge: 0,
      routeKnowledge: 0,
      criticalMistakes: 0,
    });
    for (const [name, value] of Object.entries(chapter1Story.initialVariables ?? {})) {
      expect(typeof value, name).toBe('number');
      expect(chapter1Story.variableMeta?.[name]?.label.length, name).toBeGreaterThan(0);
    }
  });

  it('adds the five new scenes without losing a single original scene', () => {
    const ids = chapter1Story.scenes.map((scene) => scene.id);
    expect(ids).toHaveLength(37);

    for (const newScene of [
      S.cellRehearsal,
      S.officeOverheard,
      S.forcedDoorNoise,
      S.guardSearch,
      S.scheduleFile,
    ]) {
      expect(ids).toContain(newScene);
    }
  });

  it('is additive for saved runs: every scene and choice id that existed before still exists', () => {
    const scenes = new Map(chapter1Story.scenes.map((scene) => [scene.id, scene]));
    const missingScenes = baselineIds.sceneIds.filter((id) => !scenes.has(id));
    expect(missingScenes).toEqual([]);

    const missingChoices: string[] = [];
    for (const [sceneId, choiceIds] of Object.entries(baselineIds.choiceIdsByScene)) {
      const scene = scenes.get(sceneId);
      const present = new Set(scene?.choices.map((choice) => choice.id) ?? []);
      for (const choiceId of choiceIds) {
        if (!present.has(choiceId)) missingChoices.push(`${sceneId}/${choiceId}`);
      }
    }
    // A save is a scene id plus the history of choice ids: keeping every id means
    // an old save still describes a real position in the new chapter.
    expect(missingChoices).toEqual([]);
  });

  it('keeps every timed default usable: unconditional and never a failure', () => {
    const timed = chapter1Story.scenes.filter((scene) => scene.timedDecision !== undefined);
    expect(timed.map((scene) => scene.id).sort()).toEqual([S.doorAttempt, S.strangerArrives].sort());

    for (const scene of timed) {
      const fallback = scene.choices.find(
        (choice) => choice.id === scene.timedDecision?.defaultChoiceId,
      );
      expect(fallback, scene.id).toBeDefined();
      // No condition: the clock cannot expire while the default is unavailable.
      expect(fallback?.condition, scene.id).toBeUndefined();
      expect(fallback?.outcome.type, scene.id).toBe('transition');
    }
  });
});

describe('guardSuspicion decides what the corridor does', () => {
  it('lets a quiet, composed player watch the torch pass — and a watched player be searched', () => {
    const quiet = play([...TO_DOOR, 'pick-the-bolt', 'freeze-quiet']);
    expect(quiet.state.currentSceneId).toBe(S.guardPass);
    expect(numeric(quiet.state, 'guardSuspicion')).toBeLessThanOrEqual(1);

    // Two noisy decisions (threat + pushing the door open) put Kian in the search.
    const noisy = play([
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
      'freeze-under-watch',
    ]);
    expect(numeric(noisy.state, 'guardSuspicion')).toBeGreaterThanOrEqual(2);
    expect(noisy.visited).toContain(S.guardSearch);
  });

  it('routes the cautious default into the search, and the search always has a way on', () => {
    // The 8s default is `freeze-and-observe`, which lands in the search scene…
    const run = play([...TO_DOOR, 'pick-the-bolt', 'freeze-and-observe']);
    expect(run.state.currentSceneId).toBe(S.guardSearch);

    // …where the way out is either local knowledge, a composed wait, or the
    // recoverable failure — never nothing.
    const options = choicesAt(run.engine, run.state);
    expect(options.length).toBeGreaterThan(0);
    expect(options).toContain('search-caught');
  });

  it('makes high suspicion itself a scene: the archive becomes alarmed', () => {
    const run = play([...TO_DOOR, 'force-the-door', 'forced-press', 'freeze-and-observe', 'search-caught']);
    expect(run.state.progress).toEqual({
      status: 'failed',
      failureId: CHAPTER1_FAILURE.caughtAtDoor,
    });

    // The same suspicion level opens a *different* exit at the archive.
    const loud = play([
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
      'freeze-and-observe',
      'search-use-route',
      'crawl-through-the-vent',
    ]);
    expect(loud.visited).toContain(S.recordsAlcove);
    expect(numeric(loud.state, 'guardSuspicion')).toBeGreaterThanOrEqual(4);
    // At that level of noise the archive itself has to be crossed quietly.
    expect(choicesAt(loud.engine, loud.state)).toContain('avoid-alarmed-archive');
  });
});

describe('composure buys a safer response, not immunity', () => {
  it('lets a composed player wait out the guards behind the office door', () => {
    const composed = play([
      'listen-to-the-corridor',
      'memorize-the-rhythm',
      'ask-who-he-is',
      'say-nothing-more',
      'slip-out-now',
      'take-the-office-way',
      'listen-at-the-door',
    ]);
    expect(composed.state.currentSceneId).toBe(S.officeOverheard);
    expect(numeric(composed.state, 'composure')).toBeGreaterThanOrEqual(3);
    expect(choicesAt(composed.engine, composed.state)).toContain('wait-for-office-clear');

    // Same scene, less composure: the wait is gone, only the risky entry is left.
    const rattled: StoryState = {
      ...composed.state,
      variables: { ...composed.state.variables, composure: 1 },
    };
    expect(choicesAt(composed.engine, rattled)).not.toContain('wait-for-office-clear');
    expect(choicesAt(composed.engine, rattled)).toContain('risk-office-entry');
  });

  it('still charges the reckless player for a loud mistake', () => {
    const reckless = play([
      'test-the-bar',
      'ease-the-bolt',
      'threaten-him',
      'lower-your-voice',
    ]);
    // Threatening cost composure and added a critical mistake, whatever came next.
    expect(numeric(reckless.state, 'composure')).toBeLessThan(3);
    expect(numeric(reckless.state, 'criticalMistakes')).toBe(1);
  });
});

describe('routeKnowledge opens a path the plan never had', () => {
  it('tracks where the knowledge came from, and unlocks the vent', () => {
    const informed = play([
      'listen-to-the-corridor',
      'memorize-the-rhythm',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'search-the-cell-first',
      'pull-the-note',
      'fold-it-into-your-sleeve',
      ...TO_DOOR.slice(5),
    ]);
    expect(numeric(informed.state, 'routeKnowledge')).toBeGreaterThanOrEqual(2);
    expect(informed.state.currentSceneId).toBe(S.lockedDoor);
    expect(choicesAt(informed.engine, informed.state)).toContain('look-for-another-way');

    const vent = play([
      'listen-to-the-corridor',
      'memorize-the-rhythm',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'search-the-cell-first',
      'pull-the-note',
      'fold-it-into-your-sleeve',
      ...TO_DOOR.slice(5),
      'look-for-another-way',
    ]);
    expect(vent.state.currentSceneId).toBe(S.alternativeRoute);
  });

  it('keeps the vent shut for a player who never looked around', () => {
    const blind = play([...TO_DOOR]);
    expect(numeric(blind.state, 'routeKnowledge')).toBe(0);
    expect(choicesAt(blind.engine, blind.state)).not.toContain('look-for-another-way');
    // …and the door can still be worked, so nothing is a dead end.
    expect(choicesAt(blind.engine, blind.state)).toContain('pick-the-bolt');
  });
});

describe('the stranger: a line, a trust, and a count of claims', () => {
  it('gives silence no line at all and asking a channel', () => {
    const silent = play(QUIET_START);
    expect(silent.state.variables['strangerContact']).toBe(0);

    const asked = play(['test-the-bar', 'leave-it', 'ask-who-he-is']);
    expect(asked.state.variables['strangerContact']).toBe(1);
    expect(asked.state.variables['strangerKnowledge']).toBe(1);
    expect(asked.state.variables['strangerTrust']).toBe(0);
  });

  it('counts a demand as knowledge without counting it as trust', () => {
    const TO_PHONE = [
      'test-the-bar',
      'leave-it',
      'ask-who-he-is',
      'say-nothing-more',
      ...TO_DOOR.slice(4),
      'pick-the-bolt',
      'freeze-quiet',
      'take-the-hatch',
      'answer-the-internal-phone',
    ];
    const trusted = play([...TO_PHONE, 'let-him-explain']);
    const demanded = play([...TO_PHONE, 'demand-something-checkable']);

    expect(trusted.state.variables['strangerTrust']).toBe(1);
    expect(numeric(demanded.state, 'strangerTrust')).toBe(-1);
    // Both learned from him — knowledge counts claims, whoever made them…
    expect(numeric(trusted.state, 'strangerKnowledge')).toBeGreaterThanOrEqual(2);
    expect(numeric(demanded.state, 'strangerKnowledge')).toBeGreaterThanOrEqual(2);
    // …while trust records only how far Kian leaned toward him.
    expect(trusted.engine.hasClue(trusted.state, CHAPTER1_CLUE.telephoneDateClaim)).toBe(false);
    expect(demanded.engine.hasClue(demanded.state, CHAPTER1_CLUE.telephoneDateClaim)).toBe(true);
  });

  it('never puts the stranger in the yard: the final talk is over the internal line', () => {
    const finalApproach = play([
      'test-the-bar',
      'leave-it',
      'ask-who-he-is',
      'say-nothing-more',
      ...TO_DOOR.slice(4),
      'pick-the-bolt',
      'freeze-quiet',
      'take-the-hatch',
      'answer-the-internal-phone',
      'let-him-explain',
      'ask-what-he-wants',
    ]);
    expect(finalApproach.state.currentSceneId).toBe(S.finalApproach);
    const sceneText = chapter1Story.scenes
      .find((scene) => scene.id === S.finalApproach)
      ?.narration.join(' ');
    expect(sceneText).toContain('گوشی داخلی');

    const connection = chapter1Story.scenes.find((scene) => scene.id === S.endingConnection);
    const connectionText = connection?.narration.join(' ') ?? '';
    expect(connectionText).toContain('گوشی');
    // No claim of a body in the room.
    expect(connectionText).not.toMatch(/کنارش ایستاده|روبه‌روی او/);
  });
});

describe('planIntegrity is a budget, not a counter', () => {
  it('forces the fall-back to spend one point of the plan, and never gives one back in a loop', () => {
    const run = play([...TO_DOOR, 'fall-back-to-the-safe-corner']);
    expect(run.state.currentSceneId).toBe(S.corridorFirst);
    expect(numeric(run.state, 'planIntegrity')).toBe(2);

    const approach = [
      'take-the-service-way',
      'cross-to-the-service-door',
      'head-straight-to-the-door',
      'straight-to-the-door',
    ];
    const step = (state: StoryState, choiceId: string): StoryState => {
      const result = run.engine.choose(state, { sceneId: state.currentSceneId, choiceId });
      expect(result.ok, choiceId).toBe(true);
      if (!result.ok) throw new Error(choiceId);
      return result.state;
    };

    let state = run.state;
    let laps = 1;
    let atDoor = approach.reduce(step, state);
    while (choicesAt(run.engine, atDoor).includes('fall-back-to-the-safe-corner') && laps < 10) {
      state = step(atDoor, 'fall-back-to-the-safe-corner');
      laps += 1;
      atDoor = approach.reduce(step, state);
    }

    // The loop is bounded by the plan itself, and every lap cost exactly one point.
    expect(laps).toBeLessThanOrEqual(4);
    expect(numeric(state, 'planIntegrity')).toBeLessThanOrEqual(0);
    // Whatever is left, the door can still be worked or forced.
    expect(choicesAt(run.engine, atDoor)).toContain('force-the-door');
    // Nothing in the lap ever *adds* plan: a loop can only spend it.
    expect(numeric(atDoor, 'planIntegrity')).toBeLessThan(3);
  });
});

describe('clues keep their own numbers and their own meanings', () => {
  const sceneText = (id: string): string =>
    chapter1Story.scenes.find((scene) => scene.id === id)?.narration.join(' ') ?? '';

  it('keeps ۴۱۷-ب (the transfer file) apart from ۹۲۰-۴ (the cafeteria schedule)', () => {
    const note = sceneText(S.note);
    expect(note).toContain('۴۱۷-ب');
    expect(note).not.toContain('۹۲۰-۴');

    const cafeteria = sceneText(S.cafeteria);
    expect(cafeteria).toContain('۹۲۰-۴');
    expect(cafeteria).not.toContain('۴۱۷-ب');

    // The schedule number leads to the movement sheets, not to the death file.
    expect(sceneText(S.scheduleFile)).toContain('۹۲۰-۴');
    expect(sceneText(S.scheduleFile)).toContain('پروندهٔ مرگ');
  });

  it('tells one timeline: signed 12 Mehr, transferred 14 Mehr', () => {
    const contradiction = sceneText(S.contradictionOffice);
    expect(contradiction).toContain('دوازدهم مهر');
    expect(contradiction).toContain('چهاردهم مهر');
    expect(chapter1Story.clues?.find((clue) => clue.id === CHAPTER1_CLUE.deathRecordContradiction)?.detail)
      .toContain('۱۲ مهر');
  });

  it('records the phone call as a claim, not as proof', () => {
    const claim = chapter1Story.clues?.find((clue) => clue.id === CHAPTER1_CLUE.telephoneDateClaim);
    expect(claim?.detail).toContain('ادعا');
    const record = chapter1Story.clues?.find((clue) => clue.id === CHAPTER1_CLUE.deathRecordContradiction);
    // A record with two dates never becomes "he is alive".
    expect(record?.detail).not.toMatch(/زنده است/);
  });

  it('needs both halves of the evidence trail to prove the contradiction by paper', () => {
    const noteOnly = play(['test-the-bar', 'leave-it', 'ask-who-he-is', 'say-nothing-more',
      'search-the-cell-first', 'pull-the-note', 'fold-it-into-your-sleeve',
      'take-the-office-way', 'slip-past-the-door', 'read-the-transfer-ledger']);
    expect(noteOnly.state.currentSceneId).toBe(S.officeLedger);
    expect(choicesAt(noteOnly.engine, noteOnly.state)).toContain('compare-with-a-number-you-know');

    const ledgerOnly = play([...QUIET_START, 'take-the-office-way', 'slip-past-the-door',
      'read-the-transfer-ledger']);
    expect(choicesAt(ledgerOnly.engine, ledgerOnly.state)).not.toContain(
      'compare-with-a-number-you-know',
    );
  });
});

describe('consequences reach the endings', () => {
  it('reaches all three endings from valid playthroughs', () => {
    const plain = play([...TO_DOOR, 'pick-the-bolt', 'freeze-and-observe', 'search-steady',
      'take-the-hatch', 'keep-moving', 'go-with-the-plan', 'step-into-the-yard']);
    expect(plain.state.progress).toEqual({
      status: 'ended',
      endingId: CHAPTER1_ENDING.ambiguousTruth,
    });

    const dossier = play([...OFFICE_EVIDENCE, 'pick-the-bolt', 'freeze-quiet', 'take-the-hatch',
      'keep-moving', 'ask-for-evidence-first', 'put-the-two-dates-together']);
    expect(dossier.state.progress).toEqual({
      status: 'ended',
      endingId: CHAPTER1_ENDING.contradictoryDossier,
    });

    const connection = play([
      'listen-to-the-corridor',
      'memorize-the-rhythm',
      'ask-who-he-is',
      'press-for-a-name',
      ...OFFICE_EVIDENCE.slice(4),
      'pick-the-bolt',
      'freeze-quiet',
      'take-the-hatch',
      'answer-the-internal-phone',
      'let-him-explain',
      'ask-what-he-wants',
      'ask-him-about-navid',
      'show-him-the-record',
    ]);
    expect(connection.state.progress).toEqual({
      status: 'ended',
      endingId: CHAPTER1_ENDING.possibleConnection,
    });
  });

  it('lets a loud run still finish: critical mistakes cost the good ending, not the exit', () => {
    const noisy = play([...TO_DOOR, 'force-the-door', 'forced-press', 'freeze-and-observe']);
    expect(noisy.state.currentSceneId).toBe(S.guardSearch);
    expect(numeric(noisy.state, 'criticalMistakes')).toBeGreaterThanOrEqual(1);
  });

  it('recovers from the guard-search failure to the pre-door checkpoint', () => {
    const run = play([...TO_DOOR.slice(0, TO_DOOR.length - 1)]);
    expect(run.state.currentSceneId).toBe(S.corridorMid);
    const checkpoint = run.engine.createCheckpoint(run.state);
    expect(checkpoint.ok).toBe(true);
    if (!checkpoint.ok) return;
    expect(checkpoint.checkpoint.checkpointId).toBe(CHAPTER1_CHECKPOINT.doorApproach);

    const failed = playThrough(TO_DOOR, run.engine, ['pick-the-bolt', 'freeze-and-observe', 'search-caught']);
    expect(failed.progress).toEqual({
      status: 'failed',
      failureId: CHAPTER1_FAILURE.caughtAtDoor,
    });

    const recovered = run.engine.recover(failed, checkpoint.checkpoint);
    expect(recovered.ok).toBe(true);
    if (!recovered.ok) return;
    expect(recovered.state.currentSceneId).toBe(S.corridorMid);
    expect(recovered.state.progress).toEqual({ status: 'playing' });
  });
});

describe('narration stays narrator-only', () => {
  const narration = chapter1Story.scenes.flatMap((scene) =>
    scene.narration.map((paragraph) => ({ sceneId: scene.id, paragraph })),
  );

  it('quotes nobody: no speech marks standing in for dialogue', () => {
    for (const { sceneId, paragraph } of narration) {
      // Guillemets are used for scene titles and clue names, never for speech.
      expect(paragraph.replace(/«[^»]{0,40}»/g, ''), sceneId).not.toMatch(/[«»]/);
    }
  });

  it('labels every choice as the player\'s own action, like the rest of the chapter', () => {
    const secondPerson = /(^|\s)(می‌کنی|می‌روی|می‌زنی|می‌دهی|می‌گیری|می‌پرسی|می‌شوی|می‌مانی|می‌شوم‌|کنی|روی)(\s|\.|$)/;
    for (const scene of chapter1Story.scenes) {
      for (const choice of scene.choices) {
        expect(secondPerson.test(choice.label), `${scene.id}/${choice.id}`).toBe(false);
      }
    }
  });

  it('speaks about Kian, in the third person', () => {
    for (const { sceneId, paragraph } of narration) {
      expect(paragraph, sceneId).not.toMatch(/(^|\s)تو(\s|$)/);
      expect(paragraph, sceneId).not.toMatch(/(^|\s)(می‌کنی|می‌روی|داری)(\s|$)/);
    }
  });
});
