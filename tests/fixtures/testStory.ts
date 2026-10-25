/**
 * Fixture story used only by unit tests.
 *
 * Deliberately independent of `src/story/content` so engine tests exercise the
 * engine in isolation: no React, no UI modules, no production story data.
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

export function makeTestStory(): StoryDefinition {
  return {
    id: 'fixture-story',
    title: 'داستان آزمون',
    initialSceneId: TEST_SCENE_IDS.start,
    initialVariables: { courage: 0 },
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
            id: 'coward-path',
            label: 'برمی‌گردم.',
            outcome: { type: 'ending', endingId: TEST_ENDING_IDS.bad },
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
        ],
      },
    ],
    endings: [
      { id: TEST_ENDING_IDS.good, title: 'پایان خوب', summary: 'زنده بیرون آمدی.', tone: 'hopeful' },
      { id: TEST_ENDING_IDS.bad, title: 'پایان تلخ', summary: 'هیچ‌کس منتظرت نماند.', tone: 'grim' },
    ],
  };
}
