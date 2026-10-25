/**
 * Chapter 1 — Act VI (the old telephone) and Act VII (final obstacle, endings).
 *
 * Ending eligibility lives entirely in `condition` data on the choices below:
 * Ending B needs the death-record contradiction, Ending C needs that evidence
 * *plus* a reason to press the stranger *plus* a relationship that can survive
 * the question. Ending A is always available and stays reachable for players
 * who discovered almost nothing.
 */
import type { SceneDefinition } from '../../engine';
import { CHAPTER1_CLUE, CHAPTER1_ENDING, CHAPTER1_SCENE as S } from './ids';

export const finaleScenes: readonly SceneDefinition[] = [
  // --------------------------------------------------------------- Act VI ---
  {
    id: S.recordsAlcove,
    title: 'اتاق بایگانی قدیم',
    backgroundAssetId: 'alcove',
    narration: [
      'پشت دریچه، اتاقی است که سال‌ها کسی مرتبش نکرده: قفسه‌های فلزی تا سقف، پرونده‌هایی که برچسب‌هایشان از بند افتاده، و بوی کاغذ نم‌خورده. اینجا آرشیو زندهٔ ساختمان نیست؛ جایی است که چیزها می‌آیند تا فراموش شوند.',
      'روی دیوار، تلفن داخلی قدیمی با سیم پیچ‌خورده آویزان است. گوشی را برمی‌داری: بوق آزاد است. خط وصل است، هرچند هیچ‌کس در این طبقه نیست که به آن زنگ بزند.',
      'قفسه‌ها شماره‌گذاری شده‌اند. اگر شماره‌ای در دست داشته باشی، می‌دانی کدام قفسه را بگردی؛ اگر نداشته باشی، این اتاق فقط هزار کاغذ بی‌ربط است.',
    ],
    choices: [
      {
        id: 'search-the-old-folders',
        label: 'قفسه را بر اساس شمارهٔ ارجاع می‌گردم.',
        condition: {
          kind: 'all',
          conditions: [
            {
              kind: 'any',
              conditions: [
                { kind: 'clueDiscovered', clueId: CHAPTER1_CLUE.datedNote },
                { kind: 'clueDiscovered', clueId: CHAPTER1_CLUE.scheduleReference },
              ],
            },
            {
              kind: 'not',
              condition: {
                kind: 'clueDiscovered',
                clueId: CHAPTER1_CLUE.deathRecordContradiction,
              },
            },
          ],
        },
        outcome: { type: 'transition', targetSceneId: S.recordPull },
        effects: [{ kind: 'discoverClue', clueId: CHAPTER1_CLUE.deathRecordContradiction }],
      },
      {
        id: 'answer-the-internal-phone',
        label: 'گوشی را برمی‌دارم؛ کسی از داخلی زنگ می‌زند.',
        condition: {
          kind: 'compareVariable',
          variable: 'strangerContact',
          operator: 'gte',
          value: 1,
        },
        outcome: { type: 'transition', targetSceneId: S.phone },
      },
      {
        id: 'keep-moving',
        label: 'به قفسه‌ها دست نمی‌زنم و جلو می‌روم.',
        outcome: { type: 'transition', targetSceneId: S.finalApproach },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },
  {
    id: S.recordPull,
    title: 'پرونده‌ای که نباید اینجا باشد',
    backgroundAssetId: 'alcove',
    narration: [
      'قفسهٔ شمارهٔ چهار، ردیف سوم. پرونده نازک است و جای انگشت روی جلدش مانده. داخلش گزارش مرگ است: دوازدهم مهر، امضا در پایین صفحه، و یک شمارهٔ ارجاع که سطر انتقالش، چهاردهم مهر ثبت شده است.',
      'دو تاریخ که نمی‌توانند هر دو درست باشند. یکی از آن‌ها دروغ است و کسی آن را نوشته — اما این کاغذ نمی‌گوید چه کسی، و نمی‌گوید چرا. تنها چیزی که ثابت می‌کند این است که ثبتِ رسمی این ساختمان، دست‌کم یک بار، با خودش نخوانده است.',
      'در پایین گزارش، جای امضا با جوهر پاک‌شده ناخوانا شده و زیرش فقط یک حرف مانده است. هرچه هست، کسی نمی‌خواسته خوانده شود.',
    ],
    choices: [
      {
        id: 'note-the-archive-number',
        label: 'شمارهٔ بایگانی را به خاطر می‌سپرم.',
        outcome: { type: 'transition', targetSceneId: S.finalApproach },
        effects: [{ kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 }],
      },
      {
        id: 'close-the-file',
        label: 'پرونده را سر جایش می‌گذارم.',
        outcome: { type: 'transition', targetSceneId: S.finalApproach },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },
  {
    id: S.phone,
    title: 'زنگِ داخلی',
    backgroundAssetId: 'alcove',
    narration: [
      'صدای مرد همان صدای پشت در سلول است، فقط این بار از سیم می‌آید. می‌گوید از داخلی دفتر نگهبانی زنگ می‌زند، جایی که کسی شمارهٔ داخلی را بررسی نمی‌کند و هر کسی می‌تواند چند دقیقه پشت میز خالی بنشیند. این توضیح، تماس را ممکن می‌کند؛ آن را بی‌خطر نمی‌کند.',
      'بعد می‌گوید در سوابق انتقال، تاریخ‌ها با هم نمی‌خوانند و اگر تو هم به همان چیزی رسیده باشی، می‌داند که وقتش رسیده. این یک ادعاست؛ پشتش سندی نیست، فقط اطمینانی در لحن.',
      'می‌توانی بگذاری حرفش را کامل بزند، یا چیزی بخواهی که بتوانی خودت بررسی کنی، یا گوشی را بگذاری و با آنچه خودت دیده‌ای ادامه بدهی.',
    ],
    choices: [
      {
        id: 'let-him-explain',
        label: 'می‌گذارم کامل توضیح بدهد.',
        outcome: { type: 'transition', targetSceneId: S.phoneTalk },
        effects: [
          { kind: 'incrementVariable', variable: 'strangerKnowledge', amount: 1 },
          { kind: 'incrementVariable', variable: 'strangerTrust', amount: 1 },
        ],
      },
      {
        id: 'demand-something-checkable',
        label: 'چیزی می‌خواهم که خودم بتوانم بررسی کنم.',
        outcome: { type: 'transition', targetSceneId: S.phoneTalk },
        effects: [
          { kind: 'incrementVariable', variable: 'strangerKnowledge', amount: 1 },
          { kind: 'incrementVariable', variable: 'strangerTrust', amount: -1 },
          { kind: 'discoverClue', clueId: CHAPTER1_CLUE.telephoneDateClaim },
        ],
      },
      {
        id: 'hang-up',
        label: 'گوشی را می‌گذارم.',
        outcome: { type: 'transition', targetSceneId: S.finalApproach },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },
  {
    id: S.phoneTalk,
    title: 'چیزی که می‌شود بررسی کرد',
    backgroundAssetId: 'alcove',
    narration: [
      'مرد چیزی نمی‌پرسد و چیزی هم انکار نمی‌کند. می‌گوید گزارش مرگ در پروندهٔ قدیمی، امضایی دارد که با تاریخ انتقال جور نیست و اگر تو دنبال شمارهٔ ارجاع را گرفته باشی، خودت می‌توانی ببینی. اسم هیچ‌کس را نمی‌آورد — نه اسم خودش، نه اسم نوید.',
      'لحنش شبیه کسی است که مدت‌ها منتظر این تماس بوده؛ و همین هم هست که آزارت می‌دهد. کسی که شش ماه منتظر مانده، یا خیلی می‌داند، یا خیلی به چیزی نیاز دارد.',
      'خط قطع می‌شود، بی‌خداحافظی. بوق آزاد می‌ماند و تو با شماره‌ای در دست و مردی در ذهن می‌مانی.',
    ],
    choices: [
      {
        id: 'ask-what-he-wants',
        label: 'قبل از قطع‌شدن می‌پرسم از تو چه می‌خواهد.',
        outcome: { type: 'transition', targetSceneId: S.finalApproach },
        effects: [{ kind: 'incrementVariable', variable: 'strangerKnowledge', amount: 1 }],
      },
      {
        id: 'end-the-call-yourself',
        label: 'خودم تماس را تمام می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.finalApproach },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },

  // -------------------------------------------------------------- Act VII ---
  {
    id: S.finalApproach,
    title: 'حیاطِ خدمه، پشت درِ آخر',
    backgroundAssetId: 'gate',
    narration: [
      'درِ پشتی انبار به حیاط کوچک خدمه باز می‌شود؛ جایی که ترولی‌ها شب‌ها آنجا می‌مانند و دیوار انتهایی‌اش، از آن طرف، به کوچهٔ پشت زندان می‌رسد. اگر از این حیاط بگذری، دیگر برنمی‌گردی.',
      'چند دقیقه وقت داری. اگر تا حالا چیزی برداشته باشی، در جیبت است؛ اگر چیزی فهمیده باشی، در سرت. اگر هیچ‌کدام را نداشته باشی، باز هم می‌توانی بروی — فقط بی‌آنکه بدانی چه چیزی را پشت سر می‌گذاری.',
      'سه راه پیش رویت است و هر سه، به یک اندازه واقعی‌اند: برو با همان نقشه‌ای که شش ماه رویش کار کردی؛ یا تا سندی در دست نداری جلو نرو؛ یا با مردی که نام واقعی‌ات را می‌داند، دربارهٔ تنها کسی حرف بزن که این هشت سال اسمش را نبرده‌ای.',
    ],
    choices: [
      {
        id: 'go-with-the-plan',
        label: 'با نقشه پیش می‌روم.',
        outcome: { type: 'transition', targetSceneId: S.endingPlan },
      },
      {
        id: 'ask-for-evidence-first',
        label: 'می‌گویم تا سند روشنی نبینم، جلو نمی‌روم.',
        condition: {
          kind: 'any',
          conditions: [
            { kind: 'clueDiscovered', clueId: CHAPTER1_CLUE.datedNote },
            { kind: 'clueDiscovered', clueId: CHAPTER1_CLUE.officeRecordDiscrepancy },
            { kind: 'clueDiscovered', clueId: CHAPTER1_CLUE.scheduleReference },
            { kind: 'clueDiscovered', clueId: CHAPTER1_CLUE.telephoneDateClaim },
          ],
        },
        outcome: { type: 'transition', targetSceneId: S.endingEvidence },
      },
      {
        id: 'ask-him-about-navid',
        label: 'دربارهٔ نوید از او می‌پرسم.',
        condition: {
          kind: 'all',
          conditions: [
            {
              kind: 'compareVariable',
              variable: 'strangerContact',
              operator: 'gte',
              value: 1,
            },
            {
              kind: 'compareVariable',
              variable: 'strangerKnowledge',
              operator: 'gte',
              value: 2,
            },
          ],
        },
        outcome: { type: 'transition', targetSceneId: S.endingConnection },
      },
    ],
  },

  // --------------------------------------------------------- Ending paths ---
  {
    id: S.endingPlan,
    title: 'قدم در حیاط',
    backgroundAssetId: 'gate',
    narration: [
      'از در می‌گذری و هوای سرد حیاط، بوی گازوئیل و خاکِ خیس را با خودش می‌آورد. نقشه همه‌جایش درست است: درِ پشتی، دیوار انتهایی، و جای خالیِ کوچکی که ترولی‌ها آن را پوشانده‌اند.',
      'و در همان لحظه، چیزی که نمی‌توانی انکارش کنی: چراغِ دفتر نگهبانی، که همیشه تا صبح روشن است، خاموش شده. یک دقیقه پیش روشن بود. کسی آن را خاموش کرده تا از پشت شیشه نبیند.',
      'نمی‌دانی چه کسی. نمی‌دانی از کِی. فقط می‌دانی که دارد اتفاقی می‌افتد که در نقشهٔ تو نیست.',
    ],
    choices: [
      {
        id: 'step-into-the-yard',
        label: 'به حیاط می‌روم.',
        outcome: { type: 'ending', endingId: CHAPTER1_ENDING.ambiguousTruth },
      },
    ],
  },
  {
    id: S.endingEvidence,
    title: 'کاغذی که باید جواب بدهد',
    backgroundAssetId: 'gate',
    narration: [
      'می‌ایستی و چیزی را که در دست داری، روی هم می‌گذاری: تاریخ‌ها، شماره‌ها، و سطری که نامش خالی مانده. اینکه تو را متوقف کرده، ترس نیست؛ حساب‌وکتاب است. عجله نداری، و همین تنها مزیتی است که تا حالا به دست آورده‌ای.',
      'اگر دو تاریخ را کنار هم بگذاری، چیزی هست که دیگر نمی‌شود نادیده گرفت: گزارش مرگی که پیش از انتقال امضا شده. اگر این دو تاریخ را کنار هم نگذاری، فقط سندهایی داری که به هم اشاره می‌کنند و هیچ‌کدام را نمی‌توانی کامل کنی.',
      'دو راه داری و هر دو معتبر: یا این را دنبال کن، یا با همان نقشه پیش برو و بعداً به آن برگرد.',
    ],
    choices: [
      {
        id: 'put-the-two-dates-together',
        label: 'دو تاریخ را کنار هم می‌گذارم و پرونده را باز نگه می‌دارم.',
        condition: {
          kind: 'clueDiscovered',
          clueId: CHAPTER1_CLUE.deathRecordContradiction,
        },
        outcome: { type: 'ending', endingId: CHAPTER1_ENDING.contradictoryDossier },
        effects: [{ kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 }],
      },
      {
        id: 'go-forward-without-proof',
        label: 'بدون این محاسبه، با همان نقشه پیش می‌روم.',
        outcome: { type: 'transition', targetSceneId: S.endingPlan },
      },
    ],
  },
  {
    id: S.endingConnection,
    title: 'اسمی که هشت سال نگفته‌ای',
    backgroundAssetId: 'gate',
    narration: [
      'اسم نوید را می‌آوری. سکوتِ سیم، این بار طولانی‌تر از همیشه است. مرد پشت خط چیزی نمی‌گوید که بشود به‌عنوان جواب ثبتش کرد؛ فقط می‌گوید: «اگر این را پرسیدی، پیازی که ریشه‌اش را از قبل می‌دانستی.»',
      'می‌توانی همین‌جا کاغذی را که در دست داری رو کنی — دو تاریخ، یک شماره، و دو حرف حکاکی‌شده روی دیوار — یا می‌توانی بدون نشان دادن چیزی، پرسشت را تکرار کنی.',
      'فرق این دو، بیشتر از یک برگه است: در یکی، چیزی برای معامله داری؛ در دیگری، فقط سؤال داری و یک مرد در انتهای سیم.',
    ],
    choices: [
      {
        id: 'show-him-the-record',
        label: 'گزارش و دو حرف را روی می‌گذارم و جواب می‌خواهم.',
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'clueDiscovered', clueId: CHAPTER1_CLUE.deathRecordContradiction },
            {
              kind: 'any',
              conditions: [
                { kind: 'clueDiscovered', clueId: CHAPTER1_CLUE.corridorInitials },
                { kind: 'clueDiscovered', clueId: CHAPTER1_CLUE.telephoneDateClaim },
              ],
            },
            { kind: 'compareVariable', variable: 'strangerTrust', operator: 'gte', value: 1 },
            { kind: 'compareVariable', variable: 'criticalMistakes', operator: 'lte', value: 1 },
          ],
        },
        outcome: { type: 'ending', endingId: CHAPTER1_ENDING.possibleConnection },
      },
      {
        id: 'ask-without-a-paper-in-your-hand',
        label: 'بدون نشان دادن چیزی، فقط می‌پرسم.',
        outcome: { type: 'transition', targetSceneId: S.endingThin },
        effects: [{ kind: 'incrementVariable', variable: 'strangerTrust', amount: -1 }],
      },
    ],
  },
  {
    id: S.endingThin,
    title: 'جوابی که جواب نیست',
    backgroundAssetId: 'gate',
    narration: [
      'مرد جواب می‌دهد، اما جوابش شبیه جمله‌ای است که از قبل آماده کرده‌اند: نوید کسی بود که پرونده‌اش را نبستند، فقط گذاشتند بخوابد؛ و خواباندنِ پرونده در آذرخش، همیشه کار یک نفر نیست.',
      'بعد خط قطع می‌شود و تو می‌مانی با جمله‌ای که نه رد می‌شود، نه ثابت. اگر در جیبت کاغذی بود، حالا در جیبت نیست که بتواند حرفی بزند — و این تنها چیزی است که در این لحظه واقعاً دست خودت بوده.',
      'از حیاط، صدای خفیف تریلی می‌آید که در ساعت چهار و نیم صبح نباید در این محوطه باشد.',
    ],
    choices: [
      {
        id: 'walk-out-anyway',
        label: 'به راهرو برمی‌گردم و با همان نقشه پیش می‌روم.',
        outcome: { type: 'ending', endingId: CHAPTER1_ENDING.ambiguousTruth },
      },
    ],
  },
];
