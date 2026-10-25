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
    title: 'شکست قابل جبران — صدای فلز',
    summary:
      'دستت حرکت کرد و فلز صدا داد. نگهبان ایستاد، چراغ را چرخاند و به سمت تو آمد. قدم‌ها به آستانهٔ راهروی خدمه رسیدند و بعد تاریکی دوباره سنگین شد.',
    kind: 'recoverable',
    recovery: { type: 'checkpoint', checkpointId: CHAPTER1_CHECKPOINT.doorApproach },
  },
  {
    id: CHAPTER1_FAILURE.officeAlarm,
    title: 'شکست قابل جبران — دفتر بازرسی‌شده',
    summary:
      'برگه را تا زدی و در جیبت گذاشتی، و دقایقی بعد صدای دو نگهبان آمد که می‌گویند پروندهٔ دیشب را باید دوباره بشمارند. دفتر ورق می‌خورد؛ بودن تو در آن اتاق دیگر پنهان نمی‌ماند.',
    kind: 'recoverable',
    recovery: { type: 'checkpoint', checkpointId: CHAPTER1_CHECKPOINT.corridorFirst },
  },
];
