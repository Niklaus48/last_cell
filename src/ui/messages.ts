/**
 * Persian copy for engine error codes.
 * Keeping the mapping in the UI layer means the engine stays language-agnostic.
 */
import type { StoryErrorCode } from '../story/engine';

const messages: Readonly<Record<StoryErrorCode, string>> = {
  INVALID_CHOICE: 'این انتخاب در این صحنه وجود ندارد.',
  CHOICE_UNAVAILABLE: 'این انتخاب در حال حاضر در دسترس نیست.',
  STALE_SCENE: 'صحنه عوض شده است؛ دوباره تلاش کنید.',
  GAME_ENDED: 'این روایت به پایان رسیده است.',
  GAME_FAILED: 'این روایت شکست خورده است؛ اول باید از نقطهٔ امن بازگردید.',
  UNKNOWN_SCENE: 'خطا در بارگذاری صحنه.',
  EFFECT_FAILED: 'تغییر وضعیت با شکست روبه‌رو شد و انتخاب اعمال نشد.',
  NOT_FAILED: 'این روایت در وضعیت شکست نیست.',
  NO_RECOVERY_TARGET: 'برای این شکست نقطهٔ بازیابی تعریف نشده است.',
  INVALID_SNAPSHOT: 'داده‌های ذخیره‌شده معتبر نیست.',
  UNKNOWN_CHECKPOINT: 'این نقطهٔ امن در این روایت وجود ندارد.',
  CHECKPOINT_UNAVAILABLE: 'در این صحنه نقطهٔ امنی ثبت نمی‌شود.',
  CHECKPOINT_MISMATCH: 'نقطهٔ امن انتخاب‌شده با این شکست هم‌خوانی ندارد.',
};

export function toPersianError(code: StoryErrorCode): string {
  return messages[code];
}
