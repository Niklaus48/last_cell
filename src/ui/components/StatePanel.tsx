/**
 * The player-facing state panel: what Kian currently *is*, not what he scores.
 *
 * Every row is a story variable with the label the story declares for it. Values
 * are shown plainly (Persian digits) and a changed row is marked for one scene so
 * the player can connect "what I chose" to "what shifted".
 *
 * It is a `<details>` element: the panel must be available at any moment, but it
 * must not push the narration or the Continue bar out of view on a phone.
 */
import type { VariableMeta } from '../../story/engine';
import { toPersianDigits } from '../format';

export interface StatePanelChange {
  readonly variable: string;
  readonly direction: 'up' | 'down' | 'flat' | null;
}

interface StatePanelProps {
  readonly variables: Readonly<Record<string, number | string | boolean>>;
  readonly meta: Readonly<Record<string, VariableMeta>>;
  /** Variables changed by the last choice, for the highlight. */
  readonly changes: readonly StatePanelChange[];
}

function formatValue(value: number | string | boolean): string {
  if (typeof value === 'number') {
    return toPersianDigits(value);
  }
  if (typeof value === 'boolean') {
    return value ? 'بله' : 'خیر';
  }
  return value;
}

export function StatePanel({ variables, meta, changes }: StatePanelProps): React.ReactElement {
  const changedByVariable = new Map(changes.map((change) => [change.variable, change.direction]));
  // Story order: whatever the story declared, then anything else the run carries.
  const keys = [...new Set([...Object.keys(meta), ...Object.keys(variables)])];

  return (
    <details className="state-panel">
      <summary className="state-panel__summary">
        وضعیت کیان
        {changes.length > 0 && <span className="state-panel__dot" aria-hidden="true" />}
      </summary>
      <ul className="state-panel__list">
        {keys.map((key) => {
          const direction = changedByVariable.get(key) ?? null;
          const label = meta[key]?.label ?? key;
          const hint = meta[key]?.hint;
          return (
            <li
              key={key}
              className={`state-row${direction === 'up' ? ' state-row--up' : ''}${
                direction === 'down' ? ' state-row--down' : ''
              }`}
            >
              <span className="state-row__label">
                {label}
                {hint !== undefined && <span className="state-row__hint">{hint}</span>}
              </span>
              <span className="state-row__value">
                {direction === 'up' && <span aria-hidden="true">↑ </span>}
                {direction === 'down' && <span aria-hidden="true">↓ </span>}
                {formatValue(variables[key] ?? 0)}
                {direction !== null && direction !== 'flat' && (
                  <span className="sr-only"> (تغییر کرد)</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
