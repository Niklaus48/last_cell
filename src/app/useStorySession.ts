/**
 * React binding for the story engine.
 *
 * This hook is the ONLY place where React and the engine meet. It holds the
 * `StoryState` snapshot returned by the engine, keeps the checkpoints the
 * engine creates for declared opportunities, and passes selections through.
 * It contains no transition, availability, checkpoint or recovery rules: all of
 * that comes back from the engine.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  createStoryEngine,
  type Checkpoint,
  type ChoiceId,
  type StoryEngine,
  type StoryEngineError,
  type StoryState,
} from '../story/engine';
import { DEFAULT_STORY_KEY, getStory, type StoryKey } from '../story/content';

export type SessionPhase =
  | { readonly phase: 'title' }
  | { readonly phase: 'playing'; readonly state: StoryState };

export interface StorySession {
  readonly engine: StoryEngine;
  readonly session: SessionPhase;
  /** Last rejected action, exposed so the UI can explain what happened. */
  readonly lastError: StoryEngineError | null;
  /** Increments on every successful transition (useful for re-triggering CSS). */
  readonly transitionCount: number;
  /** Checkpoints captured so far, newest per declared checkpoint id. */
  readonly checkpoints: readonly Checkpoint[];
  start: () => void;
  choose: (choiceId: ChoiceId) => void;
  restart: () => void;
  /** Returns to the checkpoint the current failure declares. */
  recover: () => void;
}

const missingCheckpointError: StoryEngineError = {
  code: 'NO_RECOVERY_TARGET',
  message: 'No captured checkpoint matches this failure.',
};

export function useStorySession(storyKey: StoryKey = DEFAULT_STORY_KEY): StorySession {
  const engine = useMemo(() => createStoryEngine(getStory(storyKey)), [storyKey]);
  const [session, setSession] = useState<SessionPhase>({ phase: 'title' });
  const [lastError, setLastError] = useState<StoryEngineError | null>(null);
  const [transitionCount, setTransitionCount] = useState(0);
  const [checkpoints, setCheckpoints] = useState<readonly Checkpoint[]>([]);

  const start = useCallback(() => {
    setSession({ phase: 'playing', state: engine.start() });
    setLastError(null);
    setTransitionCount(0);
    setCheckpoints([]);
  }, [engine]);

  const choose = useCallback(
    (choiceId: ChoiceId) => {
      if (session.phase !== 'playing') {
        return;
      }
      const result = engine.choose(session.state, {
        sceneId: session.state.currentSceneId,
        choiceId,
      });

      if (!result.ok) {
        // Rejections are surfaced through `lastError`; the run is untouched.
        setLastError(result.error);
        return;
      }

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
    },
    [engine, session],
  );

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

    setLastError(null);
    setTransitionCount((count) => count + 1);
    setSession({ phase: 'playing', state: restored.state });
  }, [checkpoints, engine, session]);

  const restart = useCallback(() => {
    setSession({ phase: 'title' });
    setLastError(null);
    setTransitionCount(0);
    setCheckpoints([]);
  }, []);

  return {
    engine,
    session,
    lastError,
    transitionCount,
    checkpoints,
    start,
    choose,
    restart,
    recover,
  };
}
