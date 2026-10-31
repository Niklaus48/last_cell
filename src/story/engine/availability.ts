/**
 * Why a choice is (not) selectable.
 *
 * The engine already answers "can I pick this?" (`isChoiceAvailable`). This module
 * answers the next question: *which part of the condition failed, and by how
 * much* — as structured data, never as a sentence.
 *
 * Why structured: the wording belongs to the presentation layer (and the language
 * belongs to the content), while the comparison belongs to the engine. Keeping the
 * numbers here means the UI can say «شک نگهبان‌ها باید ۱ یا کمتر باشد؛ الان ۳ است»
 * without ever re-implementing a comparison.
 *
 * Pure and React-free, like the rest of the engine.
 */
import { evaluateCondition, type ConditionContext } from './conditions';
import type {
  ChoiceCondition,
  ChoiceDefinition,
  ClueId,
  ComparisonOperator,
  SceneId,
  StateValue,
} from './types';

/** One requirement that is not satisfied right now. */
export type UnmetRequirement =
  | {
      readonly kind: 'variable';
      readonly variable: string;
      readonly operator: ComparisonOperator;
      readonly required: StateValue;
      /** Current value, or `null` when the variable has never been set. */
      readonly actual: StateValue | null;
    }
  | { readonly kind: 'clue'; readonly clueId: ClueId }
  | { readonly kind: 'scene'; readonly sceneId: SceneId }
  /** `not`, or a shape this layer does not describe: reported without detail. */
  | { readonly kind: 'unknown' };

/** One requirement together with whether it holds right now. */
export interface EvaluatedRequirement {
  readonly requirement: UnmetRequirement;
  readonly met: boolean;
}

export interface ConditionExplanation {
  readonly met: boolean;
  /**
   * Every requirement the condition names, met or not, in declaration order.
   * This is what lets the UI *show* a condition instead of only complaining about
   * the ones that fail.
   *
   * For `any`, all children are listed — combined with `met` on the explanation
   * they read as "one of these". For `not`, the detail is deliberately not
   * inverted into a misleading requirement; it is reported as `unknown` plus the
   * overall `met`, which is honest without pretending to explain.
   */
  readonly requirements: readonly EvaluatedRequirement[];
  /** The subset that fails. Empty when `met` is true. */
  readonly unmet: readonly UnmetRequirement[];
}

function variableRequirement(
  condition: Extract<ChoiceCondition, { kind: 'compareVariable' }>,
  context: ConditionContext,
): UnmetRequirement {
  const actual = context.variables[condition.variable];
  return {
    kind: 'variable',
    variable: condition.variable,
    operator: condition.operator,
    required: condition.value,
    actual: actual === undefined ? null : actual,
  };
}

function explainInto(
  condition: ChoiceCondition,
  context: ConditionContext,
  out: EvaluatedRequirement[],
): boolean {
  switch (condition.kind) {
    case 'always':
      return true;

    case 'compareVariable': {
      const met = evaluateCondition(condition, context);
      out.push({ requirement: variableRequirement(condition, context), met });
      return met;
    }

    case 'clueDiscovered': {
      const met = context.discoveredClueIds.includes(condition.clueId);
      out.push({ requirement: { kind: 'clue', clueId: condition.clueId }, met });
      return met;
    }

    case 'visitedScene': {
      const met = context.visitedSceneIds.includes(condition.sceneId);
      out.push({ requirement: { kind: 'scene', sceneId: condition.sceneId }, met });
      return met;
    }

    case 'all': {
      // Every failing child is a real reason; a player needs all of them fixed.
      let met = true;
      for (const child of condition.conditions) {
        if (!explainInto(child, context, out)) {
          met = false;
        }
      }
      return met;
    }

    case 'any': {
      if (evaluateCondition(condition, context)) {
        return true;
      }
      // None held: list each alternative so the player sees the options.
      for (const child of condition.conditions) {
        explainInto(child, context, out);
      }
      return false;
    }

    case 'not': {
      const met = evaluateCondition(condition, context);
      if (!met) {
        out.push({ requirement: { kind: 'unknown' }, met: false });
      }
      return met;
    }
  }
}

/** Explains a condition against the current context. */
export function explainCondition(
  condition: ChoiceCondition | undefined,
  context: ConditionContext,
): ConditionExplanation {
  if (condition === undefined || condition.kind === 'always') {
    return { met: true, requirements: [], unmet: [] };
  }
  const requirements: EvaluatedRequirement[] = [];
  const met = explainInto(condition, context, requirements);
  return {
    met,
    requirements,
    unmet: met ? [] : requirements.filter((entry) => !entry.met).map((entry) => entry.requirement),
  };
}

/** A declared choice plus whether it can be taken right now, and why not. */
export interface ChoiceAvailability {
  readonly choice: ChoiceDefinition;
  readonly available: boolean;
  /** Every requirement of the choice, with its current status. */
  readonly requirements: readonly EvaluatedRequirement[];
  /** The requirements that fail right now (empty when available). */
  readonly unmet: readonly UnmetRequirement[];
}

/** Availability of every declared choice, in declaration order. */
export function explainChoices(
  choices: readonly ChoiceDefinition[],
  context: ConditionContext,
  playing: boolean,
): readonly ChoiceAvailability[] {
  return choices.map((choice) => {
    // Outside a live run nothing is selectable, for the same reason the engine
    // returns an empty list: there is no scene to choose in.
    const explanation = explainCondition(choice.condition, context);
    const available = playing && explanation.met;
    return {
      choice,
      available,
      requirements: explanation.requirements,
      unmet: available ? [] : explanation.unmet,
    };
  });
}
