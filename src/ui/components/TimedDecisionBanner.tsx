import { toPersianDigits } from '../format';
import type { ActiveTimedDecision } from '../../app/useTimedDecision';
import { countdownUrgency } from '../../app/timing';

interface TimedDecisionBannerProps {
  readonly countdown: ActiveTimedDecision;
}

/**
 * Countdown for a timed decision.
 *
 * The remaining time is shown as text first — a bar alone would be useless with
 * reduced motion, for screen readers, or on a bright screen. The bar is a visual
 * reinforcement with `role="progressbar"`, and it is the only part that moves.
 *
 * Screen readers are told about the *change of urgency* once, not about every
 * tick: the seconds line is not a live region.
 */
export function TimedDecisionBanner({ countdown }: TimedDecisionBannerProps): React.ReactElement {
  const urgency = countdownUrgency(countdown.remainingMs);
  const seconds = countdown.remainingSeconds;
  const percent = Math.max(0, Math.min(100, Math.round(countdown.fractionRemaining * 100)));

  return (
    <section
      className={`timed-decision timed-decision--${urgency}`}
      aria-labelledby="timed-decision-label"
    >
      <div className="timed-decision__head">
        <p id="timed-decision-label" className="timed-decision__label" aria-live="off">
          زمان تصمیم: {toPersianDigits(seconds)} ثانیه
        </p>
        <p className="timed-decision__hint">
          اگر تا پایان زمان تصمیمی نگیری، انتخاب پیش‌فرض این صحنه انجام می‌شود.
        </p>
      </div>

      <div
        className="timed-decision__track"
        role="progressbar"
        aria-label="زمان باقی‌مانده برای تصمیم"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span className="timed-decision__fill" style={{ inlineSize: `${percent}%` }} />
      </div>

      <span className="sr-only" role="status">
        {urgency === 'urgent' ? 'زمان تصمیم رو به پایان است.' : ''}
      </span>
    </section>
  );
}
