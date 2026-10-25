/**
 * Declarative state-effect application. Pure, React-free, DOM-free.
 *
 * Effects are applied in declaration order to a working copy; the input slice
 * is never mutated. Application is all-or-nothing: if any effect is invalid the
 * caller receives a typed error and must discard the whole transition, so a run
 * can never end up half-updated.
 */
import type {
  ClueId,
  StateEffect,
  StateValue,
  StoryVariables,
  VariableChange,
} from './types';

/** The part of `StoryState` that effects operate on. */
export interface EffectTarget {
  readonly variables: StoryVariables;
  readonly discoveredClueIds: readonly ClueId[];
}

export interface EffectApplicationError {
  readonly code: 'EFFECT_FAILED';
  readonly message: string;
  readonly variable?: string;
  readonly clueId?: ClueId;
}

export type EffectApplicationResult =
  | {
      readonly ok: true;
      readonly variables: StoryVariables;
      readonly discoveredClueIds: readonly ClueId[];
      readonly variableChanges: readonly VariableChange[];
      /** Clues newly discovered by these effects. */
      readonly newlyDiscoveredClueIds: readonly ClueId[];
    }
  | { readonly ok: false; readonly error: EffectApplicationError };

function asNullable(value: StateValue | undefined): StateValue | null {
  return value === undefined ? null : value;
}

/**
 * Applies `effects` to `target`.
 *
 * Rules:
 * - `setVariable` writes the value (last write wins).
 * - `incrementVariable` treats a *missing* variable as `0`, and fails with
 *   `EFFECT_FAILED` when the current value is not a finite number.
 * - `unsetVariable` removes the key; later conditions then see it as missing.
 * - `discoverClue` appends once; re-discovering is a no-op.
 */
export function applyEffects(
  target: EffectTarget,
  effects: readonly StateEffect[] | undefined,
): EffectApplicationResult {
  if (effects === undefined || effects.length === 0) {
    return {
      ok: true,
      variables: target.variables,
      discoveredClueIds: target.discoveredClueIds,
      variableChanges: [],
      newlyDiscoveredClueIds: [],
    };
  }

  const variables: Record<string, StateValue> = { ...target.variables };
  const discovered: ClueId[] = [...target.discoveredClueIds];
  const touched: string[] = [];
  const newlyDiscovered: ClueId[] = [];

  for (const effect of effects) {
    switch (effect.kind) {
      case 'setVariable':
        variables[effect.variable] = effect.value;
        touched.push(effect.variable);
        break;

      case 'incrementVariable': {
        const current = variables[effect.variable];
        if (current !== undefined && (typeof current !== 'number' || !Number.isFinite(current))) {
          return {
            ok: false,
            error: {
              code: 'EFFECT_FAILED',
              message: `Cannot increment variable "${effect.variable}": current value is not a finite number.`,
              variable: effect.variable,
            },
          };
        }
        if (!Number.isFinite(effect.amount)) {
          return {
            ok: false,
            error: {
              code: 'EFFECT_FAILED',
              message: `Cannot increment variable "${effect.variable}" by a non-finite amount.`,
              variable: effect.variable,
            },
          };
        }
        variables[effect.variable] = (current ?? 0) + effect.amount;
        touched.push(effect.variable);
        break;
      }

      case 'unsetVariable':
        delete variables[effect.variable];
        touched.push(effect.variable);
        break;

      case 'discoverClue':
        if (!discovered.includes(effect.clueId)) {
          discovered.push(effect.clueId);
          newlyDiscovered.push(effect.clueId);
        }
        break;
    }
  }

  const variableChanges: VariableChange[] = touched.map((variable) => ({
    variable,
    before: asNullable(target.variables[variable]),
    after: asNullable(variables[variable]),
  }));

  return {
    ok: true,
    variables,
    discoveredClueIds: discovered,
    variableChanges,
    newlyDiscoveredClueIds: newlyDiscovered,
  };
}
