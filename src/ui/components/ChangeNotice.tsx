/**
 * What the choice you just made actually changed.
 *
 * The engine reports a diff (`variableChanges`, `discoveredClueIds`) for every
 * transition; this renders that diff in plain Persian, naming each variable by
 * its story label. It answers "what did that decision do?" without ever showing
 * future consequences or telling the player what to do next.
 *
 * Purely informational: it reads the engine's summary and nothing else, so it can
 * never influence the run.
 */
import type { StateChangeSummary, VariableMeta } from '../../story/engine';
import { describeVariableChange } from '../stateText';
import type { ChangeNoticeModel } from './changeNoticeModel';

interface ChangeNoticeProps {
  readonly notice: ChangeNoticeModel;
  readonly changes: StateChangeSummary;
  readonly meta: Readonly<Record<string, VariableMeta>>;
  readonly onDismiss: () => void;
}

export function ChangeNotice({ notice, changes, meta, onDismiss }: ChangeNoticeProps): React.ReactElement | null {
  const lines = changes.variableChanges
    .filter((change) => change.before !== change.after)
    .map((change) => describeVariableChange(change, meta));

  if (lines.length === 0 && changes.discoveredClueIds.length === 0) {
    return null;
  }

  return (
    <aside className="change-notice" role="status" aria-label="اثر تصمیم">
      <div className="change-notice__head">
        <span className="change-notice__title">
          اثر «{notice.choiceLabel ?? 'انتخاب تو'}»
        </span>
        <button
          type="button"
          className="button button--inline"
          onClick={onDismiss}
          aria-label="بستن پیام اثر تصمیم"
        >
          ×
        </button>
      </div>
      <ul className="change-notice__list">
        {lines.map((line) => (
          <li key={line} className="change-notice__item">
            {line}
          </li>
        ))}
        {changes.discoveredClueIds.length > 0 && (
          <li className="change-notice__item change-notice__item--clue">
            یافتهٔ تازه: {changes.discoveredClueIds.map((id) => notice.clueLabels[id] ?? id).join(' · ')}
          </li>
        )}
      </ul>
    </aside>
  );
}
