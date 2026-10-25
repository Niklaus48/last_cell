/**
 * Chapter 1 — Act IV (two routes) and Act V (the corridor and the locked door).
 *
 * Route A (the warden's office) carries more risk and yields paperwork; Route B
 * (cafeteria and service corridor) looks safer and yields timetable knowledge.
 * The two routes give different information, then converge at `ch1-corridor-mid`
 * with the state they produced still attached.
 */
import type { SceneDefinition } from '../../engine';
import { CHAPTER1_CLUE, CHAPTER1_FAILURE, CHAPTER1_SCENE as S } from './ids';

export const routeScenes: readonly SceneDefinition[] = [
  // ------------------------------------------------- Route A: the office ---
  {
    id: S.officeEntry,
    title: 'زیر درِ دفتر نگهبانی',
    backgroundAssetId: 'office',
    narration: [
      'زیر درِ دفتر، نور زردی از لای چارچوب بیرون می‌زند. دو مرد داخل‌اند و صدایشان پایین است، اما نه پایین‌تر از آنکه از پشت در شنیده نشود.',
      'یکی می‌گوید که فهرست امشب یک نام کم دارد و دفتر انتقال نباید دستکاری شود. دیگری جواب می‌دهد: «ننویسش. اگر پرسیدند، می‌گوییم از اول نبوده.» بعد صدای کشیده‌شدن صندلی می‌آید و مکالمه همان‌جا نصفه می‌ماند؛ حرفی که ادامه‌اش هرگز گفته نمی‌شود.',
      'در این فاصله می‌توانی بایستی و بیشتر بشنوی، یا از کنار در بگذری و به میزِ خالی و دفترهای رویش برسی.',
    ],
    choices: [
      {
        id: 'listen-at-the-door',
        label: 'می‌ایستم و تا آخرین کلمه گوش می‌دهم.',
        outcome: { type: 'transition', targetSceneId: S.officeDesk },
        effects: [
          { kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 },
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 1 },
        ],
      },
      {
        id: 'slip-past-the-door',
        label: 'بی‌صدا از کنار در می‌گذرم.',
        outcome: { type: 'transition', targetSceneId: S.officeDesk },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },
  {
    id: S.officeDesk,
    title: 'میزِ خالی',
    backgroundAssetId: 'office',
    narration: [
      'اتاق کوچک است و بوی کاغذ کهنه و چای سرد دارد. روی میز، دفتر انتقال باز مانده و کنارش پوشه‌ای است که برچسب طبقه‌بندی ندارد — چیزی که در این ساختمان یعنی صاحبش نمی‌خواسته جایی ثبت شود.',
      'دفتر انتقال سنگین است: ده‌ها سطر با تاریخ و شمارهٔ ارجاع و نامِ مقصد. اگر به هر سطری دست بزنی، جای انگشت روی کاغذ می‌ماند. چراغ دفتر هم روشن است، یعنی تا نیم‌ساعت دیگر یک نفر برمی‌گردد.',
    ],
    choices: [
      {
        id: 'read-the-transfer-ledger',
        label: 'دفتر انتقال را ورق می‌زنم.',
        outcome: { type: 'transition', targetSceneId: S.officeLedger },
        effects: [{ kind: 'discoverClue', clueId: CHAPTER1_CLUE.officeRecordDiscrepancy }],
      },
      {
        id: 'memorize-the-room-and-go',
        label: 'فقط چیدمان اتاق را به خاطر می‌سپرم و بیرون می‌روم.',
        outcome: { type: 'transition', targetSceneId: S.corridorMid },
        effects: [{ kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 }],
      },
    ],
  },
  {
    id: S.officeLedger,
    title: 'سطری که نام ندارد',
    backgroundAssetId: 'office',
    narration: [
      'در یکی از صفحه‌های میانی، میان دو سطر مرتبِ ثبت، سطری هست که در آن نام مقصد خالی مانده است. تاریخش ۱۴ مهر است و کنارش، به‌جای نام، شمارهٔ ارجاع نوشته شده: ۴۱۷-ب.',
      'اگر این شماره را جایی دیده باشی، حالا معنا پیدا می‌کند؛ اگر ندیده باشی، فقط یک عدد است که در سطر اشتباهی نشسته. بالای صفحه هم با مداد، در حاشیه، جابه‌جایی یک روزه در تاریخ گردش شیفت علامت خورده — تغییری کوچک در روالی که کسی نباید تغییرش می‌داد.',
      'لای پوشهٔ بی‌برچسب هم برگه‌ای هست. برداشتنش کار یک ثانیه است و پیامدش کار یک شب.',
    ],
    choices: [
      {
        id: 'compare-with-a-number-you-know',
        label: 'شمارهٔ ارجاع را با شماره‌ای که می‌شناسم مقایسه می‌کنم.',
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'clueDiscovered', clueId: CHAPTER1_CLUE.officeRecordDiscrepancy },
            {
              kind: 'any',
              conditions: [
                { kind: 'clueDiscovered', clueId: CHAPTER1_CLUE.datedNote },
                { kind: 'clueDiscovered', clueId: CHAPTER1_CLUE.scheduleReference },
              ],
            },
          ],
        },
        outcome: { type: 'transition', targetSceneId: S.contradictionOffice },
        effects: [
          { kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 },
          { kind: 'discoverClue', clueId: CHAPTER1_CLUE.deathRecordContradiction },
        ],
      },
      {
        id: 'take-the-loose-page',
        label: 'برگهٔ داخل پوشه را برمی‌دارم.',
        outcome: { type: 'failure', failureId: CHAPTER1_FAILURE.officeAlarm },
        effects: [
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 1 },
          { kind: 'incrementVariable', variable: 'criticalMistakes', amount: 1 },
        ],
      },
      {
        id: 'close-the-folder',
        label: 'پوشه را می‌بندم و بیرون می‌روم.',
        outcome: { type: 'transition', targetSceneId: S.corridorMid },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },
  {
    id: S.contradictionOffice,
    title: 'دو تاریخی که با هم نمی‌خوانند',
    backgroundAssetId: 'office',
    narration: [
      'شماره را دنبال می‌کنی و به پروندهٔ قدیمی‌تری می‌رسی که در قفسهٔ پایین، لای پرونده‌های باطله مانده است. گزارش مرگ، در دوازدهم مهر امضا شده. سطر انتقال همان شمارهٔ ارجاع، چهاردهم مهر ثبت شده.',
      'یعنی روی کاغذ، کسی دو روز پیش از آنکه منتقل شود مرده است. این تناقض ثابت نمی‌کند که او زنده است؛ فقط ثابت می‌کند که یکی از این دو تاریخ نباید آنجا باشد. و در این ساختمان، تاریخِ اشتباه یعنی کسی آن را نوشته.',
      'در حاشیهٔ گزارش، جای امضا هست و زیرش یک حرف مانده که با جوهر پاک‌شده ناخوانا شده است. کسی نمی‌خواسته امضا خوانده شود.',
    ],
    choices: [
      {
        id: 'study-the-erased-signature',
        label: 'جای امضای پاک‌شده را با دقت نگاه می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.corridorMid },
        effects: [{ kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 }],
      },
      {
        id: 'close-it-and-move',
        label: 'پرونده را می‌بندم و برمی‌گردم به راهرو.',
        outcome: { type: 'transition', targetSceneId: S.corridorMid },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },

  // -------------------------------------- Route B: cafeteria & service way ---
  {
    id: S.cafeteria,
    title: 'غذاخوری خالی',
    backgroundAssetId: 'cafeteria',
    narration: [
      'غذاخوری در این ساعت خالی است و صندلی‌های فلزی، مثل دندانی که کنده شده باشد، ردیف ایستاده‌اند. روی دیوار، تابلوی برنامهٔ هفتگی آویزان است و کنارش با گچ، ساعت‌ها را دستکاری کرده‌اند: یکی از شیفت‌های شام پاک شده و با عددی دیگر جای گرفته.',
      'در حاشیهٔ همان تابلو، با گچ نازک، شماره‌ای نوشته شده که به برنامهٔ رسمی تعلق ندارد و فقط از همین زاویه خوانده می‌شود: ۹۲۰-۴.',
      'از اینجا راهروی خدمه شروع می‌شود. اگر بایستی و تابلو را بخوانی، چند ثانیه دستت را می‌بندی؛ اگر رد شوی، دستت باز است و ذهنت سبک‌تر — و شاید چیزی را از دست داده باشی.',
    ],
    choices: [
      {
        id: 'study-the-board',
        label: 'می‌ایستم و برنامهٔ دستکاری‌شده را می‌خوانم.',
        outcome: { type: 'transition', targetSceneId: S.serviceEntry },
        effects: [
          { kind: 'discoverClue', clueId: CHAPTER1_CLUE.scheduleReference },
          { kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 },
        ],
      },
      {
        id: 'cross-to-the-service-door',
        label: 'رد می‌شوم و به راهروی خدمه می‌رسم.',
        outcome: { type: 'transition', targetSceneId: S.serviceEntry },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },
  {
    id: S.serviceEntry,
    title: 'راهروی خدمه',
    backgroundAssetId: 'service-corridor',
    narration: [
      'راهروی خدمه باریک‌تر از آن است که فکرش را می‌کردی و دیوارهایش تا نیمه سیمانی است. کف راهرو خیس است و یک خط آب، از سمت انبار تا پیچ راهرو، کشیده شده؛ چرخ‌های یک ترولی که همین چند دقیقه پیش از اینجا گذشته است.',
      'چرخ‌ها هنوز سرد نشده‌اند. اما در برنامهٔ رسمی، هیچ ترولی در این ساعت از این راهرو نمی‌گذرد؛ برنامه می‌گوید این مسیر تا پنج و نیم خالی است.',
    ],
    choices: [
      {
        id: 'follow-the-wet-track',
        label: 'رد چرخ‌ها را دنبال می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.serviceTrolley },
        effects: [
          { kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 },
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 1 },
        ],
      },
      {
        id: 'head-straight-to-the-door',
        label: 'بی‌اعتنا به سمت درِ فولادی می‌روم.',
        outcome: { type: 'transition', targetSceneId: S.corridorMid },
      },
    ],
  },
  {
    id: S.serviceTrolley,
    title: 'ترولیِ خالی',
    backgroundAssetId: 'service-corridor',
    narration: [
      'رد را تا پیچ راهرو دنبال می‌کنی. ترولی خالی گوشهٔ دیوار پارک شده و رویش یک ملافهٔ تاشده مانده. کسی که آن را هل داده، عجله داشته و بعد ناگهان کارش را رها کرده — یا صدایی شنیده، یا کسی را دیده.',
      'این ترولی می‌تواند کار یک خدمتکار باشد که شیفتش را جابه‌جا کرده، یا می‌تواند نشانهٔ چیزی باشد که در برنامه نیست. فرقش را نمی‌دانی، و ادامه دادن یعنی وقت گذاشتن روی چیزی که شاید هیچ باشد.',
    ],
    choices: [
      {
        id: 'keep-following-the-track',
        label: 'ادامه می‌دهم تا ببینم به کجا می‌رسد.',
        outcome: { type: 'transition', targetSceneId: S.corridorMid },
        effects: [
          { kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 },
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 1 },
        ],
      },
      {
        id: 'back-off-now',
        label: 'برمی‌گردم و مسیر خودم را می‌روم.',
        outcome: { type: 'transition', targetSceneId: S.corridorMid },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },

  // --------------------------------------------------- Act V: the threshold ---
  {
    id: S.corridorMid,
    title: 'چند قدم مانده به در',
    backgroundAssetId: 'door',
    narration: [
      'اینجا راهروی خدمه به دهلیز باریکی می‌رسد که یک سرش درِ فولادی انبار است. بوی روغن و گرد آهن دارد. این همان جایی است که در نقشه، همه‌چیز باید در آن جفت شود: در، شیفت، و هفده دقیقه‌ای که هیچ‌کس در راهرو نیست.',
      'کنار چارچوب در، روی گچ دیوار، چیزی حکاکی شده: دو حرف لاتین، K. F. خط‌ها قدیمی و لبه‌هایشان گرد شده، انگار سال‌ها پیش با تیغهٔ ساعت یا سوزن کنده شده باشند. هیچ توضیحی برایشان نیست؛ نه در نقشهٔ تو، نه در چیزی که تا حالا دیده‌ای.',
      'به هر حال، دو حرف می‌تواند حرف اول دو اسم باشد، یا دو حرف بی‌معنی از کسی که حوصلهٔ کشیدن یک نشانه را نداشته.',
    ],
    choices: [
      {
        id: 'look-at-the-scratches',
        label: 'کنار دیوار می‌ایستم و حروف را از نزدیک نگاه می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.lockedDoor },
        effects: [{ kind: 'discoverClue', clueId: CHAPTER1_CLUE.corridorInitials }],
      },
      {
        id: 'straight-to-the-door',
        label: 'نگاه نمی‌کنم و مستقیم سراغ در می‌روم.',
        outcome: { type: 'transition', targetSceneId: S.lockedDoor },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },
  {
    id: S.lockedDoor,
    title: 'درِ فولادی',
    backgroundAssetId: 'door',
    narration: [
      'قفل، همان قفلی است که شش ماه رویش حساب کرده‌ای: سه پیچ، زبانه‌ای که با فشار کنار می‌رود، و فرصتی به‌اندازهٔ نیم‌نفس. اما صدایش همیشه یک چیز است: اگر عجله کنی، فلز حرف می‌زند.',
      'پشت سرت، راهرو همان‌قدر خالی است که باید باشد. اگر امروز چیزی را دستکاری کرده باشی — میله، دفتر، یا صدای بلند — این خلوت بیشتر شبیه فاصله گرفتنِ نگهبان‌ها از چیزی است که در راه است.',
      'می‌توانی قفل را با همان تکه‌فلز باز کنی، به دنبال راهی جز این در بگردی، یا همین حالا به گوشهٔ امنی که از آن رد شدی برگردی و نقشه را برای زمانی دیگر نگه داری.',
    ],
    choices: [
      {
        id: 'pick-the-bolt',
        label: 'تکه‌فلز را زیر زبانه می‌برم.',
        condition: { kind: 'compareVariable', variable: 'planIntegrity', operator: 'gte', value: 1 },
        outcome: { type: 'transition', targetSceneId: S.doorAttempt },
      },
      {
        id: 'look-for-another-way',
        label: 'به دنبال راه دیگری می‌گردم.',
        condition: { kind: 'compareVariable', variable: 'routeKnowledge', operator: 'gte', value: 1 },
        outcome: { type: 'transition', targetSceneId: S.alternativeRoute },
      },
      {
        id: 'fall-back-to-the-safe-corner',
        label: 'به گوشهٔ امن برمی‌گردم و نقشه را عقب می‌اندازم.',
        condition: { kind: 'compareVariable', variable: 'planIntegrity', operator: 'gte', value: 1 },
        outcome: { type: 'transition', targetSceneId: S.corridorFirst },
        effects: [{ kind: 'incrementVariable', variable: 'planIntegrity', amount: -1 }],
      },
      {
        id: 'force-the-door',
        label: 'با شانه به در فشار می‌آورم.',
        outcome: { type: 'transition', targetSceneId: S.doorAttempt },
        effects: [
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 2 },
          { kind: 'incrementVariable', variable: 'planIntegrity', amount: -1 },
        ],
      },
    ],
  },
  {
    id: S.doorAttempt,
    title: 'صدای قدم‌ها',
    backgroundAssetId: 'door',
    timedDecision: { durationMs: 8000, defaultChoiceId: 'freeze-and-observe' },
    narration: [
      'زبانه زیر انگشتت است. یک فشار کوتاه دیگر و در باز می‌شود. همان لحظه، از انتهای راهرو صدای قدم‌هایی می‌آید که آهسته‌تر از ریتم همیشگی است؛ نگهبان شب، با چراغی که نور زردش روی دیوار می‌لغزد.',
      'اگر حالا دستت را حرکت بدهی، صدای فلز تا انتهای راهرو می‌رود و هیچ در بسته‌ای جلوی آن را نمی‌گیرد. اگر بی‌حرکت بمانی، چراغ از کنارت رد می‌شود و شاید چیزی نبیند. بین این دو، فقط چند ثانیه هست.',
    ],
    choices: [
      {
        id: 'freeze-and-observe',
        label: 'بی‌حرکت می‌مانم و تماشا می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.guardPass },
      },
      {
        id: 'press-the-pick',
        label: 'همین حالا فشار می‌دهم و در را باز می‌کنم.',
        outcome: { type: 'failure', failureId: CHAPTER1_FAILURE.caughtAtDoor },
        effects: [{ kind: 'incrementVariable', variable: 'guardSuspicion', amount: 1 }],
      },
      {
        id: 'slide-into-the-alcove',
        label: 'آرام به سمت فرورفتگی دیوار می‌لغزم.',
        condition: { kind: 'compareVariable', variable: 'guardSuspicion', operator: 'lte', value: 1 },
        outcome: { type: 'transition', targetSceneId: S.guardPass },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },
  {
    id: S.guardPass,
    title: 'چراغی که رد می‌شود',
    backgroundAssetId: 'door',
    narration: [
      'نگهبان چیزی نمی‌بیند. چراغ را روی قفل نمی‌گیرد، کنار در نمی‌ایستد؛ فقط رد می‌شود و صدای قدم‌هایش در پیچ راهرو محو می‌شود. زبانه هنوز نیمه‌باز است.',
      'اما در این فاصله اتفاقی افتاده که در نقشه نبود: نگهبان از سر راهرو برگشت و به سمت دیگری رفت. یعنی هفده دقیقهٔ تو حالا هفده دقیقه نیست؛ چیزی در ریتم جابه‌جا شده و تو نمی‌دانی چه.',
    ],
    choices: [
      {
        id: 'take-the-hatch',
        label: 'از دریچهٔ تعمیرات پایین دیوار می‌گذرم.',
        outcome: { type: 'transition', targetSceneId: S.recordsAlcove },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
      {
        id: 'wait-for-the-next-round',
        label: 'صبر می‌کنم تا گردش بعدی هم بگذرد و بعد حرکت می‌کنم.',
        condition: { kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 2 },
        outcome: { type: 'transition', targetSceneId: S.recordsAlcove },
        effects: [{ kind: 'incrementVariable', variable: 'guardSuspicion', amount: -1 }],
      },
    ],
  },
  {
    id: S.alternativeRoute,
    title: 'راهی که در نقشه نبود',
    backgroundAssetId: 'service-corridor',
    narration: [
      'چیزی که در برنامهٔ رسمی نیست، همیشه یک نقطهٔ ضعف است و همیشه یک راه. کانال تهویهٔ زیرزمین که غذاخوری را به اتاق بایگانی قدیم وصل می‌کند، در نقشه‌های بازرسی «بدون کاربرد» علامت خورده — و بی‌کاربردترین راه‌ها بهترین راه‌ها هستند.',
      'گرد و خاک و تنگی مسیر یعنی چند متری که باید روی شکم طی کنی و دعا کنی کسی سر دیگرش نایستاده باشد. اما اگر برسی، از پشتِ همان درِ فولادی بیرون می‌آیی، بدون آنکه قفلش را لمس کنی.',
    ],
    choices: [
      {
        id: 'crawl-through-the-vent',
        label: 'داخل کانال می‌خزم.',
        outcome: { type: 'transition', targetSceneId: S.recordsAlcove },
        effects: [
          { kind: 'incrementVariable', variable: 'planIntegrity', amount: -1 },
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },
];
