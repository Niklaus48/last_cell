import { toPersianDigits } from '../format';
import type { FailureViewModel } from '../../story/state/sceneView';

interface FailureScreenProps {
  readonly view: FailureViewModel;
  /** True when a captured checkpoint can actually be returned to. */
  readonly canRecover: boolean;
  readonly onRecover: () => void;
  readonly onRestart: () => void;
}

/**
 * Shown for engine-reported failures. Reuses the ending layout on purpose: this
 * phase is about engine behaviour, not a new visual design.
 */
export function FailureScreen({
  view,
  canRecover,
  onRecover,
  onRestart,
}: FailureScreenProps): React.ReactElement {
  return (
    <main className="screen screen--ending" aria-label="شکست روایت">
      <p className="ending-tone">
        {view.recoverable ? 'شکست قابل جبران' : 'شکست پایانی'}
      </p>
      <h1 className="ending-title">{view.failure.title}</h1>
      <p className="ending-summary">{view.failure.summary}</p>

      <dl className="ending-stats">
        <div className="ending-stats__row">
          <dt>صحنه‌های دیده‌شده</dt>
          <dd>{toPersianDigits(view.visitedCount)}</dd>
        </div>
      </dl>

      {view.recoverable && (
        <button
          type="button"
          className="button button--primary"
          onClick={onRecover}
          disabled={!canRecover}
        >
          بازگشت به آخرین نقطهٔ امن
        </button>
      )}

      {view.recoverable && !canRecover && (
        <p className="error-banner" role="status">
          نقطهٔ امنی برای بازگشت ثبت نشده است؛ فقط می‌توانی از آغاز شروع کنی.
        </p>
      )}

      {!view.recoverable && (
        <p className="ending-footnote">این شکست قابل جبران نیست.</p>
      )}

      <button type="button" className="button button--ghost" onClick={onRestart}>
        بازگشت به آغاز
      </button>
    </main>
  );
}
