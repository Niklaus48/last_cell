/**
 * Editing a choice's availability rule.
 *
 * The engine's conditions are a small tree (`all`, `any`, `not`, and three leaf
 * kinds), and the editor mirrors that tree instead of flattening it: flattening
 * would silently rewrite an author's `any` into an `all` the first time it was
 * touched. `all`/`any` groups can be nested one level deep, which covers every
 * condition the chapter uses today and anything reasonable tomorrow.
 *
 * Under the editor sits a **tester**: the author types hypothetical variable
 * values and sees the rule's verdict, rendered by the same code the game uses.
 * That is the "in what state does this open?" question answered directly, without
 * having to play to that point.
 */
import { explainCondition } from '../story/engine';
import type { ChoiceCondition, ClueDefinition } from '../story/engine';
import { describeRequirement } from '../ui/stateText';
import { OPERATORS } from './model';

interface ConditionEditorProps {
  readonly condition: ChoiceCondition | undefined;
  readonly variables: readonly string[];
  readonly variableLabels: Readonly<Record<string, { readonly label: string }>>;
  readonly clues: readonly ClueDefinition[];
  readonly scenes: readonly { readonly id: string; readonly title: string }[];
  readonly onChange: (condition: ChoiceCondition | null) => void;
  /** Values the author typed into the tester (empty until they touch it). */
  readonly testValues: Readonly<Record<string, number>>;
  /** Starting values, used until the author overrides one: the story's own. */
  readonly testDefaults: Readonly<Record<string, number | string | boolean>>;
  readonly onTestValuesChange: (values: Readonly<Record<string, number>>) => void;
  readonly depth?: number;
}

const MAX_DEPTH = 2;

export function ConditionEditor({
  condition,
  variables,
  variableLabels,
  clues,
  scenes,
  onChange,
  testValues,
  testDefaults,
  onTestValuesChange,
  depth = 0,
}: ConditionEditorProps): React.ReactElement {
  if (condition === undefined) {
    return (
      <div className="condition-empty">
        <p className="muted small">این گزینه همیشه باز است (بدون شرط).</p>
        <button
          type="button"
          className="secondary"
          onClick={() =>
            onChange({ kind: 'compareVariable', variable: variables[0] ?? 'composure', operator: 'gte', value: 1 })
          }
        >
          + افزودن شرط
        </button>
      </div>
    );
  }

  const referenced = referencedVariables(condition);

  return (
    <div className={`condition-editor${depth > 0 ? ' condition-editor--nested' : ''}`}>
      <div className="condition-editor__row">
        <select
          className="field__select"
          value={condition.kind}
          aria-label="نوع شرط"
          onChange={(event) => onChange(blankOf(event.target.value, variables, condition))}
        >
          <option value="compareVariable">مقایسهٔ یک متغیر</option>
          <option value="clueDiscovered">یافته کشف شده باشد</option>
          <option value="visitedScene">صحنه‌ای دیده شده باشد</option>
          <option value="not">نقیض شرط دیگر</option>
          {depth < MAX_DEPTH && <option value="all">همهٔ شرط‌ها (و)</option>}
          {depth < MAX_DEPTH && <option value="any">یکی از شرط‌ها (یا)</option>}
        </select>
        <button
          type="button"
          className="mini mini--danger"
          onClick={() => onChange(null)}
          aria-label="حذف شرط"
        >
          حذف شرط
        </button>
      </div>

      {condition.kind === 'compareVariable' && (
        <div className="condition-editor__row condition-editor__row--triple">
          <select
            className="field__select"
            value={condition.variable}
            aria-label="متغیر"
            onChange={(event) => onChange({ ...condition, variable: event.target.value })}
          >
            {variables.map((name) => (
              <option key={name} value={name}>
                {variableLabels[name]?.label ?? name}
              </option>
            ))}
            {!variables.includes(condition.variable) && (
              <option value={condition.variable}>{condition.variable} (تعریف‌نشده)</option>
            )}
          </select>
          <select
            className="field__select"
            value={condition.operator}
            aria-label="عملگر"
            onChange={(event) =>
              onChange({ ...condition, operator: event.target.value as typeof condition.operator })
            }
          >
            {OPERATORS.map((operator) => (
              <option key={operator.value} value={operator.value}>
                {operator.label}
              </option>
            ))}
          </select>
          <input
            className="field__input field__input--narrow"
            type="number"
            aria-label="مقدار"
            value={typeof condition.value === 'number' ? condition.value : 0}
            onChange={(event) => onChange({ ...condition, value: Number(event.target.value) })}
          />
        </div>
      )}

      {condition.kind === 'clueDiscovered' && (
        <select
          className="field__select"
          value={condition.clueId}
          aria-label="یافته"
          onChange={(event) => onChange({ ...condition, clueId: event.target.value })}
        >
          {clues.map((clue) => (
            <option key={clue.id} value={clue.id}>
              {clue.label}
            </option>
          ))}
          {!clues.some((clue) => clue.id === condition.clueId) && (
            <option value={condition.clueId}>{condition.clueId} (تعریف‌نشده)</option>
          )}
        </select>
      )}

      {condition.kind === 'visitedScene' && (
        <select
          className="field__select"
          value={condition.sceneId}
          aria-label="صحنه"
          onChange={(event) => onChange({ ...condition, sceneId: event.target.value })}
        >
          {scenes.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.title}
            </option>
          ))}
        </select>
      )}

      {condition.kind === 'not' && (
        <ConditionEditor
          condition={condition.condition}
          variables={variables}
          variableLabels={variableLabels}
          clues={clues}
          scenes={scenes}
          onChange={(inner) =>
            onChange(inner === null ? null : { kind: 'not', condition: inner })
          }
          testValues={testValues}
          testDefaults={testDefaults}
          onTestValuesChange={onTestValuesChange}
          depth={depth + 1}
        />
      )}

      {(condition.kind === 'all' || condition.kind === 'any') && (
        <div className="condition-group">
          {condition.conditions.map((child, index) => (
            <div className="condition-group__item" key={`${condition.kind}-${index}`}>
              <ConditionEditor
                condition={child}
                variables={variables}
                variableLabels={variableLabels}
                clues={clues}
                scenes={scenes}
                onChange={(inner) => {
                  const next = inner === null
                    ? condition.conditions.filter((_, i) => i !== index)
                    : condition.conditions.map((current, i) => (i === index ? inner : current));
                  onChange(next.length === 0 ? null : { ...condition, conditions: next });
                }}
                testValues={testValues}
                testDefaults={testDefaults}
                onTestValuesChange={onTestValuesChange}
                depth={depth + 1}
              />
            </div>
          ))}
          <button
            type="button"
            className="secondary"
            onClick={() =>
              onChange({
                ...condition,
                conditions: [
                  ...condition.conditions,
                  { kind: 'compareVariable', variable: variables[0] ?? 'composure', operator: 'gte', value: 1 },
                ],
              })
            }
          >
            + شرط تازه در این گروه
          </button>
        </div>
      )}

      {referenced.length > 0 && (
        <ConditionTester
          condition={condition}
          variables={referenced}
          variableLabels={variableLabels}
          testValues={testValues}
          testDefaults={testDefaults}
          onTestValuesChange={onTestValuesChange}
        />
      )}
    </div>
  );
}

/** Tries the rule against values the author types, using the engine's own logic. */
function ConditionTester({
  condition,
  variables,
  variableLabels,
  testValues,
  testDefaults,
  onTestValuesChange,
}: {
  readonly condition: ChoiceCondition;
  readonly variables: readonly string[];
  readonly variableLabels: Readonly<Record<string, { readonly label: string }>>;
  readonly testValues: Readonly<Record<string, number>>;
  readonly testDefaults: Readonly<Record<string, number | string | boolean>>;
  readonly onTestValuesChange: (values: Readonly<Record<string, number>>) => void;
}): React.ReactElement {
  // Start from what the run actually begins with, so the first verdict reflects
  // the shipped game rather than an arbitrary zero.
  const valueOf = (name: string): number => {
    const typed = testValues[name];
    if (typed !== undefined) {
      return typed;
    }
    const initial = testDefaults[name];
    return typeof initial === 'number' ? initial : 0;
  };

  const explanation = explainCondition(condition, {
    variables: Object.fromEntries(variables.map((name) => [name, valueOf(name)])),
    visitedSceneIds: [],
    discoveredClueIds: [],
  });

  return (
    <div className="condition-tester">
      <p className="muted small">آزمایش: اگر مقادیر این‌طور باشند، این گزینه…</p>
      <div className="condition-tester__inputs">
        {variables.map((name) => (
          <label className="condition-tester__field" key={name}>
            <span>{variableLabels[name]?.label ?? name}</span>
            <input
              className="field__input field__input--narrow"
              type="number"
              value={valueOf(name)}
              onChange={(event) =>
                onTestValuesChange({ ...testValues, [name]: Number(event.target.value) })
              }
            />
          </label>
        ))}
      </div>
      <p className={explanation.met ? 'condition-verdict condition-verdict--open' : 'condition-verdict condition-verdict--closed'}>
        {explanation.met
          ? '✓ باز می‌شود'
          : `✗ بسته می‌ماند — ${explanation.unmet
              .map((requirement) => describeRequirement(requirement, variableLabels, {}))
              .join(' ')}`}
      </p>
    </div>
  );
}

function referencedVariables(condition: ChoiceCondition): readonly string[] {
  const found = new Set<string>();
  const walk = (node: ChoiceCondition): void => {
    switch (node.kind) {
      case 'compareVariable':
        found.add(node.variable);
        return;
      case 'not':
        walk(node.condition);
        return;
      case 'all':
      case 'any':
        node.conditions.forEach(walk);
        return;
      case 'always':
      case 'clueDiscovered':
      case 'visitedScene':
        return;
    }
  };
  walk(condition);
  return [...found];
}

/** A fresh condition of the requested kind, keeping ids valid. */
function blankOf(
  kind: string,
  variables: readonly string[],
  previous: ChoiceCondition,
): ChoiceCondition {
  switch (kind) {
    case 'clueDiscovered':
      return { kind: 'clueDiscovered', clueId: 'clue' };
    case 'visitedScene':
      return { kind: 'visitedScene', sceneId: '' };
    case 'not':
      return { kind: 'not', condition: previous };
    case 'all':
      return { kind: 'all', conditions: [previous] };
    case 'any':
      return { kind: 'any', conditions: [previous] };
    default:
      return { kind: 'compareVariable', variable: variables[0] ?? 'composure', operator: 'gte', value: 1 };
  }
}
