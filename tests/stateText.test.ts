/**
 * The Persian wording for state. Node environment: this module is pure, and the
 * point of testing it here is that the text never depends on the DOM.
 */
import { describe, expect, it } from 'vitest';
import {
  changeDirection,
  describeConditionLine,
  describeRequirement,
  describeRequirements,
  describeVariableChange,
} from '../src/ui/stateText';

const labels = {
  guardSuspicion: { label: 'شک نگهبان‌ها' },
  composure: { label: 'خون‌سردی' },
} as const;

const clues = { death_record_contradiction: 'تناقض در دفتر مردگان' };

describe('describeRequirement', () => {
  it('names the variable, the requirement and the current value', () => {
    const text = describeRequirement(
      { kind: 'variable', variable: 'guardSuspicion', operator: 'lte', required: 1, actual: 3 },
      labels,
      clues,
    );
    expect(text).toContain('شک نگهبان‌ها');
    expect(text).toContain('۱');
    expect(text).toContain('۳');
    expect(text).not.toContain('guardSuspicion');
  });

  it('handles a variable that has never been set', () => {
    const text = describeRequirement(
      { kind: 'variable', variable: 'composure', operator: 'gte', required: 2, actual: null },
      labels,
      clues,
    );
    expect(text).toContain('تعیین نشده');
  });

  it('falls back to the id rather than inventing a name', () => {
    const text = describeRequirement(
      { kind: 'variable', variable: 'mystery', operator: 'gt', required: 1, actual: 0 },
      labels,
      clues,
    );
    expect(text).toContain('mystery');
  });

  it('names a required clue by its label', () => {
    const text = describeRequirement({ kind: 'clue', clueId: 'death_record_contradiction' }, labels, clues);
    expect(text).toContain('تناقض در دفتر مردگان');
  });

  it('says something honest for a requirement it cannot detail', () => {
    expect(describeRequirement({ kind: 'unknown' }, labels, clues)).toContain('شرط');
  });

  it('de-duplicates repeated reasons', () => {
    const same = { kind: 'clue', clueId: 'death_record_contradiction' } as const;
    expect(describeRequirements([same, same], labels, clues)).toHaveLength(1);
  });
});

describe('describeConditionLine', () => {
  it('marks met and unmet requirements', () => {
    const line = describeConditionLine(
      [
        { requirement: { kind: 'variable', variable: 'composure', operator: 'gte', required: 2, actual: 3 }, met: true },
        { requirement: { kind: 'variable', variable: 'guardSuspicion', operator: 'lte', required: 1, actual: 4 }, met: false },
      ],
      labels,
      clues,
    );
    expect(line).toContain('✓');
    expect(line).toContain('✗');
  });

  it('returns null when a choice has no requirements', () => {
    expect(describeConditionLine([], labels, clues)).toBeNull();
  });
});

describe('describeVariableChange', () => {
  it('shows the delta and the new value for an increase', () => {
    const text = describeVariableChange({ variable: 'guardSuspicion', before: 1, after: 3 }, labels);
    expect(text).toContain('+۲');
    expect(text).toContain('۳');
    expect(text).toContain('شک نگهبان‌ها');
  });

  it('uses a true minus sign for a decrease', () => {
    const text = describeVariableChange({ variable: 'composure', before: 3, after: 2 }, labels);
    expect(text).toContain('−۱');
  });

  it('says so when nothing moved', () => {
    const text = describeVariableChange({ variable: 'composure', before: 2, after: 2 }, labels);
    expect(text).toContain('بدون تغییر');
  });

  it('handles non-numeric values without pretending they are counters', () => {
    const text = describeVariableChange({ variable: 'composure', before: 'a', after: 'b' }, labels);
    expect(text).toContain('→');
  });
});

describe('changeDirection', () => {
  it('classifies numeric changes', () => {
    expect(changeDirection({ variable: 'x', before: 1, after: 2 })).toBe('up');
    expect(changeDirection({ variable: 'x', before: 2, after: 1 })).toBe('down');
    expect(changeDirection({ variable: 'x', before: 1, after: 1 })).toBe('flat');
    expect(changeDirection({ variable: 'x', before: true, after: false })).toBeNull();
  });
});
