/**
 * Countdown arithmetic. Vitest's Node environment: these are pure functions,
 * and they are the only place remaining time is computed.
 */
import { describe, expect, it } from 'vitest';
import {
  COUNTDOWN_TICK_MS,
  URGENT_REMAINING_MS,
  computeCountdown,
  countdownUrgency,
  deadlineFrom,
} from '../src/app/timing';

describe('computeCountdown', () => {
  it('starts at the full duration', () => {
    const snapshot = computeCountdown(12000, deadlineFrom(1000, 12000), 1000);
    expect(snapshot.remainingMs).toBe(12000);
    expect(snapshot.remainingSeconds).toBe(12);
    expect(snapshot.fractionRemaining).toBe(1);
    expect(snapshot.isExpired).toBe(false);
  });

  it('derives remaining time from the deadline, not from tick counting', () => {
    // One call 9 seconds in: identical result whether the interval ran 45 times
    // or was throttled in a background tab and never ran at all.
    const deadline = deadlineFrom(0, 12000);
    expect(computeCountdown(12000, deadline, 9000).remainingMs).toBe(3000);
    expect(computeCountdown(12000, deadline, 9000).remainingSeconds).toBe(3);
  });

  it('rounds whole seconds up, so the last second is never shown early', () => {
    const deadline = deadlineFrom(0, 12000);
    expect(computeCountdown(12000, deadline, 11100).remainingSeconds).toBe(1);
    expect(computeCountdown(12000, deadline, 11999).remainingSeconds).toBe(1);
  });

  it('clamps to zero and reports expiry at and past the deadline', () => {
    const deadline = deadlineFrom(0, 8000);
    for (const nowMs of [8000, 8001, 60000]) {
      const snapshot = computeCountdown(8000, deadline, nowMs);
      expect(snapshot.remainingMs).toBe(0);
      expect(snapshot.remainingSeconds).toBe(0);
      expect(snapshot.fractionRemaining).toBe(0);
      expect(snapshot.isExpired).toBe(true);
    }
  });

  it('never reports more than the declared duration (clock went backwards)', () => {
    const snapshot = computeCountdown(8000, deadlineFrom(0, 8000), -5000);
    expect(snapshot.remainingMs).toBe(8000);
    expect(snapshot.fractionRemaining).toBe(1);
  });

  it('treats a nonsensical duration as an already-finished decision', () => {
    for (const duration of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
      const snapshot = computeCountdown(duration, 1000, 0);
      expect(snapshot.durationMs).toBe(0);
      expect(snapshot.remainingMs).toBe(0);
      expect(snapshot.fractionRemaining).toBe(0);
    }
  });
});

describe('countdownUrgency', () => {
  it('is calm until the last few seconds, then urgent', () => {
    expect(countdownUrgency(12000)).toBe('calm');
    expect(countdownUrgency(URGENT_REMAINING_MS + 1)).toBe('calm');
    expect(countdownUrgency(URGENT_REMAINING_MS)).toBe('urgent');
    expect(countdownUrgency(0)).toBe('urgent');
  });

  it('uses a tick that is coarse enough to stay readable', () => {
    expect(COUNTDOWN_TICK_MS).toBeGreaterThanOrEqual(100);
    expect(COUNTDOWN_TICK_MS).toBeLessThanOrEqual(500);
  });
});
