/**
 * Chapter 1 — the ways this attempt can end badly.
 *
 * A failure is never a sudden overlay. Each of these scenes is played like any
 * other: the mistake is visible, the guards react, the attempt ends, and only
 * then does the result screen name the cause. The player reads what happened
 * before being offered a way out — a rewind of the attempt (checkpoint), or a
 * new run.
 *
 * Two of the three are recoverable: Kian is caught, the attempt is spent, and
 * the chapter can be replayed from a checkpoint. The third is fatal: he does not
 * come back to Cell 14 in this attempt at all, and the only honest offer is to
 * rewind to before the run into the corridor — never a physical rescue.
 */
import type { SceneDefinition } from '../../engine';
import { CHAPTER1_FAILURE, CHAPTER1_SCENE as S } from './ids';

export const failureScenes: readonly SceneDefinition[] = [
  {
    id: S.failDoorDetected,
    title: 'صدایی که نمی‌شد پس گرفت',
    backgroundAssetId: 'door',
    narration: [
      'کیان زبانه را زودتر از موعد فشار می‌دهد. تکه‌فلز از جا می‌پرد و با صدایی تیز به چارچوب می‌خورد. انتهای راهرو، قدم‌های نگهبان قطع می‌شود. این همان صدایی است که شش ماه تلاش کرده بود کسی نشنود.',
      'چراغ‌قوه به سمت قفل برمی‌گردد. کیان می‌خواهد خودش را به فرورفتگی دیوار برساند، اما نور پیش از او روی دستش می‌افتد. نگهبان متوجه قفل دستکاری‌شده می‌شود و با بی‌سیم درخواست کمک می‌کند.',
    ],
    choices: [
      {
        id: 'failure-door-continue',
        label: 'عقب می‌کشم؛ شاید هنوز راه برگشتی باشد.',
        outcome: { type: 'transition', targetSceneId: S.failDoorCaptured },
      },
    ],
  },

  {
    id: S.failDoorCaptured,
    title: 'بازگشت به سلول چهارده',
    backgroundAssetId: 'corridor',
    narration: [
      'کیان هنوز دو قدم برنداشته که نگهبان دوم از پیچ راهرو پیدایش می‌شود. راه پشت سر بسته است. مقاومت کردن فقط دست‌هایش را زخمی‌تر می‌کند. چند لحظه بعد، با مچ‌های بسته از همان راهی برگردانده می‌شود که خیال می‌کرد برای همیشه پشت سر گذاشته است.',
      'در سلول ۱۴ با صدای سنگینی بسته می‌شود. نگهبان‌ها تکه‌فلز را برده‌اند و دریچهٔ هوا را بررسی می‌کنند. فرار به خاطر یک لحظه عجله شکست خورده؛ نه به خاطر بدشانسی. کیان روی تخت می‌نشیند و به جای خالی ابزار زیر تشک نگاه می‌کند.',
    ],
    choices: [
      {
        id: 'failure-door-result',
        label: 'نتیجهٔ این تلاش را ببینم.',
        outcome: { type: 'failure', failureId: CHAPTER1_FAILURE.caughtAtDoor },
      },
    ],
  },

  {
    id: S.failOfficeExposed,
    title: 'جای خالی برگه',
    backgroundAssetId: 'office',
    narration: [
      'کیان برگه را از پوشه بیرون می‌کشد؛ اما رد کاغذ روی میز و گیرهٔ بازمانده، جای خالی آن را آشکار می‌کند. هنوز به در نرسیده که صدای برگشتن یکی از نگهبان‌ها را می‌شنود.',
      'مرد مقابل دفتر می‌ایستد. نگاهش از پوشه به دست کیان می‌رود. کیان برگه را پنهان می‌کند، ولی دیر شده است. نگهبان با بی‌سیم به همکارش خبر می‌دهد که یک زندانی وارد دفتر شده است.',
    ],
    choices: [
      {
        id: 'failure-office-continue',
        label: 'به سمت خروجی عقب می‌کشم.',
        outcome: { type: 'transition', targetSceneId: S.failOfficeCaptured },
      },
    ],
  },

  {
    id: S.failOfficeCaptured,
    title: 'بازجویی کوتاه',
    backgroundAssetId: 'office',
    narration: [
      'راه خروج پیش از رسیدن کیان به چارچوب بسته می‌شود. نگهبان‌ها برگه را پس می‌گیرند و او را به اتاق بازرسی می‌برند. زیر نور سفید، مجبور می‌شود چند بار دست‌های خالی‌اش را روی میز بگذارد. هیچ توضیحی برای حضورش در دفتر پذیرفته نمی‌شود.',
      'نزدیک صبح او را به سلول برمی‌گردانند. فرصت رسیدن به راهروی خدمه از دست رفته و دفتر انتقال حالا زیر نظر است. کیان می‌فهمد برداشتن مدرک، بدون فکر کردن به جای خالی آن، چطور تمام نقشه را لو داده است.',
    ],
    choices: [
      {
        id: 'failure-office-result',
        label: 'نتیجهٔ این تلاش را ببینم.',
        outcome: { type: 'failure', failureId: CHAPTER1_FAILURE.officeAlarm },
      },
    ],
  },

  {
    id: S.failFatalWarning,
    title: 'فرار زیر نور مسلسل',
    backgroundAssetId: 'door',
    narration: [
      'ضربهٔ دوم صدای هشدار را در راهرو بیدار می‌کند. نگهبان پشت پیچ سلاحش را بالا می‌آورد. فاصله تا او کوتاه است و هیچ پوششی میانشان نیست. کیان می‌داند اگر همین حالا به سمت درِ نگهبانی بدود، در تیررس مستقیم قرار می‌گیرد.',
      'با این حال تصمیم می‌گیرد به جای تسلیم شدن، از فضای روشن راهرو عبور کند. صدای دستور ایست، پشت سرش در فضای خالی می‌پیچد.',
    ],
    choices: [
      {
        id: 'failure-fatal-continue',
        label: 'با وجود هشدار، به دویدن ادامه می‌دهم.',
        outcome: { type: 'transition', targetSceneId: S.failFatalOutcome },
      },
    ],
  },

  {
    id: S.failFatalOutcome,
    title: 'چند قدم مانده به آزادی',
    backgroundAssetId: 'door',
    narration: [
      'صدای شلیک، راهرو را پر می‌کند. کیان پیش از رسیدن به در روی زمین می‌افتد. چند لحظه تلاش می‌کند خودش را جلو بکشد، اما پاهایش دیگر همراهی نمی‌کنند. نگهبان‌ها نزدیک می‌شوند و راه خروج، پشت حلقهٔ چکمه‌هایشان ناپدید می‌شود.',
      'شش ماه انتظار با تصمیمی پایان می‌گیرد که خطرش روشن بود: دویدن در برابر نگهبان مسلح، بدون پناه و بدون راه برگشت. این بار کیان به سلول ۱۴ بازنمی‌گردد.',
    ],
    choices: [
      {
        id: 'failure-fatal-result',
        label: 'نتیجهٔ این تلاش را ببینم.',
        outcome: { type: 'failure', failureId: CHAPTER1_FAILURE.shotInCorridor },
      },
    ],
  },
];
