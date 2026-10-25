/**
 * Declarative condition evaluation. Pure, React-free, DOM-free.
 */
import type {
  ChoiceCondition,
  ComparisonOperator,
  SceneId,
  StateValue,
  StoryVariables,
} from './types';

export interface ConditionContext {
  readonly variables: StoryVariables;
  readonly visitedSceneIds: readonly SceneId[];
}

function compare(
  left: StateValue | undefined,
  operator: ComparisonOperator,
  right: StateValue,
): boolean {
  switch (operator) {
    case 'eq':
      return left === right;
    case 'neq':
      return left !== right;
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      // Ordered comparisons are defined for numbers only. A missing or
      // non-numeric variable simply does not satisfy the condition.
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

/** Evaluates a choice condition against the current variables and path. */
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
    case 'not':
      return !evaluateCondition(condition.condition, context);
    case 'all':
      return condition.conditions.every((child) => evaluateCondition(child, context));
    case 'any':
      return condition.conditions.some((child) => evaluateCondition(child, context));
  }
}
