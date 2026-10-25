import type { ChoiceDefinition } from '../../story/engine';

interface ChoiceListProps {
  readonly choices: readonly ChoiceDefinition[];
  readonly onSelect: (choiceId: string) => void;
  readonly disabled?: boolean;
}

export function ChoiceList({ choices, onSelect, disabled = false }: ChoiceListProps): React.ReactElement {
  if (choices.length === 0) {
    return (
      <p className="choice-list__empty" role="status">
        در این صحنه انتخابی پیش روی کیان نیست.
      </p>
    );
  }

  return (
    <ul className="choice-list" aria-label="انتخاب‌ها">
      {choices.map((choice, index) => (
        <li key={choice.id} className="choice-list__item">
          <button
            type="button"
            className="choice-button"
            onClick={() => onSelect(choice.id)}
            disabled={disabled}
          >
            <span className="choice-button__index" aria-hidden="true">
              {index + 1}
            </span>
            <span className="choice-button__label">{choice.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
