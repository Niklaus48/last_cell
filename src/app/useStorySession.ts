/**
 * React binding for the story engine.
 *
 * This hook is the ONLY place where React and the engine meet. It holds the
 * `StoryState` snapshot returned by the engine, keeps the checkpoints the
 * engine creates for declared opportunities, runs the countdown for scenes that
 * declare a timed decision, and passes selections through. It contains no
 * transition, availability, checkpoint or recovery rules: all of that comes back
 * from the engine.
 *
 * Persistence lives outside as well: this hook only decides *when* to call the
 * save layer and how to report the outcome. It never inspects snapshot JSON.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  createStoryEngine,
  type Checkpoint,
  type ChoiceId,
  type SceneId,
  type StoryEngine,
  type StoryEngineError,
  type StoryState,
} from '../story/engine';
import { DEFAULT_STORY_KEY, getStory, type StoryKey } from '../story/content';
import {
  createLocalStorageSaveStorage,
  inspectSave,
  loadSession,
  rebuildCheckpoints,
  saveSession,
  type SaveAvailability,
  type SaveStorage,
} from '../persistence';
import {
  LOAD_SUCCESS_MESSAGE,
  SAVE_SUCCESS_MESSAGE,
  toPersianSaveMessage,
} from '../ui/messages';
import { useTimedDecision, type ActiveTimedDecision, type TimedDecisionExpiry } from './useTimedDecision';

export type SessionPhase =
  | { readonly phase: 'title' }
  | { readonly phase: 'playing'; readonly state: StoryState };

export interface SaveFeedback {
  readonly kind: 'success' | 'error';
  readonly message: string;
}

export interface StorySession {
  readonly engine: StoryEngine;
  readonly session: SessionPhase;
  /** Last rejected action, exposed so the UI can explain what happened. */
  readonly lastError: StoryEngineError | null;
  /** Increments on every successful transition (useful for re-triggering CSS). */
  readonly transitionCount: number;
  /** Checkpoints captured so far, newest per declared checkpoint id. */
  readonly checkpoints: readonly Checkpoint[];
  /** True while a transition or a save/load is being applied (re-entrancy guard). */
  readonly isCommitting: boolean;
  /** Live countdown for the current scene, or null when the scene is untimed. */
  readonly timedDecision: ActiveTimedDecision | null;
  /** Whether a resume-able local save exists (validated, not just present). */
  readonly saveAvailability: SaveAvailability;
  /** False when the browser refuses local storage entirely. */
  readonly storageAvailable: boolean;
  readonly saveFeedback: SaveFeedback | null;
  start: () => void;
  choose: (choiceId: ChoiceId) => void;
  restart: () => void;
  /** Returns to the checkpoint the current failure declares. */
  recover: () => void;
  /** Writes the current run to local storage. */
  save: () => void;
  /** Restores the stored run, replacing the current session only on success. */
  load: () => void;
  dismissSaveFeedback: () => void;
}

const missingCheckpointError: StoryEngineError = {
  code: 'NO_RECOVERY_TARGET',
  message: 'No captured checkpoint matches this failure.',
};

const unavailableChoiceError: StoryEngineError = {
  code: 'CHOICE_UNAVAILABLE',
  message: 'The timed default choice is not selectable in this scene.',
};

const noStorageError: StoryEngineError = {
  code: 'INVALID_SNAPSHOT',
  message: 'Local storage is unavailable; nothing could be saved.',
};

export interface UseStorySessionOptions {
  /**
   * Storage override for tests. Omitted uses the browser adapter; `null`
   * simulates a browser that refuses local storage.
   */
  readonly storage?: SaveStorage | null | undefined;
  /**
   * Monotonic clock for timed decisions. Omitted uses `performance.now()`;
   * tests inject a manual clock so background-tab behaviour is deterministic.
   */
  readonly now?: (() => number) | undefined;
}

export function useStorySession(
  storyKey: StoryKey = DEFAULT_STORY_KEY,
  options: UseStorySessionOptions = {},
): StorySession {
  const engine = useMemo(() => createStoryEngine(getStory(storyKey)), [storyKey]);
  const [storage] = useState<SaveStorage | null>(() =>
    options.storage === undefined ? createLocalStorageSaveStorage() : options.storage,
  );

  const [session, setSession] = useState<SessionPhase>({ phase: 'title' });
  const [lastError, setLastError] = useState<StoryEngineError | null>(null);
  const [transitionCount, setTransitionCount] = useState(0);
  const [checkpoints, setCheckpoints] = useState<readonly Checkpoint[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null);
  /** Identity of the current session; a new value restarts any countdown. */
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const [saveAvailability, setSaveAvailability] = useState<SaveAvailability>(() => {
    if (storage === null) {
      return { status: 'none' };
    }
    return inspectSave({ storage, engine, storyKey });
  });

  /**
   * Re-entrancy guard. A doubled click, a timeout firing in the same tick as a
   * click, and a stale timer from a previous scene all funnel through `commit`,
   * so a simple "am I already inside?" flag makes double application impossible.
   */
  const commitRef = useRef(false);
  /**
   * The state object that has already consumed a choice. Applying a second
   * choice to the very same state object is exactly the duplicate-transition
   * bug we need to prevent (two handlers sharing one stale closure).
   */
  const consumedRef = useRef<StoryState | null>(null);

  const commit = useCallback(
    (sceneId: SceneId, choiceId: ChoiceId, options: { requireAvailable: boolean }): boolean => {
      if (session.phase !== 'playing') {
        return false;
      }
      const state = session.state;

      // Stale request: the run has already moved on from the scene that asked.
      if (state.currentSceneId !== sceneId) {
        return false;
      }
      // Duplicate: this exact state already applied a choice.
      if (consumedRef.current === state) {
        return false;
      }
      if (commitRef.current) {
        return false;
      }
      if (state.progress.status !== 'playing') {
        return false;
      }

      commitRef.current = true;
      setIsCommitting(true);
      try {
        if (options.requireAvailable && !engine.isChoiceAvailable(state, choiceId)) {
          // A timed default must never be forced through when it is unavailable.
          setLastError(unavailableChoiceError);
          return false;
        }

        const result = engine.choose(state, { sceneId, choiceId });
        if (!result.ok) {
          setLastError(result.error);
          return false;
        }

        consumedRef.current = state;
        setLastError(null);
        setTransitionCount((count) => count + 1);
        setSession({ phase: 'playing', state: result.state });

        // Only scenes whose content declares a checkpoint are snapshotted.
        const opportunity = engine.getCheckpointOpportunity(result.state);
        if (opportunity !== null) {
          const created = engine.createCheckpoint(result.state, opportunity.id);
          if (created.ok) {
            const checkpoint = created.checkpoint;
            setCheckpoints((current) => [
              ...current.filter((entry) => entry.checkpointId !== checkpoint.checkpointId),
              checkpoint,
            ]);
          } else {
            setLastError(created.error);
          }
        }
        return true;
      } finally {
        commitRef.current = false;
        setIsCommitting(false);
      }
    },
    [engine, session],
  );

  const start = useCallback(() => {
    const initial = engine.start();
    consumedRef.current = null;
    setSessionEpoch((epoch) => epoch + 1);
    setSession({ phase: 'playing', state: initial });
    setLastError(null);
    setTransitionCount(0);
    setCheckpoints([]);
    setSaveFeedback(null);
  }, [engine]);

  const choose = useCallback(
    (choiceId: ChoiceId) => {
      if (session.phase !== 'playing') {
        return;
      }
      commit(session.state.currentSceneId, choiceId, { requireAvailable: false });
    },
    [commit, session],
  );

  const onTimedExpiry = useCallback(
    ({ sceneId, choiceId }: TimedDecisionExpiry) => {
      // Same path as a manual selection: conditions, effects, checkpoints,
      // history and transition validation all run exactly once, in the engine.
      commit(sceneId, choiceId, { requireAvailable: true });
    },
    [commit],
  );

  const timedDecision = useTimedDecision({
    engine,
    state: session.phase === 'playing' ? session.state : null,
    active: session.phase === 'playing',
    onExpire: onTimedExpiry,
    now: options.now,
    epoch: sessionEpoch,
  });

  const recover = useCallback(() => {
    if (session.phase !== 'playing') {
      return;
    }
    const target = engine.getRecoveryTarget(session.state);
    if (target === null) {
      setLastError(missingCheckpointError);
      return;
    }
    const checkpoint = checkpoints.find(
      (entry) => entry.checkpointId === target.checkpointId,
    );
    if (checkpoint === undefined) {
      setLastError(missingCheckpointError);
      return;
    }

    const restored = engine.recover(session.state, checkpoint);
    if (!restored.ok) {
      setLastError(restored.error);
      return;
    }

    consumedRef.current = null;
    setSessionEpoch((epoch) => epoch + 1);
    setLastError(null);
    setTransitionCount((count) => count + 1);
    setSession({ phase: 'playing', state: restored.state });
  }, [checkpoints, engine, session]);

  const restart = useCallback(() => {
    consumedRef.current = null;
    setSessionEpoch((epoch) => epoch + 1);
    setSession({ phase: 'title' });
    setLastError(null);
    setTransitionCount(0);
    setCheckpoints([]);
    setSaveFeedback(null);
    if (storage !== null) {
      setSaveAvailability(inspectSave({ storage, engine, storyKey }));
    }
  }, [engine, storage, storyKey]);

  const save = useCallback(() => {
    if (storage === null) {
      setLastError(noStorageError);
      setSaveFeedback({ kind: 'error', message: toPersianSaveMessage('STORAGE_UNAVAILABLE') });
      return;
    }
    if (session.phase !== 'playing') {
      return;
    }

    const result = saveSession({ storage, engine, storyKey, state: session.state });
    if (!result.ok) {
      // A failed write is reported as a failure; the in-memory run is untouched
      // and any previously valid save is left exactly as it was.
      setSaveFeedback({ kind: 'error', message: toPersianSaveMessage(result.error) });
      return;
    }

    setSaveFeedback({ kind: 'success', message: SAVE_SUCCESS_MESSAGE });
    setSaveAvailability({ status: 'valid', savedAt: result.savedAt });
  }, [engine, session, storage, storyKey]);

  const load = useCallback(() => {
    if (storage === null) {
      setSaveFeedback({ kind: 'error', message: toPersianSaveMessage('STORAGE_UNAVAILABLE') });
      return;
    }

    const result = loadSession({ storage, engine, storyKey });
    if (!result.ok) {
      // Never replace a working session with a broken save.
      setSaveFeedback({ kind: 'error', message: toPersianSaveMessage(result.error) });
      setSaveAvailability(
        result.error === 'NO_SAVE'
          ? { status: 'none' }
          : { status: 'invalid', error: result.error },
      );
      return;
    }

    consumedRef.current = null;
    setSessionEpoch((epoch) => epoch + 1);
    setLastError(null);
    setTransitionCount((count) => count + 1);
    setCheckpoints(rebuildCheckpoints(engine, result.state));
    setSession({ phase: 'playing', state: result.state });
    setSaveFeedback({ kind: 'success', message: LOAD_SUCCESS_MESSAGE });
    setSaveAvailability({ status: 'valid', savedAt: result.savedAt });
  }, [engine, storage, storyKey]);

  const dismissSaveFeedback = useCallback(() => {
    setSaveFeedback(null);
  }, []);

  return {
    engine,
    session,
    lastError,
    transitionCount,
    checkpoints,
    isCommitting,
    timedDecision,
    saveAvailability,
    storageAvailable: storage !== null,
    saveFeedback,
    start,
    choose,
    restart,
    recover,
    save,
    load,
    dismissSaveFeedback,
  };
}
