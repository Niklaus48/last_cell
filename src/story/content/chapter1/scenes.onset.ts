/**
 * Chapter 1 — Act I: the cell, the stranger at the door, and the last look
 * around before the corridor.
 *
 * All text is third-person narrator prose about Kian: no dialogue windows, no
 * speech marks around anyone's words, no first-person narrator. Indirect speech
 * only, so the narration never turns into a conversation.
 *
 * Every choice is declarative: a condition (when it is available at all) and a
 * list of effects. Nothing here decides what happens — the engine does, from the
 * history this file only describes.
 */
import type { SceneDefinition } from '../../engine';
import { CHAPTER1_CLUE as C, CHAPTER1_SCENE as S } from './ids';

export const onsetScenes: readonly SceneDefinition[] = [
  {
    id: S.cellDawn,
    title: 'سلول ۱۴ — پیش از چهار و نیم',
    backgroundAssetId: 'cell-interior',
    narration: [
      'ساعت هنوز به چهار و نیم نرسیده است. از پشت در سلول چهارده، صدای آشنای برخورد کلیدها می‌آید. شش ماه گذشته و کیان دیگر برای فهمیدن ساعت، نیازی به دیدن عقربه‌ها ندارد. امروز اما صدای کلیدها طوری در سینه‌اش می‌پیچد که انگار اولین شب زندان است.',
      'سلول آن‌قدر کوچک است که با سه قدم می‌شود از یک دیوارش به دیوار دیگر رسید. روی تخت نازک، جای شانه‌اش مانده و زیر آن تکه‌فلزی را پنهان کرده که بارها لبه‌اش را با انگشت امتحان کرده است. نقشهٔ فرار را صدبار مرور کرده، اما هنوز از یک اتفاق پیش‌بینی‌نشده می‌ترسد: اشتباه خودش.',
      'چند دقیقه تا تعویض شیفت مانده. راهروی خدمه، درِ فولادی و فاصلهٔ میان دو گردش نگهبان باید دقیقاً همان‌طور باشند که حساب کرده است. کیان آخرین فرصت را دارد تا پیش از حرکت، چیزی را بررسی کند.',
    ],
    choices: [
      {
        id: 'test-the-bar',
        label: 'میلهٔ دریچهٔ هوا را دوباره امتحان می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.cellBar },
      },
      {
        id: 'listen-to-the-corridor',
        label: 'بی‌حرکت می‌مانم و به ریتم راهرو گوش می‌دهم.',
        outcome: { type: 'transition', targetSceneId: S.cellListen },
      },
      {
        id: 'rehearse-in-your-head',
        label: 'جزئیات نقشه را در ذهن مرور می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.cellRehearsal },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.cellRehearsal,
    title: 'آخرین مرور',
    backgroundAssetId: 'cell-interior',
    narration: [
      'کیان نقشه را برای صدمین بار مرور می‌کند. این بار از میان جزئیات، فقط چیزهایی را نگه می‌دارد که ممکن است اشتباه پیش بروند: صدای میله، مسیر نگهبان و در فولادی.',
      'شش ماه انتظار، اضطراب را از بین نبرده است؛ فقط یادش داده با آن چه کند. هنوز می‌تواند سراغ میله برود، یا چند لحظه به راهرو گوش بدهد.',
    ],
    choices: [
      {
        id: 'rehearsal-check-bar',
        label: 'دریچه را برای آخرین بار بررسی کند.',
        outcome: { type: 'transition', targetSceneId: S.cellBar },
      },
      {
        id: 'rehearsal-listen',
        label: 'به رفت‌وآمد راهرو گوش کند.',
        outcome: { type: 'transition', targetSceneId: S.cellListen },
      },
    ],
  },

  {
    id: S.cellBar,
    title: 'میله‌ای که باید ساکت بماند',
    backgroundAssetId: 'cell-interior',
    narration: [
      'کیان کنار دریچه زانو می‌زند. میلهٔ سمت راست هنوز کمی لق می‌زند؛ همان میلی‌متری که طی این ماه‌ها برایش زحمت کشیده است. اگر با زاویهٔ درست فشارش دهد، بی‌صدا کنار می‌رود. اگر دستش بلغزد، صدایی تولید می‌کند که از پشت این در هم شنیده خواهد شد.',
      'ته‌ماندهٔ روغن در ظرف کوچکی زیر تخت است. استفاده از آن می‌تواند کار را آسان‌تر کند، اما دست‌کاری دوبارهٔ میله درست پیش از گردش نگهبان، ریسک خودش را دارد.',
    ],
    choices: [
      {
        id: 'ease-the-bolt',
        label: 'روغنِ باقی‌مانده را زیر میله می‌برم و جا می‌اندازمش.',
        outcome: { type: 'transition', targetSceneId: S.strangerArrives },
        effects: [
          { kind: 'incrementVariable', variable: 'planIntegrity', amount: 1 },
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 1 },
        ],
      },
      {
        id: 'leave-it',
        label: 'دست نمی‌زنم؛ میله به همین حالا هم کار می‌کند.',
        outcome: { type: 'transition', targetSceneId: S.strangerArrives },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.cellListen,
    title: 'ریتم راهرو',
    backgroundAssetId: 'cell-interior',
    narration: [
      'کیان چشم‌هایش را می‌بندد. صدای کفش نگهبان روی چهارمین کاشی کمی بلندتر می‌شود؛ بعد مکث، برگشتن و دور شدن. هفده دقیقه میان دو دور فاصله است. چند بار شمرده و هر بار به همان عدد رسیده است.',
      'در دقیقهٔ نهم، از طبقهٔ پایین صدای باز شدن دری می‌آید که در برنامهٔ شیفت جایی ندارد. این صدا تازه نیست، ولی امشب شاید مهم‌تر از همیشه باشد. او می‌تواند این جزئیات را به نقشه‌اش اضافه کند یا ذهنش را از حساب‌وکتاب خالی نگه دارد.',
    ],
    choices: [
      {
        id: 'memorize-the-rhythm',
        label: 'هفده دقیقه و آن درِ بی‌برنامه را به خاطر می‌سپارم.',
        outcome: { type: 'transition', targetSceneId: S.strangerArrives },
        effects: [
          { kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 },
        ],
      },
      {
        id: 'go-back-to-the-bed',
        label: 'به تخت برمی‌گردم و ذهنم را آرام می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.strangerArrives },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.strangerArrives,
    title: 'کسی که نام واقعی‌ات را می‌داند',
    backgroundAssetId: 'cell-interior',
    narration: [
      'هنوز دستش از لبهٔ تخت جدا نشده که صدای قدمی پشت در می‌ایستد. نه صدای نگهبان همیشگی است و نه کلیدی در قفل می‌چرخد. مردی پشت در، بی‌آنکه بخواهد داخل شود، کیان را با نام واقعی‌اش صدا می‌زند.',
      'در آذرخش هیچ‌کس او را کیان فرهمند نمی‌شناسد؛ دست‌کم قرار بوده نشناسد. مرد با آرامشی نامناسبِ این ساعت، به او می‌فهماند که روز مورد انتظار فرا رسیده است. کیان برای یک لحظه نفسش را نگه می‌دارد. اگر مرد از نقشه خبر دارد، شاید تمام این شش ماه زیر نظر بوده است.',
      'قدم‌ها هنوز پشت درند. فرصت واکنش کوتاه است و هر پاسخ می‌تواند چیزی دربارهٔ او لو بدهد.',
    ],
    timedDecision: {
      durationMs: 12000,
      defaultChoiceId: 'stay-silent',
    },
    choices: [
      {
        id: 'stay-silent',
        label: 'سکوت می‌کنم و هیچ نشانه‌ای نمی‌دهم.',
        outcome: { type: 'transition', targetSceneId: S.silence },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
      {
        id: 'ask-who-he-is',
        label: 'دربارهٔ هویت مرد پرس‌وجو می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.strangerWho },
        effects: [
          { kind: 'incrementVariable', variable: 'strangerContact', amount: 1 },
          { kind: 'incrementVariable', variable: 'strangerKnowledge', amount: 1 },
        ],
      },
      {
        id: 'threaten-him',
        label: 'با عصبانیت از او توضیح می‌خواهی.',
        outcome: { type: 'transition', targetSceneId: S.strangerThreat },
        effects: [
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 1 },
          { kind: 'incrementVariable', variable: 'criticalMistakes', amount: 1 },
          { kind: 'incrementVariable', variable: 'composure', amount: -1 },
        ],
      },
    ],
  },

  {
    id: S.silence,
    title: 'سکوت، و سکوت',
    backgroundAssetId: 'cell-interior',
    narration: [
      'کیان به در نگاه نمی‌کند. همان‌جا می‌ماند و حتی سعی می‌کند نفس‌هایش را آرام‌تر کند. سکوت طول می‌کشد؛ آن‌قدر که ضربانش را در گوش‌هایش می‌شنود.',
      'مرد سرانجام از تلاش برای گرفتن پاسخ دست می‌کشد. نه خودش را معرفی می‌کند و نه توضیحی می‌دهد. قدم‌هایش دور می‌شوند، اما نامی که به زبان آورده در ذهن کیان می‌ماند. حالا او مطمئن است کسی بیرون سلول، گذشته‌اش را می‌شناسد.',
    ],
    choices: [
      {
        id: 'wait-for-the-steps-to-fade',
        label: 'صبر می‌کنم تا صدای قدم‌ها محو شود.',
        outcome: { type: 'transition', targetSceneId: S.leavingCell },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.strangerWho,
    title: 'نامی که جواب نمی‌دهد',
    backgroundAssetId: 'cell-interior',
    narration: [
      'کیان نزدیک در می‌شود و هویت مرد را می‌خواهد. غریبه جواب روشنی نمی‌دهد. در عوض به شب بیست‌ویکم، هشت سال پیش، اشاره می‌کند؛ شبی که قرار بود تمام پرونده‌ها و خاطراتش همان‌جا تمام شوند.',
      'مدت‌هاست کیان تلاش کرده تصویر آن شب را از سرش بیرون کند. حالا یک غریبه در تاریکی راهرو، به چیزی اشاره می‌کند که حتی نگهبان‌ها نباید درباره‌اش بدانند. مرد هشدار می‌دهد که امروز باید هر قدم را با احتیاط بردارد و بعد وعدهٔ دیدار دوباره می‌دهد.',
      'کیان نمی‌داند این هشدار کمک است یا تهدید. فقط می‌داند مرد منتظر واکنش اوست.',
    ],
    choices: [
      {
        id: 'press-for-a-name',
        label: 'اصرار می‌کنم هویتش را آشکار کند.',
        outcome: { type: 'transition', targetSceneId: S.leavingCell },
        condition: { kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 2 },
        effects: [
          { kind: 'incrementVariable', variable: 'strangerKnowledge', amount: 1 },
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 1 },
        ],
      },
      {
        id: 'say-nothing-more',
        label: 'چیزی نمی‌گویم و می‌گذارم برود.',
        outcome: { type: 'transition', targetSceneId: S.leavingCell },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.strangerThreat,
    title: 'صدای بلندی که نباید بلند می‌شد',
    backgroundAssetId: 'cell-interior',
    narration: [
      'نام واقعی‌اش کافی بوده تا احتیاط کیان برای لحظه‌ای از دست برود. به در نزدیک می‌شود و با صدایی بلندتر از حد امن، مرد را تهدید می‌کند. کلماتش که تمام می‌شود، پشیمانی زودتر از جواب غریبه سراغش می‌آید.',
      'مرد واکنش تندی نشان نمی‌دهد. توجه کیان را به صدایی جلب می‌کند که از انتهای راهرو قطع شده است: نگهبان برای لحظه‌ای از راه رفتن ایستاده. حالا دیگر مهم نیست غریبه ترسیده یا نه؛ یکی دیگر هم ممکن است صدای کیان را شنیده باشد.',
    ],
    choices: [
      {
        id: 'lower-your-voice',
        label: 'صدایم را پایین می‌آورم و به دیوار تکیه می‌دهم.',
        outcome: { type: 'transition', targetSceneId: S.leavingCell },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
      {
        id: 'keep-pressing',
        label: 'ادامه می‌دهم تا بترسد.',
        outcome: { type: 'transition', targetSceneId: S.leavingCell },
        effects: [
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 1 },
          { kind: 'incrementVariable', variable: 'criticalMistakes', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.leavingCell,
    title: 'آستانهٔ سلول',
    backgroundAssetId: 'cell-interior',
    narration: [
      'پس از دور شدن قدم‌ها، کیان برای آخرین بار به تخت و دیوار نم‌گرفته نگاه می‌کند. شش ماه از عمرش در همین چند متر گذشته است. فکر کرده بود هنگام رفتن خوشحال می‌شود؛ اما چیزی که حس می‌کند بیشتر شبیه ترس از دست دادن تنها جایی است که قواعدش را بلد شده.',
      'دریچه با فشاری آهسته کنار می‌رود و راه خروج باز می‌شود. او می‌تواند فوراً وارد راهرو شود، یا پیش از رفتن گوشه‌هایی را بگردد که تا امروز عمداً به سراغشان نرفته است.',
    ],
    choices: [
      {
        id: 'slip-out-now',
        label: 'بی‌درنگ بیرون می‌روم.',
        outcome: { type: 'transition', targetSceneId: S.corridorFirst },
      },
      {
        id: 'search-the-cell-first',
        label: 'یک بار دیگر گوشه‌های سلول را نگاه می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.cellSearch },
      },
    ],
  },

  {
    id: S.cellSearch,
    title: 'زیر صفحهٔ لق',
    backgroundAssetId: 'cell-interior',
    narration: [
      'کیان زیر تخت دست می‌برد و به صفحهٔ سیمانی لقِ کنار دیوار می‌رسد. مدت‌ها می‌دانسته آن صفحه تکان می‌خورد، اما هیچ‌وقت دلیلی برای باز کردنش نداشته است.',
      'زیر صفحه گردوغبار، قوطی زنگ‌زده و تکه‌کاغذی تاخورده پیدا می‌کند. کاغذ به‌قدری کهنه نیست که از سال‌ها پیش مانده باشد. کسی آن را با عجله آنجا گذاشته؛ شاید پیش از آمدن کیان، شاید در یکی از روزهایی که او از سلول بیرون برده شده بود.',
    ],
    choices: [
      {
        id: 'pull-the-note',
        label: 'برگه را بیرون می‌کشم و باز می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.note },
        effects: [
          { kind: 'discoverClue', clueId: C.datedNote },
        ],
      },
      {
        id: 'leave-it-where-it-is',
        label: 'دست نمی‌زنم؛ این مال من نیست و وقت ندارم.',
        outcome: { type: 'transition', targetSceneId: S.corridorFirst },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.note,
    title: 'یادداشت ۱۴ مهر',
    backgroundAssetId: 'cell-interior',
    narration: [
      'کاغذ با خودکار آبی نوشته شده و تاریخ چهاردهم مهر را دارد، اما سالی روی آن نیست. نویسنده از انتقال یک نفر و لزوم دست‌نخوردن گزارشش گفته است. پایین نوشته، شمارهٔ ارجاع ۴۱۷-ب دیده می‌شود.',
      'کیان چند بار شماره را زیر لب تکرار می‌کند. هیچ نامی در یادداشت نیست. شاید به گذشتهٔ او ربط داشته باشد و شاید هم باقی‌ماندهٔ دردسر زندانی دیگری باشد. با این حال، کسی آن را دقیقاً زیر تخت او گذاشته است؛ همین برای مشکوک شدن کافی است.',
    ],
    choices: [
      {
        id: 'fold-it-into-your-sleeve',
        label: 'تا می‌کنم و در آستینم پنهانش می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.corridorFirst },
        effects: [
          { kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 },
        ],
      },
      {
        id: 'memorize-and-leave-it',
        label: 'شماره را حفظ می‌کنم و برگه را سر جایش می‌گذارم.',
        outcome: { type: 'transition', targetSceneId: S.corridorFirst },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },
];
