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
 * The result of a failed attempt.
 *
 * By the time this screen exists the player has already *read* the failure: the
 * mistake, the guards' reaction and the end of the attempt are scenes like any
 * other (see `scenes.failures.ts`), and the last thing they chose was to see the
 * outcome. So this screen never re-narrates the sequence — it names the cause,
 * says what it cost, and offers the only two honest ways forward:
 *
 * - «بازگشت به نقطهٔ امن» — a rewind of the attempt to the captured snapshot;
 * - «بازگشت به آغاز» — a new run.
 *
 * A fatal failure is worded separately: Kian did not get out of this one, so the
 * rewind is explicitly a rewind — never a rescue or a return to the cell.
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
        {view.fatal ? 'پایان تلخ این تلاش' : view.recoverable ? 'شکست قابل جبران' : 'شکست پایانی'}
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
          {view.fatal ? 'بازپخش تلاش از نقطهٔ امن' : 'بازگشت به آخرین نقطهٔ امن'}
        </button>
      )}

      {view.fatal && (
        <p className="ending-footnote">
          این تلاش با مرگ کیان پایان یافت؛ چیزی برای بازگرداندن او نیست. بازپخش، همین تلاش را از
          پیش از تصمیم آخر برمی‌گرداند.
        </p>
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
