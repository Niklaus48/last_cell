/**
 * DEVELOPMENT-ONLY demonstration story — «اتاق بازجویی».
 *
 * This is a disposable architectural example proving the engine works. It is
 * NOT canonical Chapter 1 material and will be replaced in a later phase.
 *
 * Shape (4 scenes, 2 endings, one conditional choice, one flag effect):
 *
 *   demo-arrival ──(پاسخ دادن)──────────────▶ demo-interrogation
 *        │                                          │
 *        └──(سکوت)──▶ demo-silence ──▶ ending: closure
 *                                          ├──(دروغ)──▶ ending: broken-story
 *                                          └──(حقیقت)─▶ ending: small-truth
 */
import type { StoryDefinition } from '../engine';

export const DEMO_SCENE_IDS = {
  arrival: 'demo-arrival',
  silence: 'demo-silence',
  interrogation: 'demo-interrogation',
} as const;

export const DEMO_ENDING_IDS = {
  closure: 'demo-ending-closure',
  brokenStory: 'demo-ending-broken-story',
  smallTruth: 'demo-ending-small-truth',
} as const;

export const demoStory: StoryDefinition = {
  id: 'demo-interrogation-room',
  title: 'اتاق بازجویی — نمونهٔ توسعه',
  initialSceneId: DEMO_SCENE_IDS.arrival,
  initialVariables: { suspicion: 0 },
  scenes: [
    {
      id: DEMO_SCENE_IDS.arrival,
      title: 'سلول ۱۴',
      backgroundAssetId: 'cell-night',
      narration: [
        'چراغ بالای سرت سه بار پلک زد و بعد ساکت شد. سکوتی که بیشتر شبیه انتظار بود تا خاموشی.',
        'کیان فرهمند روی لبهٔ تخت نشسته است. صدای کلید در راهرو می‌آید؛ قدم‌ها کند نیستند، اما شتاب هم ندارند.',
        'دو راه داری: یا وقتی در باز شد حرف بزنی، یا بگذاری سکوتت اولین جملهٔ این بازی باشد.',
      ],
      choices: [
        {
          id: 'speak',
          label: 'وقتی در باز شد، حرف می‌زنم.',
          outcome: { type: 'transition', targetSceneId: DEMO_SCENE_IDS.interrogation },
          effects: [{ kind: 'incrementVariable', variable: 'suspicion', amount: 1 }],
        },
        {
          id: 'stay-silent',
          label: 'سکوت می‌کنم و نگاه می‌کنم.',
          outcome: { type: 'transition', targetSceneId: DEMO_SCENE_IDS.silence },
        },
      ],
    },
    {
      id: DEMO_SCENE_IDS.silence,
      title: 'سکوت، اولین پاسخ',
      backgroundAssetId: 'corridor',
      narration: [
        'مردی با پوشهٔ نازکی وارد می‌شود. چیزی نمی‌پرسد. پوشه را روی میز می‌گذارد و منتظر می‌ماند.',
        'ده دقیقه می‌گذرد. در این ساختمان، سکوت ارزان نیست؛ هر ثانیه‌اش با چیزی خریده می‌شود.',
        'وقتی بالاخره دهان باز می‌کند، می‌فهمی که انتظار کشیده تا تو اول حرف بزنی.',
      ],
      choices: [
        {
          id: 'keep-quiet',
          label: 'همچنان سکوت می‌کنم.',
          outcome: { type: 'ending', endingId: DEMO_ENDING_IDS.closure },
          effects: [{ kind: 'setVariable', variable: 'suspicion', value: 0 }],
        },
      ],
    },
    {
      id: DEMO_SCENE_IDS.interrogation,
      title: 'روی صندلی',
      backgroundAssetId: 'interrogation-room',
      narration: [
        'صندلی سرد است. مرد پوشه را باز می‌کند و بی‌آنکه نگاهت کند می‌پرسد: «شب بیست‌ویکم کجا بودی؟»',
        'جوابی که می‌دهی تا آخر بازی با تو می‌ماند.',
      ],
      choices: [
        {
          id: 'lie',
          label: 'دروغ می‌گویم: «خانه بودم.»',
          outcome: { type: 'ending', endingId: DEMO_ENDING_IDS.brokenStory },
          effects: [{ kind: 'incrementVariable', variable: 'suspicion', amount: 2 }],
        },
        {
          id: 'reveal',
          label: 'بخشی از حقیقت را می‌گویم.',
          outcome: { type: 'ending', endingId: DEMO_ENDING_IDS.smallTruth },
          effects: [{ kind: 'setVariable', variable: 'toldTruth', value: true }],
        },
        {
          id: 'demand-lawyer',
          label: 'وکیل می‌خواهم.',
          // Demonstrates a declarative, state-driven condition: this option only
          // appears once the player has already raised suspicion.
          condition: {
            kind: 'compareVariable',
            variable: 'suspicion',
            operator: 'gte',
            value: 1,
          },
          outcome: { type: 'ending', endingId: DEMO_ENDING_IDS.brokenStory },
        },
      ],
    },
  ],
  endings: [
    {
      id: DEMO_ENDING_IDS.closure,
      title: 'پایان نمونه: سکوت',
      summary: 'هیچ حقیقتی گفته نشد و هیچ درزی هم باز نشد. پرونده بسته می‌شود — برای حالا.',
      tone: 'ambiguous',
    },
    {
      id: DEMO_ENDING_IDS.brokenStory,
      title: 'پایان نمونه: روایت شکسته',
      summary: 'یک جملهٔ اضافه کافی بود تا شکاف پیدا شود. حالا آن‌ها وقت دارند.',
      tone: 'grim',
    },
    {
      id: DEMO_ENDING_IDS.smallTruth,
      title: 'پایان نمونه: حقیقت کوچک',
      summary: 'کمی از حقیقت دادی و چیزی برای خودت نگه داشتی. این معامله هنوز تمام نشده.',
      tone: 'hopeful',
    },
  ],
};
