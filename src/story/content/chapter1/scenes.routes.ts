/**
 * Chapter 1 — Act II: the corridor, the office, the service route and the
 * steel door.
 *
 * This is where state actually bites. Suspicion decides whether a passing torch
 * simply moves on or stops; composure decides whether Kian can wait a scene out;
 * route knowledge decides whether the map he spent six months memorising is the
 * only way through; and plan integrity decides how many retreats are left.
 */
import type { SceneDefinition } from '../../engine';
import { CHAPTER1_CLUE as C, CHAPTER1_FAILURE, CHAPTER1_SCENE as S } from './ids';

export const routeScenes: readonly SceneDefinition[] = [
  {
    id: S.corridorFirst,
    title: 'گوشهٔ امن راهرو',
    backgroundAssetId: 'corridor',
    narration: [
      'کف راهرو از سلول سردتر است. کیان پشت ستون ترک‌خورده می‌ایستد و گوش می‌دهد. دوربین قدیمی بالای سرش از کار افتاده، اما می‌داند نبودن نور قرمز همیشه به معنی خاموش بودن دستگاه نیست.',
      'سمت چپ نور زردی از دفتر نگهبانی بیرون می‌ریزد. سمت راست مسیر خدمه به غذاخوری و انبار می‌رسد. راه چپ شاید اطلاعاتی داشته باشد که به دردش بخورد؛ راه راست به نقشهٔ اصلی نزدیک‌تر است. برای اولین بار پس از شش ماه، خودش باید بدون امکان تمرین انتخاب کند.',
    ],
    choices: [
      {
        id: 'take-the-office-way',
        label: 'سمت چپ؛ به سمت دفتر نگهبانی می‌روم.',
        outcome: { type: 'transition', targetSceneId: S.officeEntry },
      },
      {
        id: 'take-the-service-way',
        label: 'سمت راست؛ از راهروی خدمه می‌روم.',
        outcome: { type: 'transition', targetSceneId: S.cafeteria },
      },
    ],
  },

  {
    id: S.officeEntry,
    title: 'زیر درِ دفتر نگهبانی',
    backgroundAssetId: 'office',
    narration: [
      'دو نفر پشت در دفتر با صدای پایین دربارهٔ فهرست انتقال بحث می‌کنند. از لابه‌لای جمله‌های بریده، کیان می‌فهمد نامی از فهرست حذف شده و یکی از آن‌ها ترجیح می‌دهد این حذف اصلاً ثبت نشود.',
      'صدای کشیده شدن صندلی روی زمین، او را به دیوار می‌چسباند. اگر بیشتر بماند ممکن است چیزی بفهمد، اما اگر در باز شود جایی برای پنهان شدن ندارد.',
    ],
    choices: [
      {
        id: 'listen-at-the-door',
        label: 'می‌ایستم و تا آخرین کلمه گوش می‌دهم.',
        outcome: { type: 'transition', targetSceneId: S.officeOverheard },
        effects: [
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 1 },
        ],
      },
      {
        id: 'slip-past-the-door',
        label: 'بی‌صدا از کنار در می‌گذرم.',
        outcome: { type: 'transition', targetSceneId: S.officeDesk },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.officeOverheard,
    title: 'دو نگهبان پشت دیوار',
    backgroundAssetId: 'office',
    narration: [
      'کیان از پشت در می‌فهمد که قرار است دفتر انتقال دوباره بررسی شود. یکی از نگهبان‌ها دربارهٔ نامی حرف می‌زند که در فهرست امشب نیست؛ دیگری مدام به ساعت نگاه می‌کند.',
      'صدای کناررفتن صندلی به گوش می‌رسد. اگر کیان همین حالا وارد شود، ممکن است درست با یکی از آن دو روبه‌رو شود. عقب کشیدن هم یعنی از دست دادن فرصت دیدن دفتر.',
    ],
    choices: [
      {
        id: 'wait-for-office-clear',
        label: 'تا آرام‌شدن دفتر صبر کند.',
        outcome: { type: 'transition', targetSceneId: S.officeDesk },
        condition: { kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 3 },
        effects: [
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: -1 },
        ],
      },
      {
        id: 'risk-office-entry',
        label: 'با پذیرفتن خطر وارد شود.',
        outcome: { type: 'transition', targetSceneId: S.officeDesk },
        effects: [
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.officeDesk,
    title: 'میزِ خالی',
    backgroundAssetId: 'office',
    narration: [
      'اتاق بوی چای مانده و کاغذ نم‌کشیده می‌دهد. دفتر انتقال روی میز باز است و کنار آن پوشه‌ای بی‌برچسب دیده می‌شود. کیان پشت در چند لحظه منتظر می‌ماند تا مطمئن شود کسی برنمی‌گردد.',
      'روی دفتر ردیف‌های نام، تاریخ و مقصد دیده می‌شود. بررسی آن زمان می‌برد و هر صفحهٔ جابه‌جا‌شده ممکن است بعداً سؤال درست کند. او هنوز می‌تواند بی‌سروصدا از این اتاق بگذرد.',
    ],
    choices: [
      {
        id: 'read-the-transfer-ledger',
        label: 'دفتر انتقال را ورق می‌زنم.',
        outcome: { type: 'transition', targetSceneId: S.officeLedger },
        effects: [
          { kind: 'discoverClue', clueId: C.officeRecordDiscrepancy },
        ],
      },
      {
        id: 'memorize-the-room-and-go',
        label: 'فقط چیدمان اتاق را به خاطر می‌سپرم و بیرون می‌روم.',
        outcome: { type: 'transition', targetSceneId: S.corridorMid },
        effects: [
          { kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.officeLedger,
    title: 'سطری که نام ندارد',
    backgroundAssetId: 'office',
    narration: [
      'میان سطرهای مرتب دفتر، یک جای خالی توجه کیان را جلب می‌کند. در تاریخ چهاردهم مهر، نام مقصد ثبت نشده و تنها شمارهٔ ۴۱۷-ب باقی مانده است. کنار آن، حاشیه‌ای مدادی از جابه‌جایی برنامهٔ شیفت خبر می‌دهد.',
      'اگر کیان یادداشت سلول را دیده باشد، شماره آشناست. در غیر این صورت، فعلاً فقط ثبت ناقصی است که به بقیهٔ سطرها شباهت ندارد. پوشهٔ بی‌برچسب همچنان کنار دست اوست؛ برداشتن یکی از برگه‌هایش آسان است، پنهان ماندن این کار نه.',
    ],
    choices: [
      {
        id: 'compare-with-a-number-you-know',
        label: 'شمارهٔ ارجاع را با شماره‌ای که می‌شناسم مقایسه می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.contradictionOffice },
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'clueDiscovered', clueId: C.officeRecordDiscrepancy },
            { kind: 'clueDiscovered', clueId: C.datedNote },
          ],
        },
        effects: [
          { kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 },
          { kind: 'discoverClue', clueId: C.deathRecordContradiction },
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
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.contradictionOffice,
    title: 'دو تاریخی که با هم نمی‌خوانند',
    backgroundAssetId: 'office',
    narration: [
      'کیان شمارهٔ ارجاع را تا قفسهٔ پرونده‌های قدیمی دنبال می‌کند. گزارشی با همان شماره پیدا می‌شود: تاریخ مرگ، دوازدهم مهر؛ ثبت انتقال، چهاردهم مهر. در این ترتیب، کسی ظاهراً دو روز بعد از مرگش منتقل شده است.',
      'او وسوسه می‌شود نتیجه بگیرد که مرگ ساختگی بوده، اما خودش را نگه می‌دارد. یک اشتباه اداری هم می‌تواند همین ظاهر را بسازد. با این حال، اثر پاک‌کردن امضای پایین گزارش معمولی نیست. کسی برای ناخوانا شدنش زحمت کشیده است.',
    ],
    choices: [
      {
        id: 'study-the-erased-signature',
        label: 'جای امضای پاک‌شده را با دقت نگاه می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.corridorMid },
        effects: [
          { kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 },
        ],
      },
      {
        id: 'close-it-and-move',
        label: 'پرونده را می‌بندم و برمی‌گردم به راهرو.',
        outcome: { type: 'transition', targetSceneId: S.corridorMid },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.cafeteria,
    title: 'غذاخوری خالی',
    backgroundAssetId: 'cafeteria',
    narration: [
      'غذاخوری خالی است. روی میزها لکه‌های خشک‌شده مانده و یکی از صندلی‌ها کج زیر میز گیر کرده است. کیان از کنار پنجرهٔ مات عبور می‌کند تا از راهرو دیده نشود.',
      'برنامهٔ هفتگی روی دیوار چند بار پاک و دوباره نوشته شده. کنار یکی از ساعت‌ها شمارهٔ ۹۲۰-۴ به چشم می‌خورد؛ عددی که به فهرست وعده‌های غذایی شباهت ندارد. شاید سرنخ باشد، شاید یادداشت یکی از کارگرها. برای بررسی آن باید چند ثانیه در روشن‌ترین نقطهٔ اتاق بایستد.',
    ],
    choices: [
      {
        id: 'study-the-board',
        label: 'می‌ایستم و برنامهٔ دستکاری‌شده را می‌خوانم.',
        outcome: { type: 'transition', targetSceneId: S.serviceEntry },
        effects: [
          { kind: 'discoverClue', clueId: C.scheduleReference },
          { kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 },
        ],
      },
      {
        id: 'cross-to-the-service-door',
        label: 'رد می‌شوم و به راهروی خدمه می‌رسم.',
        outcome: { type: 'transition', targetSceneId: S.serviceEntry },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.serviceEntry,
    title: 'راهروی خدمه',
    backgroundAssetId: 'service-corridor',
    narration: [
      'بوی شوینده و رطوبت از راهروی خدمه بالا می‌آید. روی کف، رد باریک چرخ‌هایی مانده که از سمت انبار گذشته‌اند. رد تازه است؛ آب در شیار میان کاشی‌ها هنوز جمع نشده.',
      'طبق برنامه‌ای که کیان از حفظ است، تا پنج و نیم نباید کسی این مسیر را طی کند. حضور یک ترولی در این ساعت می‌تواند تصادفی باشد، اما برای کسی که فرارش به خلوت راهرو وابسته است، اتفاق کوچکی نیست.',
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
      'ترولی در پیچ راهرو رها شده است. یک ملحفهٔ تمیز روی دسته‌اش افتاده و یکی از چرخ‌ها هنوز روی لکهٔ آب ایستاده. کیان به انتهای مسیر نگاه می‌کند، اما کسی آنجا نیست.',
      'چیزی در این تصویر جور درنمی‌آید. کسی که ترولی را آورده یا مجبور شده ناگهان برگردد، یا نمی‌خواسته با آن جلوتر برود. ادامه دادن شاید اطلاعات بیشتری بدهد و شاید فقط کیان را از زمان‌بندی خودش عقب بیندازد.',
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
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.corridorMid,
    title: 'چند قدم مانده به در',
    backgroundAssetId: 'door',
    narration: [
      'دهلیز جلوی در فولادی ساکت است. کیان این نقطه را روی نقشه با یک خط قرمز مشخص کرده بود؛ جایی که اگر دیر برسد، همهٔ مسیر بی‌فایده می‌شود.',
      'کنار چارچوب، روی گچ ترک‌خورده دو حرف لاتین حک شده: K. F. لبهٔ خراش‌ها صاف شده و پیداست نوشته تازه نیست. حروف می‌توانند تصادفی باشند، اما دیدن حروف اول نام خودش در این نقطه باعث می‌شود برای لحظه‌ای حرکتش را فراموش کند.',
    ],
    choices: [
      {
        id: 'look-at-the-scratches',
        label: 'کنار دیوار می‌ایستم و حروف را از نزدیک نگاه می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.lockedDoor },
        effects: [
          { kind: 'discoverClue', clueId: C.corridorInitials },
        ],
      },
      {
        id: 'straight-to-the-door',
        label: 'نگاه نمی‌کنم و مستقیم سراغ در می‌روم.',
        outcome: { type: 'transition', targetSceneId: S.lockedDoor },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.lockedDoor,
    title: 'درِ فولادی',
    backgroundAssetId: 'door',
    narration: [
      'در فولادی همان‌طور است که کیان انتظار داشت: سنگین، زنگ‌زده و با قفلی که زبانه‌اش اندکی لق می‌زند. تکه‌فلزی را که از سلول آورده میان انگشت‌ها جابه‌جا می‌کند.',
      'چیزی در ساختمان تغییر کرده است؛ صدای ترولی، رفتار نگهبان یا حرف‌های غریبه. با این حال هنوز می‌تواند طبق نقشه پیش برود. راه دیگری هم ممکن است وجود داشته باشد، اگر از مسیرهای فرعی چیزی یاد گرفته باشد. برگشتن نیز ممکن است، اما هر بار عقب‌نشینی از فرصتی که برایش ماه‌ها زحمت کشیده کم می‌کند.',
    ],
    choices: [
      {
        id: 'pick-the-bolt',
        label: 'تکه‌فلز را زیر زبانه می‌برم.',
        outcome: { type: 'transition', targetSceneId: S.doorAttempt },
        condition: { kind: 'compareVariable', variable: 'planIntegrity', operator: 'gte', value: 1 },
      },
      {
        id: 'look-for-another-way',
        label: 'به دنبال راه دیگری می‌گردم.',
        outcome: { type: 'transition', targetSceneId: S.alternativeRoute },
        condition: { kind: 'compareVariable', variable: 'routeKnowledge', operator: 'gte', value: 2 },
      },
      {
        id: 'fall-back-to-the-safe-corner',
        label: 'به گوشهٔ امن برمی‌گردم و نقشه را عقب می‌اندازم.',
        outcome: { type: 'transition', targetSceneId: S.corridorFirst },
        condition: { kind: 'compareVariable', variable: 'planIntegrity', operator: 'gte', value: 1 },
        effects: [
          { kind: 'incrementVariable', variable: 'planIntegrity', amount: -1 },
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 1 },
        ],
      },
      {
        id: 'force-the-door',
        label: 'با شانه به در فشار می‌آورم.',
        outcome: { type: 'transition', targetSceneId: S.forcedDoorNoise },
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
    narration: [
      'فلز زیر فشار انگشت کیان آرام جابه‌جا می‌شود. فقط یک حرکت دیگر باقی مانده که صدای کفشی از انتهای راهرو بلند می‌شود؛ آرام‌تر از گردش‌های معمول.',
      'نور چراغ‌قوه روی دیوار می‌لغزد. کیان می‌تواند همان‌جا بی‌حرکت بماند یا خطر کند و کار را تمام کند. در این فاصلهٔ کوتاه، حتی صدای نفس کشیدنش هم به نظرش بلند می‌رسد.',
    ],
    timedDecision: {
      durationMs: 8000,
      defaultChoiceId: 'freeze-and-observe',
    },
    choices: [
      {
        id: 'freeze-quiet',
        label: 'بی‌حرکت بماند و اجازه دهد نگهبان بگذرد.',
        outcome: { type: 'transition', targetSceneId: S.guardPass },
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'compareVariable', variable: 'guardSuspicion', operator: 'lte', value: 1 },
            { kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 2 },
          ],
        },
      },
      {
        id: 'freeze-under-watch',
        label: 'بی‌حرکت بماند، حتی اگر نگهبان مشکوک شده باشد.',
        outcome: { type: 'transition', targetSceneId: S.guardSearch },
        condition: { kind: 'compareVariable', variable: 'guardSuspicion', operator: 'gte', value: 2 },
      },
      {
        id: 'press-the-pick',
        label: 'همین حالا زبانه را فشار دهد.',
        outcome: { type: 'failure', failureId: CHAPTER1_FAILURE.caughtAtDoor },
        effects: [
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 1 },
          { kind: 'incrementVariable', variable: 'criticalMistakes', amount: 1 },
        ],
      },
      {
        id: 'slide-into-the-alcove',
        label: 'به فرورفتگی تاریک دیوار پناه ببرد.',
        outcome: { type: 'transition', targetSceneId: S.guardPass },
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'compareVariable', variable: 'guardSuspicion', operator: 'lte', value: 1 },
            { kind: 'compareVariable', variable: 'routeKnowledge', operator: 'gte', value: 1 },
          ],
        },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
      {
        id: 'freeze-and-observe',
        label: 'سر جایش بماند و راه فرار را در ذهن پیدا کند.',
        outcome: { type: 'transition', targetSceneId: S.guardSearch },
      },
    ],
  },

  {
    id: S.guardPass,
    title: 'چراغی که رد می‌شود',
    backgroundAssetId: 'door',
    narration: [
      'نگهبان از کنار دهلیز می‌گذرد. نور چراغ‌قوه روی لبهٔ در می‌افتد اما متوقف نمی‌شود. کیان تا ناپدید شدن قدم‌ها حرکت نمی‌کند.',
      'چند ثانیه بعد متوجه می‌شود مسیر نگهبان با برنامهٔ همیشگی فرق کرده است. به‌جای برگشتن به سر راهرو، به پله‌های پایین رفته. این تغییر می‌تواند فرصتی تازه باشد یا علامت اینکه کسی منتظر اوست. دریچهٔ تعمیرات نزدیک زمین راهی برای ادامه می‌دهد.',
    ],
    choices: [
      {
        id: 'take-the-hatch',
        label: 'از دریچهٔ تعمیرات پایین دیوار می‌گذرم.',
        outcome: { type: 'transition', targetSceneId: S.recordsAlcove },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: 1 },
        ],
      },
      {
        id: 'wait-for-the-next-round',
        label: 'صبر می‌کنم تا گردش بعدی هم بگذرد و بعد حرکت می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.recordsAlcove },
        condition: { kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 2 },
        effects: [
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: -1 },
        ],
      },
    ],
  },

  {
    id: S.guardSearch,
    title: 'نور روی دیوار',
    backgroundAssetId: 'door',
    narration: [
      'نگهبان این بار بی‌تفاوت عبور نمی‌کند. نور چراغش روی چارچوب می‌ماند، بعد آهسته روی زمین حرکت می‌کند. کیان برای نخستین بار می‌فهمد که نقشهٔ شش‌ماهه‌اش دیگر تنها چیزی نیست که این راهرو را کنترل می‌کند.',
      'یک پیچ باریک در سمت چپ هست؛ برای کسی که ساختمان را شناخته، راه فرار محسوب می‌شود. برای بقیه فقط بن‌بستی تاریک است.',
    ],
    choices: [
      {
        id: 'search-use-route',
        label: 'با استفاده از شناخت مسیر، از کنار انبار دور بزند.',
        outcome: { type: 'transition', targetSceneId: S.alternativeRoute },
        condition: { kind: 'compareVariable', variable: 'routeKnowledge', operator: 'gte', value: 2 },
        effects: [
          { kind: 'incrementVariable', variable: 'planIntegrity', amount: -1 },
        ],
      },
      {
        id: 'search-steady',
        label: 'با صبر، از دید چراغ دور بماند.',
        outcome: { type: 'transition', targetSceneId: S.guardPass },
        condition: {
          kind: 'all',
          conditions: [
            { kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 4 },
            { kind: 'compareVariable', variable: 'guardSuspicion', operator: 'lte', value: 3 },
          ],
        },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: -1 },
        ],
      },
      {
        id: 'search-caught',
        label: 'عجولانه از پشت چارچوب حرکت کند.',
        outcome: { type: 'failure', failureId: CHAPTER1_FAILURE.caughtAtDoor },
        effects: [
          { kind: 'incrementVariable', variable: 'criticalMistakes', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.forcedDoorNoise,
    title: 'ضربه‌ای در سکوت',
    backgroundAssetId: 'door',
    narration: [
      'کیان شانه‌اش را به فلز می‌کوبد. صدا در دهلیز می‌پیچد و درد تا بازویش می‌رود. قفل تکان خورده، اما در هنوز بسته است.',
      'در انتهای راهرو، نوری روی دیوار می‌لغزد. این صدا دیگر قابل پس‌گرفتن نیست. تنها فرصت، تصمیمی است که قبل از رسیدن نگهبان می‌گیرد.',
    ],
    choices: [
      {
        id: 'forced-hide',
        label: 'از در فاصله بگیرد و در تاریکی پنهان شود.',
        outcome: { type: 'transition', targetSceneId: S.guardSearch },
        effects: [
          { kind: 'incrementVariable', variable: 'composure', amount: -1 },
        ],
      },
      {
        id: 'forced-retreat',
        label: 'از راهروی فرعی عقب بکشد.',
        outcome: { type: 'transition', targetSceneId: S.alternativeRoute },
        condition: { kind: 'compareVariable', variable: 'routeKnowledge', operator: 'gte', value: 2 },
        effects: [
          { kind: 'incrementVariable', variable: 'planIntegrity', amount: -1 },
        ],
      },
      {
        id: 'forced-press',
        label: 'با وجود صدا دوباره به در فشار بیاورد.',
        outcome: { type: 'transition', targetSceneId: S.doorAttempt },
        effects: [
          { kind: 'incrementVariable', variable: 'criticalMistakes', amount: 1 },
        ],
      },
    ],
  },

  {
    id: S.alternativeRoute,
    title: 'راهی که در نقشه نبود',
    backgroundAssetId: 'service-corridor',
    narration: [
      'کیان با نشانه‌هایی که در راهرو دیده، دریچهٔ قدیمی تهویه را پیدا می‌کند. راهی باریک به بایگانی منتهی می‌شود؛ نه مسیری که در نقشهٔ اولش بوده و نه گذرگاهی بدون خطر.',
      'باید از میان گردوغبار و تکه‌های فلز عبور کند. این انتخاب بخشی از نقشهٔ اصلی را بی‌استفاده می‌کند، اما او را از دید مستقیم نگهبان دور می‌برد.',
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
