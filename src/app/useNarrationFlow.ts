/**
 * React binding for the narration-gated flow.
 *
 * Turns the pure sequence in `narrationFlow.ts` into a live stage with one
 * pending auto-advance timer at a time, and guarantees:
 *
 * - exactly one advance per stage: the Continue action and the reading-pause
 *   timer converge on the same guarded function, so a click landing just before
 *   the timer fires cannot skip a stage;
 * - every stage timer is keyed by the scene visit, so a new scene, a load, a
 *   restart, a recovery or an unmount always cancels the pending callback;
 * - no timer at all once the choices are available — the decision countdown is
 *   the only clock that may run from then on;
 * - nothing is persisted: the stage is derived from the session, so a restored
 *   run always begins at that scene's narration.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChoiceDefinition, StoryState } from '../story/engine';
import {
  announcementStageDurationMs,
  buildChoiceAnnouncement,
  choicesInteractive,
  flowKeyOf,
  initialPhase,
  narrationStageDurationMs,
  phaseAfter,
  stageKey,
  type ChoiceAnnouncement,
  type NarrationPhase,
  type NarrationTiming,
} from './narrationFlow';

export interface NarrationFlowState {
  /** Current stage of the scene. */
  readonly phase: NarrationPhase;
  /** Stable identity of this scene visit (null when no run is being played). */
  readonly key: string | null;
  /** Choices the engine reports as available right now (conditions applied). */
  readonly choices: readonly ChoiceDefinition[];
  /** What the narrator announces in `choice_announcement`, otherwise null. */
  readonly announcement: ChoiceAnnouncement | null;
  /** True while the choices may be selected. */
  readonly choicesEnabled: boolean;
  /** True while a Continue action is visible (the two reading stages). */
  readonly canContinue: boolean;
  /** Advances exactly one stage; safe to call repeatedly, and after unmount. */
  continue: () => void;
}

export interface UseNarrationFlowOptions {
  /** Current run state, or null when nothing is playable (title, ending…). */
  readonly state: StoryState | null;
  /** False outside a playable run; no timers run and no stage advances. */
  readonly active: boolean;
  /** Bumped whenever the session is replaced (start, restart, recover, load). */
  readonly epoch: number;
  /** Choices the engine reports as available for `state`. */
  readonly choices: readonly ChoiceDefinition[];
  /** How many narration paragraphs the current scene has (drives the pause). */
  readonly narrationParagraphs: number;
  /** Reading pauses; defaults to the central `NARRATION_TIMING`. */
  readonly timing?: NarrationTiming | undefined;
  /**
   * Per-scene reading pause from the content pack, in milliseconds. When set it
   * replaces the paragraph-scaled narration pause for this scene only.
   */
  readonly readingPauseMs?: number | undefined;
  /** Monotonic clock, injectable in tests. */
  readonly now?: (() => number) | undefined;
}

function defaultNow(): number {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

interface Snapshot {
  readonly key: string;
  readonly phase: NarrationPhase;
}

export function useNarrationFlow({
  state,
  active,
  epoch,
  choices,
  narrationParagraphs,
  timing,
  readingPauseMs,
  now,
}: UseNarrationFlowOptions): NarrationFlowState {
  const playable = active && state !== null && state.progress.status === 'playing';
  const key = playable && state !== null ? flowKeyOf(epoch, state.currentSceneId, state.history.length) : null;
  const hasChoices = choices.length > 0;

  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);

  /**
   * The current stage is derived, never stored: a snapshot belonging to another
   * scene visit is simply ignored, which is what resets the sequence on every
   * transition without an effect or an extra render.
   */
  const phase: NarrationPhase =
    key === null
      ? initialPhase()
      : snapshot !== null && snapshot.key === key
        ? snapshot.phase
        : initialPhase();

  /** Last stage this render has already advanced; makes advancing idempotent. */
  const advancedRef = useRef<string | null>(null);

  const advance = useCallback(() => {
    if (key === null) {
      return;
    }
    const currentStage = stageKey(key, phase);
    // The manual button and the pending auto-advance share this function: the
    // first one wins and the second becomes a no-op for the same stage.
    if (advancedRef.current === currentStage) {
      return;
    }
    const next = phaseAfter(phase, hasChoices);
    if (next === null) {
      return;
    }
    advancedRef.current = currentStage;
    setSnapshot({ key, phase: next });
  }, [key, phase, hasChoices]);

  /**
   * Always the newest pieces of `advance`/clock, so a queued timer callback can
   * never reach back into a stale render.
   */
  const advanceRef = useRef(advance);
  const nowRef = useRef(now);
  useEffect(() => {
    advanceRef.current = advance;
    nowRef.current = now;
  });

  useEffect(() => {
    if (key === null) {
      return;
    }
    // The pause scales with what there is to read, and is never negative.
    const duration =
      phase === 'scene_narration'
        ? (readingPauseMs ?? narrationStageDurationMs(narrationParagraphs, timing))
        : phase === 'choice_announcement'
          ? announcementStageDurationMs(choices.length, timing)
          : null;
    if (duration === null) {
      // Choices are available: no automatic progression of any kind.
      return;
    }

    const readNow = (): number => (nowRef.current ?? defaultNow)();
    const deadline = readNow() + duration;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const stopTimer = (): void => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const schedule = (): void => {
      stopTimer();
      const remaining = Math.max(0, deadline - readNow());
      timer = setTimeout(() => {
        timer = null;
        // Guarded inside `advance`: a click in the same tick still wins.
        advanceRef.current();
      }, remaining);
    };

    schedule();

    const onVisibilityChange = (): void => {
      // Background tabs throttle timers; on return the deadline decides, so a
      // stage the player already "waited out" completes immediately.
      if (document.visibilityState === 'visible') {
        if (deadline - readNow() <= 0) {
          advanceRef.current();
        } else {
          schedule();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [key, phase, timing, advance, narrationParagraphs, choices.length, readingPauseMs]);

  const announcement = useMemo(() => buildChoiceAnnouncement(choices), [choices]);

  return {
    phase,
    key,
    choices,
    announcement,
    choicesEnabled: key !== null && choicesInteractive(phase),
    canContinue: key !== null && !choicesInteractive(phase),
    continue: advance,
  };
}
