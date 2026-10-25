/**
 * Fixture story used only by unit tests.
 *
 * Deliberately independent of `src/story/content` so engine tests exercise the
 * engine in isolation: no React, no UI modules, no production story data.
 * It exercises clues, checkpoints, recoverable + terminal failures and a choice
 * whose effects become invalid at runtime.
 */
import type { StoryDefinition } from '../../src/story/engine';

export const TEST_SCENE_IDS = {
  start: 's-start',
  fork: 's-fork',
  hidden: 's-hidden',
} as const;

export const TEST_ENDING_IDS = {
  good: 'e-good',
  bad: 'e-bad',
} as const;

export const TEST_CLUE_IDS = {
  note: 'c-note',
} as const;

export const TEST_CHECKPOINT_IDS = {
  start: 'cp-start',
  fork: 'cp-fork',
} as const;

export const TEST_FAILURE_IDS = {
  recoverable: 'f-trap',
  terminal: 'f-terminal',
} as const;

export function makeTestStory(): StoryDefinition {
  return {
    id: 'fixture-story',
    title: 'داستان آزمون',
    initialSceneId: TEST_SCENE_IDS.start,
    initialVariables: { courage: 0 },

    clues: [
      {
        id: TEST_CLUE_IDS.note,
        label: 'یادداشت آزمون',
        detail: 'متنی که فقط پس از کشف قابل خواندن است.',
      },
    ],

    checkpoints: [
      { id: TEST_CHECKPOINT_IDS.start, sceneId: TEST_SCENE_IDS.start, label: 'آغاز' },
      { id: TEST_CHECKPOINT_IDS.fork, sceneId: TEST_SCENE_IDS.fork, label: 'دو راهی' },
    ],

    failures: [
      {
        id: TEST_FAILURE_IDS.recoverable,
        title: 'شکست آزمون',
        summary: 'چیزی بد پیش رفت، اما بازگشت ممکن است.',
        kind: 'recoverable',
        recovery: { type: 'checkpoint', checkpointId: TEST_CHECKPOINT_IDS.fork },
      },
      {
        id: TEST_FAILURE_IDS.terminal,
        title: 'شکست پایانی آزمون',
        summary: 'اینجا پرونده بسته می‌شود.',
        kind: 'terminal',
      },
    ],

    scenes: [
      {
        id: TEST_SCENE_IDS.start,
        title: 'آغاز',
        narration: ['نخستین صحنهٔ آزمون.'],
        choices: [
          {
            id: 'go-fork',
            label: 'به سمت دو راهی می‌روم.',
            outcome: { type: 'transition', targetSceneId: TEST_SCENE_IDS.fork },
            effects: [{ kind: 'incrementVariable', variable: 'courage', amount: 2 }],
          },
          {
            id: 'stop',
            label: 'می‌ایستم.',
            outcome: { type: 'ending', endingId: TEST_ENDING_IDS.bad },
          },
          {
            // Effects run in order: the second one is impossible, so the whole
            // transition must fail atomically.
            id: 'corrupt-and-bump',
            label: 'شجاعت را به متن تبدیل می‌کنم.',
            outcome: { type: 'transition', targetSceneId: TEST_SCENE_IDS.fork },
            effects: [
              { kind: 'setVariable', variable: 'courage', value: 'high' },
              { kind: 'incrementVariable', variable: 'courage', amount: 1 },
            ],
          },
          {
            id: 'find-note',
            label: 'یادداشت را پیدا می‌کنم.',
            outcome: { type: 'transition', targetSceneId: TEST_SCENE_IDS.fork },
            effects: [{ kind: 'discoverClue', clueId: TEST_CLUE_IDS.note }],
          },
        ],
      },
      {
        id: TEST_SCENE_IDS.fork,
        title: 'دو راهی',
        narration: ['دو راهی، و باد سرد.'],
        choices: [
          {
            id: 'brave-path',
            label: 'راه سخت را انتخاب می‌کنم.',
            outcome: { type: 'ending', endingId: TEST_ENDING_IDS.good },
            condition: {
              kind: 'compareVariable',
              variable: 'courage',
              operator: 'gte',
              value: 2,
            },
          },
          {
            id: 'secret-path',
            label: 'راه پنهان را می‌روم.',
            outcome: { type: 'transition', targetSceneId: TEST_SCENE_IDS.hidden },
            condition: { kind: 'visitedScene', sceneId: TEST_SCENE_IDS.hidden },
          },
          {
            id: 'note-path',
            label: 'راه یادداشت را دنبال می‌کنم.',
            outcome: { type: 'transition', targetSceneId: TEST_SCENE_IDS.hidden },
            condition: { kind: 'clueDiscovered', clueId: TEST_CLUE_IDS.note },
          },
          {
            id: 'coward-path',
            label: 'برمی‌گردم.',
            outcome: { type: 'ending', endingId: TEST_ENDING_IDS.bad },
          },
          {
            id: 'trigger-trap',
            label: 'تلهٔ آزمون را فعال می‌کنم.',
            outcome: { type: 'failure', failureId: TEST_FAILURE_IDS.recoverable },
            effects: [{ kind: 'incrementVariable', variable: 'courage', amount: 5 }],
          },
        ],
      },
      {
        id: TEST_SCENE_IDS.hidden,
        title: 'راه پنهان',
        narration: ['راهی که روی نقشه نبود.'],
        choices: [
          {
            id: 'leave',
            label: 'بیرون می‌آیم.',
            outcome: { type: 'ending', endingId: TEST_ENDING_IDS.good },
          },
          {
            // Repeated visits: returning to the fork exercises history handling
            // when a scene is entered more than once.
            id: 'back-to-fork',
            label: 'به دو راهی برمی‌گردم.',
            outcome: { type: 'transition', targetSceneId: TEST_SCENE_IDS.fork },
          },
          {
            id: 'final-trap',
            label: 'در را می‌بندم.',
            outcome: { type: 'failure', failureId: TEST_FAILURE_IDS.terminal },
          },
        ],
      },
    ],

  endings: [
    {
      id: TEST_ENDING_IDS.good,
      title: 'پایان خوب',
      summary: 'زنده بیرون آمدی.',
      tone: 'hopeful',
    },
    {
      id: TEST_ENDING_IDS.bad,
      title: 'پایان تلخ',
      summary: 'هیچ‌کس منتظرت نماند.',
      tone: 'grim',
    },
  ],
  };
}
