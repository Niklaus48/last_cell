/**
 * State-effect tests: ordering, immutability, error reporting, clue discovery.
 */
import { describe, expect, it } from 'vitest';
import { applyEffects } from '../src/story/engine';
import type { EffectTarget } from '../src/story/engine';

function target(overrides: Partial<EffectTarget> = {}): EffectTarget {
  return { variables: { courage: 1, tone: 'calm' }, discoveredClueIds: [], ...overrides };
}

describe('variable effects', () => {
  it('sets a variable, creating it if needed', () => {
    const result = applyEffects(target(), [
      { kind: 'setVariable', variable: 'tone', value: 'loud' },
      { kind: 'setVariable', variable: 'fresh', value: 7 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables).toEqual({ courage: 1, tone: 'loud', fresh: 7 });
    expect(result.variableChanges).toEqual([
      { variable: 'tone', before: 'calm', after: 'loud' },
      { variable: 'fresh', before: null, after: 7 },
    ]);
  });

  it('increments an existing number', () => {
    const result = applyEffects(target(), [
      { kind: 'incrementVariable', variable: 'courage', amount: 2 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables['courage']).toBe(3);
    expect(result.variableChanges).toEqual([{ variable: 'courage', before: 1, after: 3 }]);
  });

  it('treats a missing variable as 0 when incrementing', () => {
    const result = applyEffects(target(), [
      { kind: 'incrementVariable', variable: 'unsetCounter', amount: 4 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables['unsetCounter']).toBe(4);
    expect(result.variableChanges).toEqual([
      { variable: 'unsetCounter', before: null, after: 4 },
    ]);
  });

  it('unsets a variable so later checks treat it as missing', () => {
    const result = applyEffects(target(), [{ kind: 'unsetVariable', variable: 'tone' }]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables).toEqual({ courage: 1 });
    expect('tone' in result.variables).toBe(false);
    expect(result.variableChanges).toEqual([{ variable: 'tone', before: 'calm', after: null }]);
  });

  it('applies effects in declaration order', () => {
    const setThenIncrement = applyEffects(target(), [
      { kind: 'setVariable', variable: 'courage', value: 10 },
      { kind: 'incrementVariable', variable: 'courage', amount: 2 },
    ]);
    const incrementThenSet = applyEffects(target(), [
      { kind: 'incrementVariable', variable: 'courage', amount: 2 },
      { kind: 'setVariable', variable: 'courage', value: 10 },
    ]);

    expect(setThenIncrement.ok && setThenIncrement.variables['courage']).toBe(12);
    expect(incrementThenSet.ok && incrementThenSet.variables['courage']).toBe(10);
  });

  it('applies later effects even when they target the same variable', () => {
    const result = applyEffects(target(), [
      { kind: 'incrementVariable', variable: 'courage', amount: 1 },
      { kind: 'unsetVariable', variable: 'courage' },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect('courage' in result.variables).toBe(false);
  });
});

describe('invalid effects are reported, never silently coerced', () => {
  it('rejects incrementing a string variable', () => {
    const result = applyEffects(target(), [
      { kind: 'incrementVariable', variable: 'tone', amount: 1 },
    ]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('EFFECT_FAILED');
    expect(result.error.variable).toBe('tone');
  });

  it('rejects incrementing a boolean variable', () => {
    const result = applyEffects(target({ variables: { flag: true } }), [
      { kind: 'incrementVariable', variable: 'flag', amount: 1 },
    ]);
    expect(result.ok).toBe(false);
  });

  it('rejects a non-finite increment amount', () => {
    const result = applyEffects(target(), [
      { kind: 'incrementVariable', variable: 'courage', amount: Number.POSITIVE_INFINITY },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('EFFECT_FAILED');
  });

  it('fails the whole effect list if one effect is impossible (atomicity)', () => {
    const input = target();
    const result = applyEffects(input, [
      { kind: 'setVariable', variable: 'courage', value: 'high' },
      { kind: 'incrementVariable', variable: 'courage', amount: 1 },
    ]);

    // Failure carries no partial output at all…
    expect(result.ok).toBe(false);
    // …and the input object is untouched.
    expect(input.variables).toEqual({ courage: 1, tone: 'calm' });
  });
});

describe('clue effects', () => {
  it('records a newly discovered clue', () => {
    const result = applyEffects(target(), [{ kind: 'discoverClue', clueId: 'c-note' }]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.discoveredClueIds).toEqual(['c-note']);
    expect(result.newlyDiscoveredClueIds).toEqual(['c-note']);
  });

  it('re-discovering a clue is a no-op, not an error or a duplicate', () => {
    const result = applyEffects(target({ discoveredClueIds: ['c-note'] }), [
      { kind: 'discoverClue', clueId: 'c-note' },
      { kind: 'discoverClue', clueId: 'c-note' },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.discoveredClueIds).toEqual(['c-note']);
    expect(result.newlyDiscoveredClueIds).toEqual([]);
  });

  it('appends new clues in discovery order', () => {
    const result = applyEffects(target({ discoveredClueIds: ['c-a'] }), [
      { kind: 'discoverClue', clueId: 'c-b' },
      { kind: 'discoverClue', clueId: 'c-c' },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.discoveredClueIds).toEqual(['c-a', 'c-b', 'c-c']);
  });
});

describe('immutability', () => {
  it('never mutates the input target', () => {
    const variables = Object.freeze({ courage: 1 });
    const clues = Object.freeze(['c-a']);
    const input: EffectTarget = { variables, discoveredClueIds: clues };

    const result = applyEffects(input, [
      { kind: 'incrementVariable', variable: 'courage', amount: 5 },
      { kind: 'discoverClue', clueId: 'c-b' },
      { kind: 'unsetVariable', variable: 'courage' },
    ]);

    expect(result.ok).toBe(true);
    expect(input.variables).toEqual({ courage: 1 });
    expect(input.discoveredClueIds).toEqual(['c-a']);
  });

  it('returns the same empty-result shape for no effects', () => {
    const input = target();
    const result = applyEffects(input, []);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variables).toBe(input.variables);
    expect(result.variableChanges).toEqual([]);
    expect(result.newlyDiscoveredClueIds).toEqual([]);
  });
});
