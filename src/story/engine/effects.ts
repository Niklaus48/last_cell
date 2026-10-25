/**
 * Declarative state-effect application. Pure, React-free, DOM-free.
 * Returns a new variables object; never mutates the input.
 */
import type { StateEffect, StateValue, StoryVariables } from './types';

export function applyEffects(
  variables: StoryVariables,
  effects: readonly StateEffect[] | undefined,
): StoryVariables {
  if (effects === undefined || effects.length === 0) {
    return variables;
  }

  // Working copy: mutating it locally is what makes the caller's input immutable.
  const next: Record<string, StateValue> = { ...variables };
  for (const effect of effects) {
    switch (effect.kind) {
      case 'setVariable':
        next[effect.variable] = effect.value;
        break;
      case 'incrementVariable': {
        const current = next[effect.variable];
        const base = typeof current === 'number' ? current : 0;
        next[effect.variable] = base + effect.amount;
        break;
      }
      case 'unsetVariable':
        delete next[effect.variable];
        break;
    }
  }
  return next;
}
