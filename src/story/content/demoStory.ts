/**
 * DEVELOPMENT-ONLY demonstration story — «اتاق بازجویی».
 *
 * This is a disposable architectural example proving the engine works. It is
 * NOT canonical Chapter 1 material and will be replaced in a later phase.
 * The scenario is deliberately generic: the real escape/failure content is
 * written in a later phase.
 *
 * What it demonstrates:
 *  - branching scenes and three endings
 *  - state variables and a declarative availability condition (`suspicion >= 1`)
 *  - a clue registry + a clue-gated choice (`clueDiscovered: folded-note`)
 *  - a declared checkpoint (`cp-corridor`) offered by one scene
 *  - a recoverable failure (`f-guard-alert`) that returns to that checkpoint
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

export const DEMO_CLUE_IDS = {
  foldedNote: 'folded-note',
} as const;

export const DEMO_CHECKPOINT_IDS = {
  corridor: 'cp-corridor',
} as const;

export const DEMO_FAILURE_IDS = {
  guardAlert: 'f-guard-alert',
} as const;

export const demoStory: StoryDefinition = {
  id: 'demo-interrogation-room',
  title: 'اتاق بازجویی — نمونهٔ توسعه',
  initialSceneId: DEMO_SCENE_IDS.arrival,
  initialVariables: { suspicion: 0 },

  clues: [
    {
      id: DEMO_CLUE_IDS.foldedNote,
      label: 'یادداشت تاشده',
      detail: 'گوشهٔ پوشه تاشده است؛ یک برگ از آن جدا شده و برگشته.',
    },
  ],

  checkpoints: [
    {
      id: DEMO_CHECKPOINT_IDS.corridor,
      sceneId: DEMO_SCENE_IDS.silence,
      label: 'راهروی بند',
    },
  ],

  failures: [
    {
      id: DEMO_FAILURE_IDS.guardAlert,
      title: 'نمونهٔ شکست: نگهبان خبر می‌شود',
      summary:
        'فشار آوردن روی نگهبان جواب نداد؛ او سالن را ترک کرد و حالا صدای قدم‌های بیشتری از راهرو می‌آید.',
      kind: 'recoverable',
      recovery: { type: 'checkpoint', checkpointId: DEMO_CHECKPOINT_IDS.corridor },
    },
  ],

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
        'گوشهٔ پوشه تاشده است؛ یک برگ از آن جدا شده و برگشته.',
        'ده دقیقه می‌گذرد. در این ساختمان، سکوت ارزان نیست؛ هر ثانیه‌اش با چیزی خریده می‌شود.',
      ],
      choices: [
        {
          id: 'keep-quiet',
          label: 'همچنان سکوت می‌کنم.',
          outcome: { type: 'ending', endingId: DEMO_ENDING_IDS.closure },
          effects: [{ kind: 'setVariable', variable: 'suspicion', value: 0 }],
        },
        {
          id: 'read-file',
          label: 'به تای پوشه نگاه می‌کنم.',
          outcome: { type: 'transition', targetSceneId: DEMO_SCENE_IDS.interrogation },
          effects: [{ kind: 'discoverClue', clueId: DEMO_CLUE_IDS.foldedNote }],
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
          id: 'ask-note',
          label: 'دربارهٔ برگهٔ جدا‌شده می‌پرسم.',
          // Demonstrates a clue-gated choice: only offered once the folded note
          // has actually been discovered.
          condition: { kind: 'clueDiscovered', clueId: DEMO_CLUE_IDS.foldedNote },
          outcome: { type: 'ending', endingId: DEMO_ENDING_IDS.smallTruth },
        },
        {
          id: 'demand-lawyer',
          label: 'وکیل می‌خواهم.',
          // Demonstrates a declarative, state-driven condition.
          condition: {
            kind: 'compareVariable',
            variable: 'suspicion',
            operator: 'gte',
            value: 1,
          },
          outcome: { type: 'ending', endingId: DEMO_ENDING_IDS.brokenStory },
        },
        {
          id: 'press-guard',
          label: 'روی نگهبان فشار می‌آورم.',
          // Demonstrates a recoverable failure: the engine reports it as a
          // typed outcome, and recovery returns to the declared checkpoint.
          outcome: { type: 'failure', failureId: DEMO_FAILURE_IDS.guardAlert },
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
