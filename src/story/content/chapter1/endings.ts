/**
 * Chapter 1 — ending registry, checkpoints and failures.
 *
 * Endings are engine-level records (not scenes): the payoff narration lives in
 * the scene that leads here, while `summary` carries the chapter hook that sets
 * up Chapter 2. Each ending is gated in `scenes.finale.ts` by clues/choices, not
 * by how many scenes the player happened to visit.
 */
import type { CheckpointDefinition, EndingDefinition, FailureDefinition } from '../../engine';
import { CHAPTER1_CHECKPOINT, CHAPTER1_ENDING, CHAPTER1_FAILURE, CHAPTER1_SCENE } from './ids';

export const chapter1Endings: readonly EndingDefinition[] = [
  {
    id: CHAPTER1_ENDING.ambiguousTruth,
    title: 'پایان الف — حقیقتی مبهم',
    summary:
      'اگر تمام این شش ماه، نقشهٔ تو تحت نظر بوده، پس چه کسی از ابتدا می‌دانسته امروز فرار خواهی کرد؟',
    tone: 'ambiguous',
  },
  {
    id: CHAPTER1_ENDING.contradictoryDossier,
    title: 'پایان ب — پروندهٔ متناقض',
    summary: 'چه کسی گزارش مرگ او را امضا کرده بود؟',
    tone: 'grim',
  },
  {
    id: CHAPTER1_ENDING.possibleConnection,
    title: 'پایان ج — پیوندی ممکن',
    summary: 'اگر نوید اینجاست، پس آن شش ماه را کجا گذرانده‌ای؟',
    tone: 'hopeful',
  },
];

export const chapter1Checkpoints: readonly CheckpointDefinition[] = [
  {
    id: CHAPTER1_CHECKPOINT.cellExit,
    sceneId: CHAPTER1_SCENE.leavingCell,
    label: 'آستانهٔ سلول',
  },
  {
    id: CHAPTER1_CHECKPOINT.corridorFirst,
    sceneId: CHAPTER1_SCENE.corridorFirst,
    label: 'گوشهٔ امن راهرو',
  },
  {
    id: CHAPTER1_CHECKPOINT.doorApproach,
    sceneId: CHAPTER1_SCENE.corridorMid,
    label: 'چند قدم مانده به در',
  },
];

export const chapter1Failures: readonly FailureDefinition[] = [
  {
    id: CHAPTER1_FAILURE.caughtAtDoor,
    title: 'فرار شکست خورد — بازگشت به سلول ۱۴',
    summary:
      'صدای قفل لو رفت. نگهبان‌ها کیان را در دهلیز گرفتند و به سلول ۱۴ برگرداندند. این تلاش به دلیل عجله هنگام باز کردن در شکست خورد.',
    kind: 'recoverable',
    recovery: { type: 'checkpoint', checkpointId: CHAPTER1_CHECKPOINT.doorApproach },
  },
  {
    id: CHAPTER1_FAILURE.officeAlarm,
    title: 'فرار شکست خورد — دستگیری در دفتر',
    summary:
      'برداشتن برگه، جای خالی آشکاری گذاشت. نگهبان‌ها کیان را در دفتر گرفتند، بازجویی کردند و به سلول بازگرداندند.',
    kind: 'recoverable',
    recovery: { type: 'checkpoint', checkpointId: CHAPTER1_CHECKPOINT.corridorFirst },
  },
  {
    id: CHAPTER1_FAILURE.shotInCorridor,
    title: 'پایان تلخ — کشته شدن در راهرو',
    summary:
      'کیان هشدار نگهبان مسلح را نادیده گرفت و در راهروی بدون پناه دوید. شلیک پیش از رسیدن او به در، زندگی‌اش را پایان داد.',
    // `fatal`, not `recoverable`: Kian does not come back to Cell 14 in this
    // attempt. The recovery target is the rewind point — the run is restored, the
    // outcome is not undone in the fiction.
    kind: 'fatal',
    recovery: { type: 'checkpoint', checkpointId: CHAPTER1_CHECKPOINT.doorApproach },
  },
];
