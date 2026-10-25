/**
 * Condition evaluation tests. Pure data in, boolean out — no React, no DOM.
 */
import { describe, expect, it } from 'vitest';
import { evaluateCondition } from '../src/story/engine';
import type { ChoiceCondition, ConditionContext } from '../src/story/engine';

function context(overrides: Partial<ConditionContext> = {}): ConditionContext {
  return {
    variables: { courage: 3, name: 'کیان', seen: true, tone: 'calm' },
    visitedSceneIds: ['s-start', 's-fork'],
    discoveredClueIds: ['c-note'],
    ...overrides,
  };
}

const evaluate = (condition: ChoiceCondition, ctx: ConditionContext = context()): boolean =>
  evaluateCondition(condition, ctx);

describe('always', () => {
  it('is always true', () => {
    expect(evaluate({ kind: 'always' })).toBe(true);
  });
});

describe('compareVariable', () => {
  it('compares numbers with eq/neq', () => {
    expect(evaluate({ kind: 'compareVariable', variable: 'courage', operator: 'eq', value: 3 })).toBe(true);
    expect(evaluate({ kind: 'compareVariable', variable: 'courage', operator: 'eq', value: 4 })).toBe(false);
    expect(evaluate({ kind: 'compareVariable', variable: 'courage', operator: 'neq', value: 4 })).toBe(true);
  });

  it('orders numbers with gt/gte/lt/lte', () => {
    const op = (operator: 'gt' | 'gte' | 'lt' | 'lte', value: number): boolean =>
      evaluate({ kind: 'compareVariable', variable: 'courage', operator, value });

    expect(op('gt', 2)).toBe(true);
    expect(op('gt', 3)).toBe(false);
    expect(op('gte', 3)).toBe(true);
    expect(op('lt', 4)).toBe(true);
    expect(op('lte', 3)).toBe(true);
    expect(op('lte', 2)).toBe(false);
  });

  it('compares strings and booleans with eq', () => {
    expect(evaluate({ kind: 'compareVariable', variable: 'tone', operator: 'eq', value: 'calm' })).toBe(true);
    expect(evaluate({ kind: 'compareVariable', variable: 'tone', operator: 'eq', value: 'loud' })).toBe(false);
    expect(evaluate({ kind: 'compareVariable', variable: 'seen', operator: 'eq', value: true })).toBe(true);
  });

  it('never coerces across types', () => {
    // 0 and false are different values; '3' is not 3.
    expect(evaluate({ kind: 'compareVariable', variable: 'courage', operator: 'eq', value: '3' })).toBe(false);
    expect(
      evaluate(
        { kind: 'compareVariable', variable: 'zero', operator: 'eq', value: false },
        context({ variables: { zero: 0 } }),
      ),
    ).toBe(false);
  });

  it('treats a missing variable as "no value" rather than as true', () => {
    const missing = { kind: 'compareVariable', variable: 'absent', operator: 'eq', value: 0 } as const;
    expect(evaluate(missing)).toBe(false);
    expect(evaluate({ ...missing, operator: 'neq' })).toBe(true);
    expect(evaluate({ ...missing, operator: 'gt' })).toBe(false);
    expect(evaluate({ ...missing, operator: 'lte' })).toBe(false);
  });

  it('does not order non-numeric values', () => {
    expect(
      evaluate({ kind: 'compareVariable', variable: 'tone', operator: 'gt', value: 'a' }),
    ).toBe(false);
    expect(
      evaluate(
        { kind: 'compareVariable', variable: 'courage', operator: 'gt', value: 'number' },
        context({ variables: { courage: 9 } }),
      ),
    ).toBe(false);
  });
});

describe('visitedScene', () => {
  it('checks the derived scene path', () => {
    expect(evaluate({ kind: 'visitedScene', sceneId: 's-fork' })).toBe(true);
    expect(evaluate({ kind: 'visitedScene', sceneId: 's-hidden' })).toBe(false);
  });

  it('returns false for an empty path', () => {
    expect(evaluate({ kind: 'visitedScene', sceneId: 's-start' }, context({ visitedSceneIds: [] }))).toBe(false);
  });
});

describe('clueDiscovered', () => {
  it('checks discovered clues', () => {
    expect(evaluate({ kind: 'clueDiscovered', clueId: 'c-note' })).toBe(true);
    expect(evaluate({ kind: 'clueDiscovered', clueId: 'c-other' })).toBe(false);
  });
});

describe('nested combinators', () => {
  it('negates with not', () => {
    expect(evaluate({ kind: 'not', condition: { kind: 'always' } })).toBe(false);
    expect(
      evaluate({
        kind: 'not',
        condition: { kind: 'visitedScene', sceneId: 's-hidden' },
      }),
    ).toBe(true);
  });

  it('requires every child for all', () => {
    expect(
      evaluate({
        kind: 'all',
        conditions: [
          { kind: 'visitedScene', sceneId: 's-start' },
          { kind: 'clueDiscovered', clueId: 'c-note' },
        ],
      }),
    ).toBe(true);
    expect(
      evaluate({
        kind: 'all',
        conditions: [
          { kind: 'visitedScene', sceneId: 's-start' },
          { kind: 'clueDiscovered', clueId: 'c-missing' },
        ],
      }),
    ).toBe(false);
  });

  it('requires one child for any', () => {
    expect(
      evaluate({
        kind: 'any',
        conditions: [
          { kind: 'clueDiscovered', clueId: 'c-missing' },
          { kind: 'visitedScene', sceneId: 's-fork' },
        ],
      }),
    ).toBe(true);
    expect(
      evaluate({
        kind: 'any',
        conditions: [
          { kind: 'clueDiscovered', clueId: 'c-missing' },
          { kind: 'visitedScene', sceneId: 's-nowhere' },
        ],
      }),
    ).toBe(false);
  });

  it('evaluates deeply nested combinations', () => {
    const condition: ChoiceCondition = {
      kind: 'all',
      conditions: [
        { kind: 'not', condition: { kind: 'clueDiscovered', clueId: 'c-missing' } },
        {
          kind: 'any',
          conditions: [
            { kind: 'compareVariable', variable: 'courage', operator: 'gte', value: 3 },
            { kind: 'clueDiscovered', clueId: 'c-note' },
          ],
        },
        {
          kind: 'not',
          condition: {
            kind: 'all',
            conditions: [{ kind: 'visitedScene', sceneId: 's-nowhere' }],
          },
        },
      ],
    };
    expect(evaluate(condition)).toBe(true);
  });
});

describe('purity', () => {
  it('is deterministic for the same input', () => {
    const condition: ChoiceCondition = {
      kind: 'any',
      conditions: [
        { kind: 'clueDiscovered', clueId: 'c-note' },
        { kind: 'compareVariable', variable: 'courage', operator: 'lt', value: 10 },
      ],
    };
    const ctx = context();
    expect(evaluate(condition, ctx)).toBe(evaluate(condition, ctx));
  });

  it('does not mutate the condition or the context', () => {
    const condition: ChoiceCondition = {
      kind: 'all',
      conditions: [
        { kind: 'clueDiscovered', clueId: 'c-note' },
        { kind: 'compareVariable', variable: 'courage', operator: 'gt', value: 1 },
      ],
    };
    const ctx = context();
    const conditionSnapshot = structuredClone(condition);
    const contextSnapshot = structuredClone(ctx);

    evaluate(condition, ctx);

    expect(condition).toEqual(conditionSnapshot);
    expect(ctx).toEqual(contextSnapshot);
  });

  it('works with frozen inputs', () => {
    const condition = Object.freeze({
      kind: 'compareVariable',
      variable: 'courage',
      operator: 'eq',
      value: 3,
    }) as ChoiceCondition;
    const ctx = Object.freeze({
      variables: Object.freeze({ courage: 3 }),
      visitedSceneIds: Object.freeze([]),
      discoveredClueIds: Object.freeze([]),
    });
    expect(evaluate(condition, ctx)).toBe(true);
  });
});
