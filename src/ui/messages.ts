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
  UNKNOWN_SCENE: 'خطا در بارگذاری صحنه.',
};

export function toPersianError(code: StoryErrorCode): string {
  return messages[code];
}
