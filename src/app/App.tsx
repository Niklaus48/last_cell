import { useMemo } from 'react';
import { useStorySession } from './useStorySession';
import { toEndingViewModel, toSceneViewModel } from '../story/state/sceneView';
import type { StoryEngine, StoryEngineError, StoryState } from '../story/engine';
import { TitleScreen } from '../ui/screens/TitleScreen';
import { GameScreen } from '../ui/screens/GameScreen';
import { EndingScreen } from '../ui/screens/EndingScreen';

/**
 * Top-level screen router. It renders exclusively from data returned by the
 * story layer; it never decides which scene comes next.
 */
export function App(): React.ReactElement {
  const { engine, session, lastError, transitionCount, start, choose, restart } =
    useStorySession('demo');

  if (session.phase === 'title') {
    return <TitleScreen storyTitle={engine.story.title} onStart={start} />;
  }

  return (
    <PlaySession
      engine={engine}
      state={session.state}
      lastError={lastError}
      transitionCount={transitionCount}
      onChoose={choose}
      onRestart={restart}
    />
  );
}

interface PlaySessionProps {
  readonly engine: StoryEngine;
  readonly state: StoryState;
  readonly lastError: StoryEngineError | null;
  readonly transitionCount: number;
  readonly onChoose: (choiceId: string) => void;
  readonly onRestart: () => void;
}

function PlaySession({
  engine,
  state,
  lastError,
  transitionCount,
  onChoose,
  onRestart,
}: PlaySessionProps): React.ReactElement {
  const ending = useMemo(() => engine.getEnding(state), [engine, state]);

  if (ending !== null) {
    return <EndingScreen view={toEndingViewModel(ending, state)} onRestart={onRestart} />;
  }

  const scene = engine.getCurrentScene(state);
  const choices = engine.getAvailableChoices(state);
  const view = toSceneViewModel(scene, choices, state.history);

  return (
    <GameScreen
      view={view}
      transitionCount={transitionCount}
      lastError={lastError}
      onSelect={onChoose}
      onRestart={onRestart}
    />
  );
}
