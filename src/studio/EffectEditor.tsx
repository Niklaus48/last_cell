/**
 * Editing what a choice *does* to the story state.
 *
 * The four engine effects are all reachable: set a variable, increment it, unset
 * it, or discover a clue. Increments are the common case, so they get the compact
 * row; everything else uses the same row with a different middle control.
 *
 * The order of the list is the order the engine applies them in, so it is shown
 * as a numbered list and can be reordered — "add 1, then set to 0" is a different
 * rule from "set to 0, then add 1".
 */
import type { ClueDefinition, StateEffect } from '../story/engine';

interface EffectEditorProps {
  readonly effects: readonly StateEffect[];
  readonly variables: readonly string[];
  readonly variableLabels: Readonly<Record<string, { readonly label: string }>>;
  readonly clues: readonly ClueDefinition[];
  readonly onAdd: (effect: StateEffect) => void;
  readonly onUpdate: (index: number, effect: StateEffect) => void;
  readonly onRemove: (index: number) => void;
  readonly onMove: (index: number, direction: -1 | 1) => void;
}

export function EffectEditor({
  effects,
  variables,
  variableLabels,
  clues,
  onAdd,
  onUpdate,
  onRemove,
  onMove,
}: EffectEditorProps): React.ReactElement {
  return (
    <div className="effect-editor">
      {effects.length === 0 && <p className="muted small">این گزینه چیزی را تغییر نمی‌دهد.</p>}
      {effects.map((effect, index) => (
        <div className="effect-row" key={`effect-${index}`}>
          <span className="effect-row__index" aria-hidden="true">
            {index + 1}
          </span>
          <select
            className="field__select"
            value={effect.kind}
            aria-label={`نوع اثر ${index + 1}`}
            onChange={(event) => onUpdate(index, blankEffect(event.target.value, variables, effects[index]))}
          >
            <option value="incrementVariable">افزودن به متغیر</option>
            <option value="setVariable">تنظیم متغیر</option>
            <option value="unsetVariable">پاک‌کردن متغیر</option>
            <option value="discoverClue">کشف یافته</option>
          </select>

          {effect.kind === 'discoverClue' ? (
            <select
              className="field__select"
              value={effect.clueId}
              aria-label={`یافتهٔ اثر ${index + 1}`}
              onChange={(event) => onUpdate(index, { kind: 'discoverClue', clueId: event.target.value })}
            >
              {clues.map((clue) => (
                <option key={clue.id} value={clue.id}>
                  {clue.label}
                </option>
              ))}
              {!clues.some((clue) => clue.id === effect.clueId) && (
                <option value={effect.clueId}>{effect.clueId} (تعریف‌نشده)</option>
              )}
            </select>
          ) : (
            <select
              className="field__select"
              value={effect.variable}
              aria-label={`متغیر اثر ${index + 1}`}
              onChange={(event) => onUpdate(index, { ...effect, variable: event.target.value })}
            >
              {variables.map((name) => (
                <option key={name} value={name}>
                  {variableLabels[name]?.label ?? name}
                </option>
              ))}
              {!variables.includes(effect.variable) && (
                <option value={effect.variable}>{effect.variable} (تعریف‌نشده)</option>
              )}
            </select>
          )}

          {effect.kind === 'incrementVariable' && (
            <input
              className="field__input field__input--narrow"
              type="number"
              aria-label={`مقدار اثر ${index + 1}`}
              value={effect.amount}
              onChange={(event) =>
                onUpdate(index, { ...effect, amount: Number(event.target.value) })
              }
            />
          )}

          {effect.kind === 'setVariable' && (
            <input
              className="field__input field__input--narrow"
              type="number"
              aria-label={`مقدار اثر ${index + 1}`}
              value={typeof effect.value === 'number' ? effect.value : 0}
              onChange={(event) => onUpdate(index, { ...effect, value: Number(event.target.value) })}
            />
          )}

          <span className="effect-row__tools">
            <button type="button" className="mini" onClick={() => onMove(index, -1)} aria-label="بالا">
              ↑
            </button>
            <button type="button" className="mini" onClick={() => onMove(index, 1)} aria-label="پایین">
              ↓
            </button>
            <button
              type="button"
              className="mini mini--danger"
              onClick={() => onRemove(index)}
              aria-label={`حذف اثر ${index + 1}`}
            >
              حذف
            </button>
          </span>
        </div>
      ))}

      <div className="effect-add">
        <button
          type="button"
          className="secondary"
          onClick={() =>
            onAdd({ kind: 'incrementVariable', variable: variables[0] ?? 'composure', amount: 1 })
          }
        >
          + افزودن به متغیر
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            const first = clues[0];
            if (first !== undefined) {
              onAdd({ kind: 'discoverClue', clueId: first.id });
            }
          }}
          disabled={clues.length === 0}
        >
          + کشف یافته
        </button>
      </div>
    </div>
  );
}

function blankEffect(
  kind: string,
  variables: readonly string[],
  previous: StateEffect | undefined,
): StateEffect {
  const variable = previous !== undefined && 'variable' in previous ? previous.variable : variables[0] ?? 'composure';
  switch (kind) {
    case 'setVariable':
      return { kind: 'setVariable', variable, value: 0 };
    case 'unsetVariable':
      return { kind: 'unsetVariable', variable };
    case 'discoverClue':
      return { kind: 'discoverClue', clueId: 'clue' };
    default:
      return { kind: 'incrementVariable', variable, amount: 1 };
  }
}
