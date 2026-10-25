/** Presentation helpers for Persian output. */
const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

/** Converts Latin digits to Persian digits (no Intl dependency). */
export function toPersianDigits(value: number): string {
  return String(value).replace(/[0-9]/g, (digit) => persianDigits[Number(digit)] ?? digit);
}
