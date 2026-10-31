/**
 * Player-facing names for Chapter 1's variables.
 *
 * This is content, not logic: the engine compares numbers, and the UI needs a
 * Persian name for each number it shows. Keeping the words here means the label
 * travels with the chapter (and with a studio pack) instead of being hard-coded
 * in a component.
 *
 * Honest wording matters: `hint` says what the variable *means for Kian*, never
 * how to optimise it. There is no score in this story and the labels must not
 * imply one.
 */
import type { VariableMeta } from '../../engine';

export const chapter1VariableMeta: Readonly<Record<string, VariableMeta>> = {
  composure: {
    label: 'خون‌سردی',
    hint: 'چقدر می‌توانی در فشار، آرام و دقیق بمانی.',
  },
  guardSuspicion: {
    label: 'شک نگهبان‌ها',
    hint: 'چقدر نگهبان‌ها به حرکت‌هایت حساس شده‌اند.',
  },
  planIntegrity: {
    label: 'سالم‌بودن نقشه',
    hint: 'چقدر از نقشهٔ شش‌ماهه هنوز قابل استفاده است.',
  },
  strangerContact: {
    label: 'خط باز با غریبه',
    hint: 'آیا هنوز راهی برای رسیدن صدای او به تو مانده است.',
  },
  strangerTrust: {
    label: 'اعتماد به غریبه',
    hint: 'چقدر به حرف‌های او تن داده‌ای.',
  },
  strangerKnowledge: {
    label: 'آنچه غریبه گفته',
    hint: 'چقدر از دهان خودش شنیده‌ای — ادعاها هم شمرده می‌شوند.',
  },
  routeKnowledge: {
    label: 'شناخت مسیر',
    hint: 'چقدر از ساختمان را بیرون از نقشهٔ خودت می‌شناسی.',
  },
  criticalMistakes: {
    label: 'خطاهای پرسروصدا',
    hint: 'کارهای بی‌احتیاطی که در این شب انجام داده‌ای.',
  },
};
