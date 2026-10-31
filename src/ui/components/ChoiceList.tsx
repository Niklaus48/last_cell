import type { ChoiceAvailability } from '../../story/engine';
import { describeConditionLine, type ClueLabels, type VariableLabels } from '../stateText';

interface ChoiceListProps {
  readonly choices: readonly ChoiceAvailability[];
  readonly onSelect: (choiceId: string) => void;
  readonly disabled?: boolean;
  readonly variableLabels: VariableLabels;
  readonly clueLabels: ClueLabels;
}

/**
 * The decision stage.
 *
 * Two things are deliberately visible here:
 *
 * 1. **Conditions.** A choice that depends on state says so, with the current
 *    value, so the player can see *why* an option exists (or why it just opened).
 * 2. **Locked options.** A choice whose condition fails is shown, disabled, with
 *    the requirement spelled out — never silently hidden. The player learns what
 *    the world asked of them instead of being left with a shorter menu and no
 *    explanation.
 *
 * Locked buttons are `disabled` and carry a reason; the engine refuses them as
 * well, so the UI is a convenience, not the guard.
 */
export function ChoiceList({
  choices,
  onSelect,
  disabled = false,
  variableLabels,
  clueLabels,
}: ChoiceListProps): React.ReactElement {
  if (choices.length === 0) {
    return (
      <p className="choice-list__empty" role="status">
        در این صحنه انتخابی پیش روی کیان نیست.
      </p>
    );
  }

  const available = choices.filter((entry) => entry.available);
  const locked = choices.filter((entry) => !entry.available);

  return (
    <>
      {available.length === 0 && (
        <p className="choice-list__empty" role="status">
          هیچ‌یک از انتخاب‌های این صحنه اکنون ممکن نیست.
        </p>
      )}

      <ul className="choice-list" aria-label="انتخاب‌ها">
        {available.map((entry, index) => (
          <ChoiceButton
            key={entry.choice.id}
            entry={entry}
            index={index}
            disabled={disabled}
            onSelect={onSelect}
            variableLabels={variableLabels}
            clueLabels={clueLabels}
          />
        ))}
      </ul>

      {locked.length > 0 && (
        <div className="locked-choices" aria-label="انتخاب‌های ناممکن">
          <p className="locked-choices__heading">راه‌هایی که اکنون بسته‌اند</p>
          <ul className="choice-list choice-list--locked">
            {locked.map((entry) => (
              <ChoiceButton
                key={entry.choice.id}
                entry={entry}
                disabled
                onSelect={onSelect}
                variableLabels={variableLabels}
                clueLabels={clueLabels}
              />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function ChoiceButton({
  entry,
  index,
  disabled,
  onSelect,
  variableLabels,
  clueLabels,
}: {
  readonly entry: ChoiceAvailability;
  readonly index?: number;
  readonly disabled: boolean;
  readonly onSelect: (choiceId: string) => void;
  readonly variableLabels: VariableLabels;
  readonly clueLabels: ClueLabels;
}): React.ReactElement {
  const conditionLine = describeConditionLine(entry.requirements, variableLabels, clueLabels);

  return (
    <li className="choice-list__item">
      <button
        type="button"
        // Locked entries get their own class: they are not selectable and must not
        // look like the clickable options a keyboard or a screen reader reaches.
        className={entry.available ? 'choice-button' : 'choice-button choice-button--locked'}
        onClick={(event) => {
          // `detail > 1` means this is the second click of a double click.
          // Ignoring it prevents a stray click landing on whichever choice
          // happens to sit at the same spot in the next scene.
          if (event.detail > 1) {
            return;
          }
          onSelect(entry.choice.id);
        }}
        disabled={disabled || !entry.available}
        aria-disabled={!entry.available}
        aria-describedby={conditionLine !== null ? `${entry.choice.id}-condition` : undefined}
      >
        <span className="choice-button__index" aria-hidden="true">
          {entry.available ? (index ?? 0) + 1 : '×'}
        </span>
        <span className="choice-button__body">
          <span className="choice-button__label">{entry.choice.label}</span>
          {conditionLine !== null && (
            <span
              className={
                entry.available ? 'choice-button__condition' : 'choice-button__condition choice-button__condition--unmet'
              }
              id={`${entry.choice.id}-condition`}
            >
              {conditionLine}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
