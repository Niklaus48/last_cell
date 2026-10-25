/**
 * Chapter 1 — Act I (six months of preparation), Act II (the stranger) and
 * Act III (leaving the cell).
 *
 * All text is narrator prose addressed to the player in the second person.
 * Character speech is quoted inside the narration; there are no dialogue
 * windows, no speaker labels and no first-person narrator.
 */
import type { SceneDefinition } from '../../engine';
import { CHAPTER1_CLUE, CHAPTER1_SCENE as S } from './ids';

export const onsetScenes: readonly SceneDefinition[] = [
  // ---------------------------------------------------------------- Act I ---
  {
    id: S.cellDawn,
    title: 'سلول ۱۴ — پیش از چهار و نیم',
    backgroundAssetId: 'cell-interior',
    narration: [
      'شش ماه است که صدای کلید را در این ساعت حفظ کرده‌ای؛ چهار و ده دقیقهٔ صبح، هر شب یک‌بار. امروز هم مثل همیشه می‌آید، و امروز دیگر مثل همیشه نیست.',
      'سلول ۱۴ سه قدم عرض دارد و پنج قدم طول. در این شش ماه هر وجبش را اندازه گرفته‌ای، تا جایی که در تاریکی هم می‌دانی کدام آجر کج نشسته است. پشت چشمت هنوز خواب دارد، اما بدن بیدار است: کتف‌ها را کشیده‌ای، نفس را سه بار شمرده‌ای و لبهٔ تکه‌فلزی را زیر بستر یک بار لمس کرده‌ای.',
      'نقشه ساده است و به همین دلیل شکننده: راهروی خدمه، درِ فولادی کنار انبار، و فاصلهٔ کوتاهی که میان تعویض شیفت و گردش نگهبان باز می‌شود. هر چیزی که تا حالا درست پیش رفته، به این بند بوده که هیچ‌کس از نقشه خبر نداشته باشد.',
      'تا غروب یا بیرون از آذرخش خواهی بود، یا دیگر فرصتی نخواهد بود. برای این چند دقیقهٔ آخر، تصمیم همیشگی‌ات را بگیر.',
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
        label: 'نقشه را در ذهن یک بار دیگر مرور می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.cellBar },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },
  {
    id: S.cellBar,
    title: 'میله‌ای که باید ساکت بماند',
    backgroundAssetId: 'cell-interior',
    narration: [
      'میلهٔ سمت راست دریچهٔ هوا، شش ماه پیش لق بود و حالا لق‌تر است. اگر با فشار یکنواخت و از پایین بلندش کنی، جا می‌افتد بی‌آنکه صدا بدهد. اگر عجله کنی، صدایش تا انتهای راهرو می‌رود و همه‌چیز تمام است.',
      'کف دستت را زیر میله گذاشته‌ای. فلز سرد است و عرق دستت رویش می‌ماند. یک بار دیگر می‌شود همه‌چیز را بادقت‌تر کرد؛ و یک بار دیگر می‌شود آن را به حال خودش گذاشت.',
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
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },
  {
    id: S.cellListen,
    title: 'ریتم راهرو',
    backgroundAssetId: 'cell-interior',
    narration: [
      'چشم‌ها را می‌بندی و گوش می‌دهی. قدم‌های نگهبان شب از انتهای راهرو می‌آید، می‌ایستد، برمی‌گردد. بین دو گردش، هفده دقیقه فاصله است؛ و در دقیقهٔ نهم، صدای دری در طبقهٔ پایین باز می‌شود که هیچ‌وقت در برنامه نیست.',
      'این هفده دقیقه، تنها سرمایهٔ واقعی توست. کسی که ریتم را بشناسد، لازم نیست بدود؛ فقط باید در جای درست بایستد.',
    ],
    choices: [
      {
        id: 'memorize-the-rhythm',
        label: 'هفده دقیقه و آن درِ بی‌برنامه را به خاطر می‌سپارم.',
        outcome: { type: 'transition', targetSceneId: S.strangerArrives },
        effects: [{ kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 }],
      },
      {
        id: 'go-back-to-the-bed',
        label: 'به تخت برمی‌گردم و ذهنم را خالی می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.strangerArrives },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },

  // --------------------------------------------------------------- Act II ---
  {
    id: S.strangerArrives,
    title: 'کسی که نام واقعی‌ات را می‌داند',
    backgroundAssetId: 'cell-interior',
    timedDecision: { durationMs: 12000, defaultChoiceId: 'stay-silent' },
    narration: [
      'صدایی از پشت در سلول می‌آید؛ نه از دریچه، از همان درِ بسته. مردی با لحنی آرام و بی‌شتاب، نام واقعی تو را می‌گوید: «کیان فرهمند.»',
      'در این شش ماه، هیچ‌کس در آذرخش این نام را به زبان نیاورده. همه اینجا تو را با شماره صدا می‌زنند. سایهٔ مرد پشت در می‌ایستد، انگار منتظر جواب نیست؛ منتظر تصمیم است. چند ثانیه سکوت می‌کند و بعد می‌گوید: «بالاخره روزش رسید، کیان.»',
      'ذهنت همزمان سه راه را می‌بیند و هیچ‌کدام امن نیست: نمی‌دانی او کیست، نمی‌دانی چقدر وقت داری، و نمی‌دانی چه چیزی را باید نشنیده بگیری.',
    ],
    choices: [
      {
        id: 'stay-silent',
        label: 'سکوت می‌کنم و هیچ نشانه‌ای نمی‌دهم.',
        outcome: { type: 'transition', targetSceneId: S.silence },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
      {
        id: 'ask-who-he-is',
        label: 'می‌پرسم که او کیست.',
        outcome: { type: 'transition', targetSceneId: S.strangerWho },
        effects: [
          { kind: 'incrementVariable', variable: 'strangerContact', amount: 1 },
          { kind: 'incrementVariable', variable: 'strangerKnowledge', amount: 1 },
        ],
      },
      {
        id: 'threaten-him',
        label: 'تهدیدش می‌کنم و توضیح می‌خواهم.',
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
      'جواب نمی‌دهی. نه اسمی، نه نفسی، نه تکان سر. فقط به دیوار روبرو نگاه می‌کنی و می‌گذاری ثانیه‌ها از کنارت رد شوند.',
      'مرد پشت در هم چیزی اضافه نمی‌کند. چند لحظه می‌ماند، انگار در سکوت چیزی را می‌سنجد، و بعد فقط می‌گوید: «باشد.» قدم‌هایش دور می‌شوند و راهرو به همان خالیِ همیشگی برمی‌گردد.',
      'هیچ نمی‌دانی. نه اسمی شنیدی، نه ادعایی، نه نشانی؛ فقط این را می‌دانی که کسی هست که نام تو را می‌داند و آن را در این ساختمان به زبان آورده. تا وقتی در را باز نکنی، همین اندازه کافی است و همین اندازه هم بی‌فایده.',
    ],
    choices: [
      {
        id: 'wait-for-the-steps-to-fade',
        label: 'صبر می‌کنم تا صدای قدم‌ها محو شود.',
        outcome: { type: 'transition', targetSceneId: S.leavingCell },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },
  {
    id: S.strangerWho,
    title: 'نامی که جواب نمی‌دهد',
    backgroundAssetId: 'cell-interior',
    narration: [
      'می‌پرسی که او کیست. جواب نمی‌دهد؛ ولی انکار هم نمی‌کند. می‌گوید: «اسم من چیزی را عوض نمی‌کند. مهم این است که تو شب بیست‌ویکم اینجا نبودی — و می‌دانی که نبودی.»',
      'بیست‌ویکم. هشت سال پیش، شبی که پرونده‌اش در یک جمله بسته شد. کسی که این را می‌داند، یا آن شب آنجا بوده، یا پرونده را خوانده است. هیچ‌کدامش خبر خوبی نیست.',
      'مرد اضافه می‌کند: «من الان نمی‌خواهم چیزی از تو بگیرم. فقط بدان که اگر امروز قدمی برداری، شمرده‌تر بردار.» بعد صدایش پایین می‌آید، مثل کسی که سرش را برگردانده: «من دوباره سر راهت هستم.»',
    ],
    choices: [
      {
        id: 'press-for-a-name',
        label: 'جلوتر می‌روم و تا نامش را نگوید رهایش نمی‌کنم.',
        condition: { kind: 'compareVariable', variable: 'composure', operator: 'gte', value: 2 },
        outcome: { type: 'transition', targetSceneId: S.leavingCell },
        effects: [
          { kind: 'incrementVariable', variable: 'strangerKnowledge', amount: 1 },
          { kind: 'incrementVariable', variable: 'guardSuspicion', amount: 1 },
        ],
      },
      {
        id: 'say-nothing-more',
        label: 'چیزی نمی‌گویم و می‌گذارم برود.',
        outcome: { type: 'transition', targetSceneId: S.leavingCell },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },
  {
    id: S.strangerThreat,
    title: 'صدای بلندی که نباید بلند می‌شد',
    backgroundAssetId: 'cell-interior',
    narration: [
      'به سمت در می‌روی و بلندتر از آنچه باید، می‌گویی که اگر یک کلمهٔ دیگر بشنوی، هرچه هست را سرش می‌آوری. لحنت مثل تهدید است و خودت هم می‌دانی که در این ساختمان، تهدید بی‌سند فقط سروصداست.',
      'مرد نمی‌ترسد. حتی یک قدم عقب نمی‌رود. فقط می‌گوید: «صدایت را شنیدند. حالا بیشتر از من به تو ضرر زد.»',
      'در انتهای راهرو، قدم‌هایی می‌ایستد و بعد با تردید ادامه می‌دهد. نگهبان شب پشت همان دیوار است که سال‌ها در برابر هر صدایی سکوت کرده؛ اما امروز یک قدم از ریتمش بیرون زد.',
    ],
    choices: [
      {
        id: 'lower-your-voice',
        label: 'صدایم را پایین می‌آورم و به دیوار تکیه می‌دهم.',
        outcome: { type: 'transition', targetSceneId: S.leavingCell },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
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

  // -------------------------------------------------------------- Act III ---
  {
    id: S.leavingCell,
    title: 'آستانهٔ سلول',
    backgroundAssetId: 'cell-interior',
    narration: [
      'دستت روی میلهٔ دریچه است و شمارش در سرت شروع شده: سه نفس، بعد فشار، بعد هیچ صدایی. شش ماه تمرین همین یک حرکت بوده و حالا باید در تاریکی و بی‌تماشاچی انجامش دهی.',
      'در آستانهٔ در، یک لحظه می‌ایستی. چیزی هست که از دیشب آزارت می‌دهد: مردی نام واقعی تو را می‌دانست و تو حتی صورتش را ندیدی. اگر نقشه درست باشد، همین حالا باید راه بیفتی. اگر نقشه درست نباشد، هر ثانیه‌ای که اینجا بایستی، ثانیه‌ای است که کسی برایش حساب باز کرده.',
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
      'زیر تخت، صفحهٔ سیمانی سمت دیوار لق است؛ شش ماه پیش هم لق بود و تو هرگز زیرش را نگاه نکرده‌ای، چون هیچ‌وقت چیزی برای پنهان‌کردن نداشتی که مال تو نباشد.',
      'حالا صفحه را کنار می‌زنی. گرد و خاک، یک قوطی خالی، و لای درز، برگه‌ای تاشده که گوشه‌اش زرد شده است. جای انگشت روی تای برگه مانده؛ این برگه یک بار با عجله پنهان شده، نه با دقت.',
    ],
    choices: [
      {
        id: 'pull-the-note',
        label: 'برگه را بیرون می‌کشم و باز می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.note },
        effects: [{ kind: 'discoverClue', clueId: CHAPTER1_CLUE.datedNote }],
      },
      {
        id: 'leave-it-where-it-is',
        label: 'دست نمی‌زنم؛ این مال من نیست و وقت ندارم.',
        outcome: { type: 'transition', targetSceneId: S.corridorFirst },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },
  {
    id: S.note,
    title: 'یادداشت ۱۴ مهر',
    backgroundAssetId: 'cell-interior',
    narration: [
      'برگه دو خط دارد و هر دو خط با خودکار آبی نوشته شده‌اند. خط اول: «اگر او را منتقل کردند، گزارش را تغییر نده.» خط دوم فقط یک شمارهٔ ارجاع است: ۴۱۷-ب. بالای برگه، با همان خودکار، تاریخ خورده: ۱۴ مهر.',
      'نه سالی روی برگه هست، نه امضایی. «او» می‌تواند هرکسی باشد؛ «گزارش» می‌تواند هر گزارشی. تنها چیزی که این برگه قطعی می‌کند این است که یک نفر، در یک روز مشخص، از انتقال کسی و از تغییر دادن گزارشی می‌نوشته — و آن برگه را زیر صفحهٔ سلول تو پنهان کرده است.',
      'این برگه هیچ‌کس را زنده نمی‌کند. اما شماره‌ای دارد، و شماره‌ها در ساختمانی که همه‌چیزش پرونده دارد، به جایی می‌رسند.',
    ],
    choices: [
      {
        id: 'fold-it-into-your-sleeve',
        label: 'تا می‌کنم و در آستینم پنهانش می‌کنم.',
        outcome: { type: 'transition', targetSceneId: S.corridorFirst },
        effects: [{ kind: 'incrementVariable', variable: 'routeKnowledge', amount: 1 }],
      },
      {
        id: 'memorize-and-leave-it',
        label: 'شماره را حفظ می‌کنم و برگه را سر جایش می‌گذارم.',
        outcome: { type: 'transition', targetSceneId: S.corridorFirst },
        effects: [{ kind: 'incrementVariable', variable: 'composure', amount: 1 }],
      },
    ],
  },
  {
    id: S.corridorFirst,
    title: 'گوشهٔ امن راهرو',
    backgroundAssetId: 'corridor',
    narration: [
      'راهرو سردتر از سلول است و بوی گَرد و فلز دارد. در گوشهٔ پشت ستون، جایی که دوربین قدیمی سال‌هاست خاموش است، می‌ایستی و نفس می‌گیری. اینجا نخستین نقطه‌ای است که می‌توانی بگویی از سلول بیرون آمده‌ای.',
      'دو راه پیش رو داری و هیچ‌کدام بی‌هزینه نیست. سمت چپ، نور زیر درِ دفتر نگهبانی می‌تابد و صدای دو مرد از آن‌سو می‌آید. سمت راست، راهروی خدمه است که غذاخوری و انبار را به هم وصل می‌کند و در این ساعت باید خالی باشد.',
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
];
