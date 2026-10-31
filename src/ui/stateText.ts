/**
 * Turning engine facts into Persian sentences.
 *
 * The engine reports *what* failed (`{ variable, operator, required, actual }`)
 * and *what changed* (`{ variable, before, after }`). This module is the only
 * place that decides how to say it, so the wording can be reviewed in one file
 * and the engine never grows a string.
 *
 * Rules kept here:
 * - a variable is always named by its story-declared label, never by its id; if
 *   there is no label the id is shown rather than an invented name;
 * - numbers are Persian digits, and the current value is always shown next to the
 *   requirement, so "why can't I pick this?" is answerable without guessing;
 * - nothing says "you should have…" — the text describes state, it does not coach.
 */
import type {
  ComparisonOperator,
  EvaluatedRequirement,
  StateValue,
  UnmetRequirement,
  VariableChange,
} from '../story/engine';
import { toPersianDigits } from './format';

export type VariableLabels = Readonly<Record<string, { readonly label: string }>>;
export type ClueLabels = Readonly<Record<string, string>>;

function labelOf(variable: string, labels: VariableLabels): string {
  return labels[variable]?.label ?? variable;
}

function showValue(value: StateValue | null): string {
  if (value === null) {
    return 'تعیین نشده';
  }
  if (typeof value === 'boolean') {
    return value ? 'بله' : 'خیر';
  }
  if (typeof value === 'number') {
    return toPersianDigits(value);
  }
  return value;
}

const OPERATOR_TEXT: Readonly<Record<ComparisonOperator, string>> = {
  eq: 'برابر با',
  neq: 'جز',
  gt: 'بیشتر از',
  gte: 'بیشتر یا برابر با',
  lt: 'کمتر از',
  lte: 'کمتر یا برابر با',
};

/** «شک نگهبان‌ها باید ۱ یا کمتر باشد؛ الان ۳ است.» */
export function describeRequirement(
  requirement: UnmetRequirement,
  labels: VariableLabels,
  clueLabels: ClueLabels,
): string {
  switch (requirement.kind) {
    case 'variable':
      return `${labelOf(requirement.variable, labels)} باید ${OPERATOR_TEXT[requirement.operator]} ${showValue(requirement.required)} باشد؛ الان ${showValue(requirement.actual)} است.`;
    case 'clue':
      return `به یافتهٔ «${clueLabels[requirement.clueId] ?? requirement.clueId}» نیاز دارد.`;
    case 'scene':
      return 'فقط پس از دیدن صحنه‌ای که هنوز ندیده‌ای باز می‌شود.';
    case 'unknown':
      return 'شرط این گزینه با وضعیت فعلی برقرار نیست.';
  }
}

/** «شرط: شک نگهبان‌ها کمتر یا برابر با ۱ باشد (اکنون ۱)» — met or not. */
export function describeConditionLine(
  requirements: readonly EvaluatedRequirement[],
  labels: VariableLabels,
  clueLabels: ClueLabels,
): string | null {
  if (requirements.length === 0) {
    return null;
  }
  const parts = requirements.map((entry) => {
    const text = describeRequirement(entry.requirement, labels, clueLabels).replace(/[.۔]$/, '');
    return `${entry.met ? '✓' : '✗'} ${text}`;
  });
  return parts.join(' · ');
}

/** All reasons, one per line, de-duplicated. */
export function describeRequirements(
  requirements: readonly UnmetRequirement[],
  labels: VariableLabels,
  clueLabels: ClueLabels,
): readonly string[] {
  return [...new Set(requirements.map((requirement) => describeRequirement(requirement, labels, clueLabels)))];
}

/** One line per variable that a choice actually changed. */
export function describeVariableChange(
  change: VariableChange,
  labels: VariableLabels,
): string {
  const name = labelOf(change.variable, labels);
  const before = change.before;
  const after = change.after;

  if (after === null) {
    return `${name} پاک شد.`;
  }
  if (typeof before === 'number' && typeof after === 'number') {
    const delta = after - before;
    if (delta === 0) {
      return `${name} بدون تغییر (${showValue(after)})`;
    }
    const sign = delta > 0 ? '+' : '−';
    const magnitude = toPersianDigits(Math.abs(delta));
    const direction = delta > 0 ? '↑' : '↓';
    return `${direction} ${name} ${sign}${magnitude} — اکنون ${showValue(after)}`;
  }
  return `${name}: ${showValue(before)} → ${showValue(after)}`;
}

/** True when the change is an increase, for styling; `null` when not numeric. */
export function changeDirection(change: VariableChange): 'up' | 'down' | 'flat' | null {
  if (typeof change.before !== 'number' || typeof change.after !== 'number') {
    return null;
  }
  if (change.after === change.before) {
    return 'flat';
  }
  return change.after > change.before ? 'up' : 'down';
}
