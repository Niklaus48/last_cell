/**
 * Countdown for declarative timed decisions.
 *
 * The story data already declares which scenes are timed and what happens when
 * time runs out (`SceneDefinition.timedDecision`). This hook is the only place
 * that turns that data into a running clock; it never decides *what* to do on
 * timeout beyond naming the declared default choice, and it never touches story
 * rules — it simply asks the session to apply that choice like any other.
 *
 * Guarantees, each covered by a test:
 * - one countdown per decision, keyed by scene + path length, so a re-render
 *   (including a countdown tick) never restarts it or replays narration;
 * - the default fires at most once, and a manual choice in the same tick wins;
 * - the interval is cleared when the scene changes, the run ends, the session is
 *   replaced (load/recover/restart) or the component unmounts;
 * - remaining time is derived from a deadline and a monotonic clock, so a
 *   throttled background tab catches up instead of stretching the decision.
 */
import { useEffect, useRef, useState } from 'react';
import type { ChoiceId, SceneId, StoryEngine, StoryState } from '../story/engine';
import {
  COUNTDOWN_TICK_MS,
  computeCountdown,
  deadlineFrom,
  type CountdownSnapshot,
} from './timing';

export interface TimedDecisionExpiry {
  readonly sceneId: SceneId;
  readonly choiceId: ChoiceId;
}

export interface ActiveTimedDecision extends CountdownSnapshot {
  /** Identity of this countdown: scene + how far along the path the run is. */
  readonly key: string;
  readonly sceneId: SceneId;
  readonly defaultChoiceId: ChoiceId;
}

export interface UseTimedDecisionOptions {
  readonly engine: StoryEngine;
  /** Current run state, or `null` while the title screen is showing. */
  readonly state: StoryState | null;
  /** False on the title screen and on any non-playable screen. */
  readonly active: boolean;
  /** Called at most once per decision, when the declared duration elapses. */
  readonly onExpire: (expiry: TimedDecisionExpiry) => void;
  /** Monotonic clock; injectable so tests can move time without sleeping. */
  readonly now?: (() => number) | undefined;
  /**
   * Bumped whenever the *session* is replaced (start, restart, recover, load).
   * A restored run standing in the same scene is a new decision: it must get the
   * full declared duration again rather than inherit the old deadline.
   */
  readonly epoch?: number;
  readonly tickMs?: number;
}

function defaultNow(): number {
  // performance.now() is monotonic and unaffected by system clock changes.
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

export function useTimedDecision({
  engine,
  state,
  active,
  onExpire,
  now,
  tickMs = COUNTDOWN_TICK_MS,
  epoch = 0,
}: UseTimedDecisionOptions): ActiveTimedDecision | null {
  const [countdown, setCountdown] = useState<ActiveTimedDecision | null>(null);

  // Callbacks and clock live in refs so that changing them (or re-rendering for
  // any other reason) does not restart a countdown that is already running.
  const onExpireRef = useRef(onExpire);
  const nowRef = useRef(now);

  useEffect(() => {
    onExpireRef.current = onExpire;
    nowRef.current = now;
  });

  const playable = active && state !== null && state.progress.status === 'playing';
  const scene = playable && state !== null ? engine.getCurrentScene(state) : null;
  const timed = scene?.timedDecision ?? null;

  const key =
    playable && state !== null && timed !== null
      ? `${epoch}#${state.currentSceneId}#${state.history.length}#${timed.durationMs}`
      : null;
  const sceneId = playable && state !== null ? state.currentSceneId : null;
  const durationMs = timed?.durationMs ?? 0;
  const defaultChoiceId = timed?.defaultChoiceId ?? null;

  useEffect(() => {
    if (key === null || sceneId === null || defaultChoiceId === null || durationMs <= 0) {
      // No decision in this scene (or none playable): nothing to announce. The
      // stale value is never exposed because the return below is key-filtered.
      return;
    }

    const readNow = (): number => (nowRef.current ?? defaultNow)();
    const deadline = deadlineFrom(readNow(), durationMs);
    let fired = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const stopTimer = (): void => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };

    const publish = (): void => {
      // A callback queued before cleanup must not touch a decision that is gone.
      if (fired && timer === null) {
        return;
      }
      const snapshot = computeCountdown(durationMs, deadline, readNow());
      setCountdown({ ...snapshot, key, sceneId, defaultChoiceId });

      if (snapshot.isExpired) {
        if (fired) {
          return;
        }
        fired = true;
        stopTimer();
        onExpireRef.current({ sceneId, choiceId: defaultChoiceId });
      }
    };

    publish();
    timer = setInterval(publish, tickMs);

    const onVisibilityChange = (): void => {
      // Timers are throttled in background tabs; on return we recompute from the
      // deadline, so an already-expired decision resolves exactly once.
      if (document.visibilityState === 'visible') {
        publish();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [key, sceneId, durationMs, defaultChoiceId, tickMs]);

  return countdown !== null && countdown.key === key ? countdown : null;
}
