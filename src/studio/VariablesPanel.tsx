/**
 * The variables panel: the story's state, in one table.
 *
 * Each row is a declared variable with its starting value and the words the
 * player will see for it. Deleting is refused while the variable is still used by
 * a condition or an effect, and the panel says where — a dangling reference would
 * make the whole pack invalid, and finding it by reading 32 scenes is not a
 * reasonable ask.
 */
import { useState } from 'react';
import type { StateValue, VariableMeta } from '../story/engine';
import { toPersianDigits } from '../ui/format';
import type { StudioDraft } from './model';
import { initialVariable, variableNames, variableUsages } from './model';

interface VariablesPanelProps {
  readonly draft: StudioDraft;
  readonly onChangeLabel: (name: string, meta: VariableMeta) => void;
  readonly onChangeInitial: (name: string, value: StateValue) => void;
  readonly onAdd: (name: string) => void;
  readonly onRemove: (name: string) => void;
}

export function VariablesPanel({
  draft,
  onChangeLabel,
  onChangeInitial,
  onAdd,
  onRemove,
}: VariablesPanelProps): React.ReactElement {
  const [newName, setNewName] = useState('');
  const names = variableNames(draft);

  return (
    <section className="variables">
      <p className="muted small">
        متغیرها همان چیزی‌اند که شرط‌ها و اثرها به آن نگاه می‌کنند. نام فارسی‌شان در بازی دیده می‌شود.
      </p>
      <div className="variables__table">
        {names.map((name) => {
          const usages = variableUsages(draft, name);
          const meta = draft.story.variableMeta?.[name];
          const value = initialVariable(draft, name);
          return (
            <div className="variable-row" key={name}>
              <input
                className="field__input"
                aria-label={`نام فارسی ${name}`}
                value={meta?.label ?? ''}
                placeholder={name}
                onChange={(event) => onChangeLabel(name, { ...meta, label: event.target.value })}
              />
              <input
                className="field__input"
                aria-label={`توضیح ${name}`}
                value={meta?.hint ?? ''}
                placeholder="توضیح یک‌خطی"
                onChange={(event) => onChangeLabel(name, { ...(meta ?? { label: name }), hint: event.target.value })}
              />
              <input
                className="field__input field__input--narrow"
                type="number"
                aria-label={`مقدار اولیهٔ ${name}`}
                value={typeof value === 'number' ? value : 0}
                onChange={(event) => onChangeInitial(name, Number(event.target.value))}
              />
              <span className="variable-row__usage" title={usages.join('\n')}>
                {usages.length === 0 ? 'بی‌استفاده' : `${toPersianDigits(usages.length)} ارجاع`}
              </span>
              <button
                type="button"
                className="mini mini--danger"
                disabled={usages.length > 0}
                title={usages.length > 0 ? usages.slice(0, 6).join('\n') : 'حذف متغیر'}
                onClick={() => onRemove(name)}
              >
                حذف
              </button>
            </div>
          );
        })}
      </div>

      <div className="variables__add">
        <input
          className="field__input"
          placeholder="نام فنی متغیر تازه (لاتین)"
          aria-label="نام متغیر تازه"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <button
          type="button"
          className="secondary"
          disabled={newName.trim() === '' || names.includes(newName.trim())}
          onClick={() => {
            onAdd(newName);
            setNewName('');
          }}
        >
          + متغیر تازه
        </button>
      </div>
    </section>
  );
}
