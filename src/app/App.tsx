import { useMemo } from 'react';
import { useStorySession } from './useStorySession';
import {
  toEndingViewModel,
  toFailureViewModel,
  toSceneViewModel,
} from '../story/state/sceneView';
import type { Checkpoint, StoryEngine, StoryEngineError, StoryState } from '../story/engine';
import { TitleScreen } from '../ui/screens/TitleScreen';
import { GameScreen } from '../ui/screens/GameScreen';
import { EndingScreen } from '../ui/screens/EndingScreen';
import { FailureScreen } from '../ui/screens/FailureScreen';

/**
 * Top-level screen router. It renders exclusively from data returned by the
 * story layer; it never decides which scene comes next, whether a choice is
 * legal, or what a failure recovers to.
 */
export function App(): React.ReactElement {
  const session = useStorySession('demo');

  if (session.session.phase === 'title') {
    return <TitleScreen storyTitle={session.engine.story.title} onStart={session.start} />;
  }

  return (
    <PlaySession
      engine={session.engine}
      state={session.session.state}
      lastError={session.lastError}
      transitionCount={session.transitionCount}
      checkpoints={session.checkpoints}
      onChoose={session.choose}
      onRestart={session.restart}
      onRecover={session.recover}
    />
  );
}

interface PlaySessionProps {
  readonly engine: StoryEngine;
  readonly state: StoryState;
  readonly lastError: StoryEngineError | null;
  readonly transitionCount: number;
  readonly checkpoints: readonly Checkpoint[];
  readonly onChoose: (choiceId: string) => void;
  readonly onRestart: () => void;
  readonly onRecover: () => void;
}

function PlaySession({
  engine,
  state,
  lastError,
  transitionCount,
  checkpoints,
  onChoose,
  onRestart,
  onRecover,
}: PlaySessionProps): React.ReactElement {
  const ending = useMemo(() => engine.getEnding(state), [engine, state]);
  const failure = useMemo(() => engine.getFailure(state), [engine, state]);

  if (ending !== null) {
    return <EndingScreen view={toEndingViewModel(ending, state)} onRestart={onRestart} />;
  }

  if (failure !== null) {
    const target = engine.getRecoveryTarget(state);
    const canRecover =
      target !== null &&
      checkpoints.some((checkpoint) => checkpoint.checkpointId === target.checkpointId);
    return (
      <FailureScreen
        view={toFailureViewModel(failure, state)}
        canRecover={canRecover}
        onRecover={onRecover}
        onRestart={onRestart}
      />
    );
  }

  const scene = engine.getCurrentScene(state);
  const choices = engine.getAvailableChoices(state);
  const view = toSceneViewModel(scene, choices, state.history);
  const checkpoint = engine.getCheckpointOpportunity(state);

  return (
    <GameScreen
      view={view}
      transitionCount={transitionCount}
      lastError={lastError}
      checkpointLabel={checkpoint?.label ?? null}
      onSelect={onChoose}
      onRestart={onRestart}
    />
  );
}
