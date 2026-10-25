/**
 * Persian copy for engine error codes.
 * Keeping the mapping in the UI layer means the engine stays language-agnostic.
 */
import type { StoryErrorCode } from '../story/engine';
import type { SaveErrorCode } from '../persistence';

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

/**
 * Persian copy for local save/load failures. Kept beside the engine messages so
 * every player-facing string in the app lives in one file.
 */
const saveMessages: Readonly<Record<SaveErrorCode, string>> = {
  NO_SAVE: 'ذخیره‌ای برای ادامه پیدا نشد.',
  STORAGE_UNAVAILABLE:
    'مرورگر اجازهٔ ذخیره‌سازی محلی نمی‌دهد؛ بازی در همین نشست ادامه پیدا می‌کند.',
  STORAGE_FULL: 'حافظهٔ محلی مرورگر پر شده است؛ ذخیره انجام نشد.',
  MALFORMED_SAVE: 'دادهٔ ذخیره‌شده خراب است و خوانده نمی‌شود.',
  INCOMPATIBLE_SAVE: 'این ذخیره با نسخهٔ فعلی بازی سازگار نیست.',
  WRONG_STORY: 'این ذخیره به فصل دیگری تعلق دارد.',
  INVALID_STATE: 'وضعیت ذخیره‌شده معتبر نیست؛ بازی از همان‌جا ادامه پیدا نکرد.',
};

export function toPersianSaveMessage(code: SaveErrorCode): string {
  return saveMessages[code];
}

export const SAVE_SUCCESS_MESSAGE = 'بازی ذخیره شد.';
export const LOAD_SUCCESS_MESSAGE = 'بازی از ذخیرهٔ محلی ادامه پیدا کرد.';
export const SAVE_NONE_MESSAGE = 'هنوز ذخیره‌ای وجود ندارد.';
export const SAVE_INVALID_HINT = 'ذخیرهٔ موجود قابل استفاده نیست.';
export const SAVE_STORAGE_DISABLED_HINT = 'ذخیره‌سازی محلی در این مرورگر در دسترس نیست.';
