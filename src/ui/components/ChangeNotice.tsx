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
import { useRef } from 'react';
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
  const cardRef = useRef<HTMLElement | null>(null);
  const lines = changes.variableChanges
    .filter((change) => change.before !== change.after)
    .map((change) => describeVariableChange(change, meta));

  if (lines.length === 0 && changes.discoveredClueIds.length === 0) {
    return null;
  }

  /*
   * Closing is animated in both directions: the card settles in on mount (CSS
   * below, staggered per line) and folds away on dismiss. The exit uses the Web
   * Animations API because a CSS transition cannot finish a removal — but it is
   * still presentation only: the dismissal promise always resolves into
   * `onDismiss`, and any environment without `Element.animate` (jsdom, very old
   * browsers) or with reduced motion closes immediately.
   */
  function handleDismiss(): void {
    const card = cardRef.current;
    const reduceMotion =
      typeof globalThis.matchMedia === 'function' &&
      globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!card || reduceMotion || typeof card.animate !== 'function') {
      onDismiss();
      return;
    }

    const animation = card.animate(
      [
        { opacity: 1, transform: 'translateY(0) scale(1)' },
        { opacity: 0, transform: 'translateY(-6px) scale(0.985)' },
      ],
      { duration: 180, easing: 'ease-in', fill: 'forwards' },
    );
    animation.finished.then(onDismiss, onDismiss);
  }

  const items = [
    ...lines.map((line, index) => ({ text: line, clue: false, order: index })),
    ...(changes.discoveredClueIds.length > 0
      ? [
          {
            text: `یافتهٔ تازه: ${changes.discoveredClueIds
              .map((id) => notice.clueLabels[id] ?? id)
              .join(' · ')}`,
            clue: true,
            order: lines.length,
          },
        ]
      : []),
  ];

  return (
    <aside className="change-notice" role="status" aria-label="اثر تصمیم" ref={cardRef}>
      <div className="change-notice__head">
        <span className="change-notice__title">
          اثر «{notice.choiceLabel ?? 'انتخاب تو'}»
        </span>
        <button
          type="button"
          className="button button--inline"
          onClick={handleDismiss}
          aria-label="بستن پیام اثر تصمیم"
        >
          ×
        </button>
      </div>
      <ul className="change-notice__list">
        {items.map((item) => (
          <li
            key={item.text}
            className={item.clue ? 'change-notice__item change-notice__item--clue' : 'change-notice__item'}
            style={{ ['--order' as string]: String(item.order) }}
          >
            {item.text}
          </li>
        ))}
      </ul>
    </aside>
  );
}
