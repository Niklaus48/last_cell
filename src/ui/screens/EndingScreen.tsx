import { toPersianDigits } from '../format';
import type { EndingViewModel } from '../../story/state/sceneView';

interface EndingScreenProps {
  readonly view: EndingViewModel;
  readonly onRestart: () => void;
}

const toneLabels: Readonly<Record<EndingViewModel['ending']['tone'], string>> = {
  hopeful: 'پایان با روزنه',
  grim: 'پایان تلخ',
  ambiguous: 'پایان مبهم',
};

export function EndingScreen({ view, onRestart }: EndingScreenProps): React.ReactElement {
  return (
    <main className="screen screen--ending" aria-label="پایان روایت">
      <p className="ending-tone">{toneLabels[view.ending.tone]}</p>
      <h1 className="ending-title">{view.ending.title}</h1>
      <p className="ending-summary">{view.ending.summary}</p>

      <dl className="ending-stats">
        <div className="ending-stats__row">
          <dt>صحنه‌های دیده‌شده</dt>
          <dd>{toPersianDigits(view.visitedCount)}</dd>
        </div>
      </dl>

      <button type="button" className="button button--primary" onClick={onRestart}>
        بازگشت به آغاز
      </button>
      <p className="ending-footnote">پایان‌های دیگری هم در این فصل وجود دارند.</p>
    </main>
  );
}
