/**
 * Chapter 1 — Act III: the archive, the internal phone and the yard.
 *
 * The three endings are reached from here, and each is gated by what Kian
 * actually has: the archive gives evidence, the phone gives a contact channel
 * (and a claim, which is not proof), and the yard gives the last decision. A
 * player with nothing still has the plain escape: no ending is a reward for
 * grinding, and none of the three is a trap.
 */
import type { SceneDefinition } from '../../engine';
import { CHAPTER1_CLUE as C, CHAPTER1_ENDING, CHAPTER1_SCENE as S } from './ids';

export const finaleScenes: readonly SceneDefinition[] = [
  {
    id: S.recordsAlcove,
    title: 'اتاق بایگانی قدیم',
    backgroundAssetId: 'alcove',
    narration: [
      'کیان به اتاقی می‌رسد که پرونده‌های فراموش‌شده را در آن تلنبار کرده‌اند. قفسه‌ها تا سقف بالا رفته‌اند و رطوبت گوشهٔ پوشه‌ها را موج‌دار کرده است.',
      'روی دیوار تلفن داخلی قدیمی نصب است. کیان گوشی را لمس می‌کند و صدای آزاد بودن خط را می‌شنود، اما آن را فعلاً کنار می‌گذارد. اگر شمارهٔ ارجاعی به دست آورده باشد می‌تواند قفسه‌ها را هدفمند بگردد؛ وگرنه وقت کافی برای زیروروکردن همهٔ این کاغذها ندارد.',
    ],
    choices: [
      {
        id: 'avoid-alarmed-archive',
        label: 'از صدای جست‌وجوی نگهبان‌ها دور شود.',
        outcome: { type: 'transition', targetSceneId: S.finalApproach },
        condition: { kind: 'compareVariable', variable: 'guardSuspicion', operator: 'gte', value: 4 },
        effects: [
          { kind: 'incrementVariable', variable: 'planIntegrity', amount: -1 },
        ],
      },
      {
        id: 'search-the-old-folders',
        label: 'قفسه را بر اساس شمارهٔ ارجاع می‌گردم.',
        outcome: { type: 'transition', targetSceneId: S.recordPull },
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'clueDiscovered', clueId: C.datedNote },
            {
              kind: 'not',
              condition: { kind: 'clueDiscovered', clueId: C.deathRecordContradiction },
            },
          ],
        },
        effects: [
          { kind: 'discoverClue', clueId: C.deathRecordContradiction },
        ],
      },
      {
        id: 'search-other-reference',
        label: 'شمارهٔ جداگانهٔ برنامهٔ غذاخوری را بررسی کند.',
        outcome: { type: 'transition', targetSceneId: S.scheduleFile },
        condition: { kind: 'clueDiscovered', clueId: C.scheduleReference },
        effects: [
          { kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 },
        ],
      },
      {
        id: 'answer-the-internal-phone',
        label: 'گوشی را برمی‌دارم؛ کسی از داخلی زنگ می‌زند.',
        outcome: { type: 'transition', targetSceneId: S.phone },
        condition: { kind: 'compareVariable', variable: 'strangerContact', operator: 'gte', value: 1 },
      },
      {
        id: 'keep-moving',
        label: 'به قفسه‌ها دست نمی‌زنم و جلو می‌روم.',
        outcome: { type: 'transition', targetSceneId: S.finalApproach },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.recordPull,
    title: 'پرونده‌ای که نباید اینجا باشد',
    backgroundAssetId: 'alcove',
    narration: [
      'در قفسهٔ چهارم، ردیف سوم، پرونده‌ای پیدا می‌شود که شماره‌اش با سرنخ قبلی ارتباط دارد. گزارش مرگ به تاریخ دوازدهم مهر ثبت شده، اما انتقال همان پرونده دو روز بعد انجام شده است.',
      'کیان چند بار تاریخ‌ها را می‌خواند. این مدارک ثابت نمی‌کنند فردی هنوز زنده است؛ فقط نشان می‌دهند ثبت رسمی حقیقت کاملی را نمی‌گوید. جای امضای پایین صفحه با جوهر پوشانده شده و کنجکاوی او را بیشتر می‌کند.',
    ],
    choices: [
      {
        id: 'note-the-archive-number',
        label: 'شمارهٔ بایگانی را به خاطر می‌سپرم.',
        outcome: { type: 'transition', targetSceneId: S.finalApproach },
        effects: [
          { kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 },
        ],
      },
      {
        id: 'close-the-file',
        label: 'پرونده را سر جایش می‌گذارم.',
        outcome: { type: 'transition', targetSceneId: S.finalApproach },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.scheduleFile,
    title: 'شمارهٔ دیگری روی کاغذ',
    backgroundAssetId: 'alcove',
    narration: [
      'شمارهٔ ۹۲۰-۴ کیان را به یک دسته برگهٔ ثبت رفت‌وآمد خدمه می‌رساند، نه پروندهٔ مرگ. میان ساعت‌های خط‌خورده، یک رفت‌وآمد پیش از طلوع ثبت شده؛ زمانی که قرار بود راهرو خالی باشد.',
      'این کشف به‌تنهایی چیزی دربارهٔ نوید ثابت نمی‌کند، اما نشان می‌دهد مسیر امنِ نقشه شاید از ابتدا امن نبوده است.',
    ],
    choices: [
      {
        id: 'schedule-return',
        label: 'ساعت رفت‌وآمد را حفظ کند و به مسیر خروج برگردد.',
        outcome: { type: 'transition', targetSceneId: S.finalApproach },
        effects: [
          { kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 },
          { kind: 'incrementVariable', variable: 'planIntegrity', amount: -1 },
        ],
      },
    ],
  },

  {
    id: S.phone,
    title: 'زنگِ داخلی',
    backgroundAssetId: 'alcove',
    narration: [
      'زنگ تلفن داخلی ناگهان سکوت بایگانی را می‌شکند. کیان پیش از برداشتن گوشی به در نگاه می‌کند. صدای آن سوی خط را می‌شناسد: همان مردی که پشت سلول نام واقعی‌اش را گفته بود.',
      'غریبه مدعی است از یکی از داخلی‌های نگهبانی تماس می‌گیرد. می‌خواهد کیان بداند در تاریخ‌های ثبت انتقال تناقضی وجود دارد. اما کیان هنوز نمی‌داند مرد واقعاً به سندی دسترسی داشته یا فقط می‌خواهد او را به مسیر خاصی بکشاند.',
      'او می‌تواند حرف مرد را بشنود، از او نشانه‌ای قابل بررسی بخواهد یا پیش از آنکه ارتباط خطرساز شود تماس را قطع کند.',
    ],
    choices: [
      {
        id: 'let-him-explain',
        label: 'می‌گذارم کامل توضیح بدهد.',
        outcome: { type: 'transition', targetSceneId: S.phoneTalk },
        effects: [
          { kind: 'incrementVariable', variable: 'strangerTrust', amount: 1 },
          { kind: 'incrementVariable', variable: 'strangerKnowledge', amount: 1 },
        ],
      },
      {
        id: 'demand-something-checkable',
        label: 'چیزی می‌خواهم که خودم بتوانم بررسی کنم.',
        outcome: { type: 'transition', targetSceneId: S.phoneTalk },
        effects: [
          { kind: 'incrementVariable', variable: 'strangerTrust', amount: -1 },
          { kind: 'incrementVariable', variable: 'strangerKnowledge', amount: 1 },
          { kind: 'discoverClue', clueId: C.telephoneDateClaim },
        ],
      },
      {
        id: 'hang-up',
        label: 'گوشی را می‌گذارم.',
        outcome: { type: 'transition', targetSceneId: S.finalApproach },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.phoneTalk,
    title: 'چیزی که می‌شود بررسی کرد',
    backgroundAssetId: 'alcove',
    narration: [
      'غریبه از گزارشی قدیمی و امضایی مخدوش حرف می‌زند و تأکید می‌کند که شمارهٔ ارجاع می‌تواند راه رسیدن به آن باشد. نام صاحب پرونده را فاش نمی‌کند. کیان نمی‌تواند تشخیص دهد مرد چیزی را پنهان می‌کند یا خودش هم همهٔ حقیقت را نمی‌داند.',
      'آن سوی خط صدای دور شدن کسی به گوش می‌رسد. زمان تماس رو به پایان است. کیان هنوز می‌تواند انگیزهٔ مرد را بپرسد، اما حتی پاسخ هم تضمینی برای راست‌گویی او نیست.',
    ],
    choices: [
      {
        id: 'ask-what-he-wants',
        label: 'انگیزهٔ واقعی مرد را جویا می‌شوم.',
        outcome: { type: 'transition', targetSceneId: S.finalApproach },
        effects: [
          { kind: 'incrementVariable', variable: 'strangerKnowledge', amount: 1 },
        ],
      },
      {
        id: 'end-the-call-yourself',
        label: 'خودم تماس را تمام می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.finalApproach },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.finalApproach,
    title: 'حیاطِ خدمه، پشت درِ آخر',
    backgroundAssetId: 'gate',
    narration: [
      'در پشتی انبار به حیاط خدمه باز می‌شود. بوی گازوئیل از بیرون می‌آید و پشت دیوار کوتاه انتهای حیاط، صدای دورِ خیابان شنیده می‌شود. کیان فقط چند قدم تا جایی فاصله دارد که شش ماه در ذهنش ساخته بود.',
      'حالا مشکل فقط بیرون رفتن نیست. نام واقعی‌اش، پرونده‌های ناقص و غریبه‌ای که زمان حرکتش را می‌دانست، تصویری ساخته‌اند که با نقشهٔ اولیه جور نیست. اگر مدرکی جمع کرده، می‌تواند آن را کنار هم بگذارد؛ اگر به مرد اعتماد کرده، می‌تواند دنبال پاسخ شخصی‌تری برود. و اگر هیچ‌کدام را ندارد، راه فرار هنوز مقابلش باز است.',
      'کنار در خروجی یک گوشی داخلی نصب شده است. اگر کیان با مرد ناشناس راه ارتباطی باز گذاشته باشد، این آخرین فرصت تماس است؛ هیچ تضمینی نیست کسی آن سوی خط جواب بدهد.',
    ],
    choices: [
      {
        id: 'go-with-the-plan',
        label: 'با نقشه پیش می‌روم.',
        outcome: { type: 'transition', targetSceneId: S.endingPlan },
      },
      {
        id: 'ask-for-evidence-first',
        label: 'پیش از رفتن، سرنخ‌ها را کنار هم می‌گذاری.',
        outcome: { type: 'transition', targetSceneId: S.endingEvidence },
        condition: {
          kind: 'any',
          conditions: [
            { kind: 'clueDiscovered', clueId: C.datedNote },
            { kind: 'clueDiscovered', clueId: C.officeRecordDiscrepancy },
            { kind: 'clueDiscovered', clueId: C.scheduleReference },
            { kind: 'clueDiscovered', clueId: C.telephoneDateClaim },
          ],
        },
      },
      {
        id: 'ask-him-about-navid',
        label: 'نام نوید را پیش می‌کشی.',
        outcome: { type: 'transition', targetSceneId: S.endingConnection },
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'compareVariable', variable: 'strangerContact', operator: 'gte', value: 1 },
            { kind: 'compareVariable', variable: 'strangerKnowledge', operator: 'gte', value: 2 },
            { kind: 'compareVariable', variable: 'strangerTrust', operator: 'gte', value: 0 },
          ],
        },
      },
    ],
  },

  {
    id: S.endingPlan,
    title: 'قدم در حیاط',
    backgroundAssetId: 'gate',
    narration: [
      'کیان در را کمی باز می‌کند. هوای حیاط سرد و سنگین است. ترولی‌ها همان‌جایی قرار دارند که انتظار داشت، اما چراغ دفتر نگهبانی ناگهان خاموش می‌شود.',
      'برای لحظه‌ای به تاریکی پنجره خیره می‌ماند. شاید برق رفته باشد؛ شاید هم کسی عمداً کاری کرده که از آن اتاق دیده نشود. مسیر آزادی چند قدم بیشتر نیست، ولی این اتفاق در هیچ‌یک از تمرین‌های شش‌ماهه‌اش وجود نداشت.',
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
      'کیان کنار در می‌ایستد و آنچه را دیده در ذهن مرتب می‌کند: تاریخ‌ها، شماره‌های ارجاع و ثبت‌هایی که کسی نخواسته کامل بمانند. ممکن است تمام این‌ها اشتباه اداری باشد؛ ممکن هم هست کسی برای ساختن یک روایت دروغ، همه را کنار هم چیده باشد.',
      'اگر تناقض گزارش مرگ را واقعاً پیدا کرده باشد، حالا نشانه‌ای محکم‌تر از حدس دارد. اگر نه، می‌تواند به جای تعقیب پاسخ‌هایی که هنوز سند ندارند، فرار را کامل کند.',
    ],
    choices: [
      {
        id: 'put-the-two-dates-together',
        label: 'دو تاریخ را کنار هم می‌گذارم و پرونده را باز نگه می‌دارم.',
        outcome: { type: 'ending', endingId: CHAPTER1_ENDING.contradictoryDossier },
        condition: { kind: 'clueDiscovered', clueId: C.deathRecordContradiction },
        effects: [
          { kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 },
        ],
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
      'نام نوید بعد از هشت سال دوباره از ذهن کیان به زبان می‌آید. صدای مرد از گوشیِ داخلیِ کنار در می‌آید؛ آن سوی خط، در برابر این نام مکث می‌کند؛ مکثی که نه تأیید است و نه انکار.',
      'کیان به چیزهایی فکر می‌کند که در مسیر دیده: گزارش ناقص، تاریخ‌های متضاد و حروف روی دیوار. اگر مدرک کافی در دست داشته باشد می‌تواند مرد را با جزئیات روبه‌رو کند؛ وگرنه تنها ابزارش پرسشی است که شاید غریبه از پیش برای آن پاسخی آماده کرده باشد.',
    ],
    choices: [
      {
        id: 'show-him-the-record',
        label: 'با جزئیات پرونده او را روبه‌رو می‌کنم.',
        outcome: { type: 'ending', endingId: CHAPTER1_ENDING.possibleConnection },
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'clueDiscovered', clueId: C.deathRecordContradiction },
            {
              kind: 'any',
              conditions: [
                { kind: 'clueDiscovered', clueId: C.corridorInitials },
                { kind: 'clueDiscovered', clueId: C.telephoneDateClaim },
              ],
            },
            { kind: 'compareVariable', variable: 'strangerTrust', operator: 'gte', value: 1 },
            { kind: 'compareVariable', variable: 'criticalMistakes', operator: 'lte', value: 1 },
          ],
        },
      },
      {
        id: 'ask-without-a-paper-in-your-hand',
        label: 'بی‌آنکه سندی نشان دهی، پاسخ می‌خواهی.',
        outcome: { type: 'transition', targetSceneId: S.endingThin },
        effects: [
          { kind: 'incrementVariable', variable: 'strangerTrust', amount: -1 },
        ],
      },
    ],
  },

  {
    id: S.endingThin,
    title: 'جوابی که جواب نیست',
    backgroundAssetId: 'gate',
    narration: [
      'غریبه طوری از نوید حرف می‌زند که انگار پرونده‌اش هیچ‌وقت به‌راستی بسته نشده بود. اما چیزی نشان نمی‌دهد که کیان بتواند به آن تکیه کند. ارتباط قطع می‌شود و اتاق بار دیگر در سکوت فرو می‌رود.',
      'کیان از خودش عصبانی است که نام نوید را به کسی گفته که حتی چهره‌اش را ندیده است. از بیرون صدای چرخ ترولی می‌آید. فرصت رفتن هنوز تمام نشده، اما حالا آن سؤال را هم باید با خودش ببرد.',
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
