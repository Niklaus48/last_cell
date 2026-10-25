/**
 * Declarative condition evaluation. Pure, React-free, DOM-free, side-effect free.
 *
 * The evaluator never mutates the condition, the variables or the clue list, and
 * the same (condition, context) pair always yields the same boolean.
 */
import type {
  ChoiceCondition,
  ClueId,
  ComparisonOperator,
  SceneId,
  StateValue,
  StoryVariables,
} from './types';

export interface ConditionContext {
  readonly variables: StoryVariables;
  readonly visitedSceneIds: readonly SceneId[];
  readonly discoveredClueIds: readonly ClueId[];
}

/**
 * Ordered comparison of a (possibly missing) variable against a literal.
 * Only numeric pairs are ordered; anything else is `false` rather than a guess.
 */
function compare(
  left: StateValue | undefined,
  operator: ComparisonOperator,
  right: StateValue,
): boolean {
  switch (operator) {
    case 'eq':
      return left === right;
    case 'neq':
      // A missing variable is "not equal" to every concrete value.
      return left !== right;
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      if (typeof left !== 'number' || typeof right !== 'number') {
        return false;
      }
      switch (operator) {
        case 'gt':
          return left > right;
        case 'gte':
          return left >= right;
        case 'lt':
          return left < right;
        case 'lte':
          return left <= right;
      }
    }
  }
}

/** Evaluates a choice condition against the current variables, path and clues. */
export function evaluateCondition(
  condition: ChoiceCondition,
  context: ConditionContext,
): boolean {
  switch (condition.kind) {
    case 'always':
      return true;
    case 'compareVariable':
      return compare(
        context.variables[condition.variable],
        condition.operator,
        condition.value,
      );
    case 'visitedScene':
      return context.visitedSceneIds.includes(condition.sceneId);
    case 'clueDiscovered':
      return context.discoveredClueIds.includes(condition.clueId);
    case 'not':
      return !evaluateCondition(condition.condition, context);
    case 'all':
      return condition.conditions.every((child) => evaluateCondition(child, context));
    case 'any':
      return condition.conditions.some((child) => evaluateCondition(child, context));
  }
}
