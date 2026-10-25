/**
 * React binding for the story engine.
 *
 * This hook is the ONLY place where React and the engine meet. It holds the
 * `StoryState` snapshot returned by the engine and passes selections through.
 * It contains no transition rules: destination scenes, availability, effects and
 * endings all come back from `engine.choose(...)`.
 */
import { useCallback, useMemo, useState } from 'react';
import {
  createStoryEngine,
  type ChoiceId,
  type StoryEngine,
  type StoryEngineError,
  type StoryState,
  type StoryTransitionResult,
} from '../story/engine';
import { getStory, type StoryKey } from '../story/content';

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
  start: () => void;
  choose: (choiceId: ChoiceId) => void;
  restart: () => void;
}

export function useStorySession(storyKey: StoryKey = 'demo'): StorySession {
  const engine = useMemo(() => createStoryEngine(getStory(storyKey)), [storyKey]);
  const [session, setSession] = useState<SessionPhase>({ phase: 'title' });
  const [lastError, setLastError] = useState<StoryEngineError | null>(null);
  const [transitionCount, setTransitionCount] = useState(0);

  const start = useCallback(() => {
    setSession({ phase: 'playing', state: engine.start() });
    setLastError(null);
    setTransitionCount(0);
  }, [engine]);

  const choose = useCallback(
    (choiceId: ChoiceId) => {
      setSession((current) => {
        if (current.phase !== 'playing') {
          return current;
        }
        const result: StoryTransitionResult = engine.choose(current.state, {
          sceneId: current.state.currentSceneId,
          choiceId,
        });

        if (!result.ok) {
          // Rejections are surfaced through `lastError`; the run is untouched.
          setLastError(result.error);
          return current;
        }

        setLastError(null);
        setTransitionCount((count) => count + 1);
        return { phase: 'playing', state: result.state };
      });
    },
    [engine],
  );

  const restart = useCallback(() => {
    setSession({ phase: 'title' });
    setLastError(null);
    setTransitionCount(0);
  }, []);

  return { engine, session, lastError, transitionCount, start, choose, restart };
}
