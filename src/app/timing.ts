/**
 * Countdown arithmetic for timed story decisions.
 *
 * Pure functions only: no React, no DOM, no timers. The hook that owns the
 * interval (`useTimedDecision`) and the caption component both derive what they
 * show from here, so the remaining time can never be computed two different
 * ways in two different places.
 *
 * The remaining time is always derived from an absolute deadline and the
 * current reading of a monotonic clock. Nothing decrements a counter, so a late
 * or skipped interval callback (a throttled background tab, a busy main thread)
 * cannot make the countdown drift or stretch.
 */

export interface CountdownSnapshot {
  /** Total time the decision allows, in milliseconds. */
  readonly durationMs: number;
  /** Milliseconds left, clamped to `[0, durationMs]`. */
  readonly remainingMs: number;
  /** Whole seconds left, rounded up so the last second is never shown as zero early. */
  readonly remainingSeconds: number;
  /** Fraction of the decision still ahead, in `[0, 1]`. */
  readonly fractionRemaining: number;
  /** True once `nowMs` reached the deadline. */
  readonly isExpired: boolean;
}

/** Deadline for a decision that starts at `startMs`. */
export function deadlineFrom(startMs: number, durationMs: number): number {
  return startMs + durationMs;
}

export function computeCountdown(
  durationMs: number,
  deadlineMs: number,
  nowMs: number,
): CountdownSnapshot {
  const safeDuration = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 0;
  const raw = deadlineMs - nowMs;
  const remainingMs = Math.max(0, Math.min(safeDuration, raw));
  return {
    durationMs: safeDuration,
    remainingMs,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    fractionRemaining: safeDuration === 0 ? 0 : remainingMs / safeDuration,
    isExpired: raw <= 0,
  };
}

/** Expiry threshold for the restrained screen-reader warning. */
export const URGENT_REMAINING_MS = 3000;

/**
 * How urgent a countdown is, as a coarse bucket.
 *
 * Deliberately coarse: the UI announces bucket changes, never individual ticks,
 * so a screen reader is not flooded with a value changing ten times a second.
 */
export type CountdownUrgency = 'calm' | 'urgent';

export function countdownUrgency(remainingMs: number): CountdownUrgency {
  return remainingMs <= URGENT_REMAINING_MS ? 'urgent' : 'calm';
}

/** Tick interval for the countdown display (5 updates per second). */
export const COUNTDOWN_TICK_MS = 200;
