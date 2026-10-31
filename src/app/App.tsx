import { useCallback, useMemo, useState } from 'react';
import { useStorySession } from './useStorySession';
import { DEFAULT_STORY_KEY, type StoryKey } from '../story/content';
import {
  toEndingViewModel,
  toFailureViewModel,
  toSceneViewModel,
} from '../story/state/sceneView';
import type { Checkpoint, StoryEngine, StoryEngineError, StoryState } from '../story/engine';
import type { ActiveTimedDecision } from './useTimedDecision';
import type { NarrationFlowState } from './useNarrationFlow';
import type { SaveAvailability, SaveStorage } from '../persistence';
import { getScenePresentation } from '../presentation';
import { readMuted, writeMuted } from '../ui/audio/mute';
import type { SaveFeedback } from './useStorySession';
import { SAVE_INVALID_HINT, SAVE_NONE_MESSAGE, SAVE_STORAGE_DISABLED_HINT } from '../ui/messages';
import { TitleScreen } from '../ui/screens/TitleScreen';
import { GameScreen } from '../ui/screens/GameScreen';
import { EndingScreen } from '../ui/screens/EndingScreen';
import { FailureScreen } from '../ui/screens/FailureScreen';

interface AppProps {
  /**
   * Which registered story to play. Only tests set this: they pin the
   * deterministic dev fixture so UI regressions stay isolated from content
   * edits. The shipped application always uses `DEFAULT_STORY_KEY`.
   */
  readonly storyKey?: StoryKey;
  /** Storage override for tests; `undefined` uses the browser adapter. */
  readonly storage?: SaveStorage | null;
}

/**
 * Top-level screen router. It renders exclusively from data returned by the
 * story layer; it never decides which scene comes next, whether a choice is
 * legal, what a failure recovers to, or what a countdown does.
 */
export function App({ storyKey = DEFAULT_STORY_KEY, storage }: AppProps = {}): React.ReactElement {
  const session = useStorySession(storyKey, { storage });
  const [muted, setMutedState] = useState<boolean>(() => readMuted());
  const toggleMuted = useCallback(() => {
    setMutedState((current) => {
      writeMuted(!current);
      return !current;
    });
  }, []);

  const resumeNote = describeSave(session.storageAvailable, session.saveAvailability);

  if (session.session.phase === 'title') {
    return (
      <TitleScreen
        storyTitle={session.engine.story.title}
        onStart={session.start}
        canResume={session.storageAvailable && session.saveAvailability.status === 'valid'}
        resumeNote={resumeNote}
        onResume={session.load}
        saveFeedback={session.saveFeedback}
        onDismissFeedback={session.dismissSaveFeedback}
      />
    );
  }

  return (
    <PlaySession
      engine={session.engine}
      state={session.session.state}
      lastError={session.lastError}
      transitionCount={session.transitionCount}
      checkpoints={session.checkpoints}
      timedDecision={session.timedDecision}
      flow={session.flow}
      sceneEpoch={session.sessionEpoch}
      muted={muted}
      onToggleMuted={toggleMuted}
      isCommitting={session.isCommitting}
      storageAvailable={session.storageAvailable}
      hasSave={session.saveAvailability.status === 'valid'}
      onSave={session.save}
      saveFeedback={session.saveFeedback}
      onDismissSaveFeedback={session.dismissSaveFeedback}
      onChoose={session.choose}
      onRestart={session.restart}
      onRecover={session.recover}
    />
  );
}

/** Persian, single-line explanation of the save situation on the title screen. */
function describeSave(storageAvailable: boolean, availability: SaveAvailability): string {
  if (!storageAvailable) {
    return SAVE_STORAGE_DISABLED_HINT;
  }
  if (availability.status === 'valid') {
    return 'یک ذخیرهٔ محلی معتبر در همین مرورگر هست.';
  }
  if (availability.status === 'invalid') {
    return SAVE_INVALID_HINT;
  }
  return SAVE_NONE_MESSAGE;
}

interface PlaySessionProps {
  readonly engine: StoryEngine;
  readonly state: StoryState;
  readonly lastError: StoryEngineError | null;
  readonly transitionCount: number;
  readonly checkpoints: readonly Checkpoint[];
  readonly timedDecision: ActiveTimedDecision | null;
  readonly flow: NarrationFlowState;
  readonly sceneEpoch: number;
  readonly muted: boolean;
  readonly onToggleMuted: () => void;
  readonly isCommitting: boolean;
  readonly storageAvailable: boolean;
  readonly hasSave: boolean;
  readonly onSave: () => void;
  readonly saveFeedback: SaveFeedback | null;
  readonly onDismissSaveFeedback: () => void;
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
  timedDecision,
  flow,
  sceneEpoch,
  muted,
  onToggleMuted,
  isCommitting,
  storageAvailable,
  hasSave,
  onSave,
  saveFeedback,
  onDismissSaveFeedback,
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
  // Pure lookup: story data + presentation metadata in, visuals out.
  const presentation = getScenePresentation(scene);

  return (
    <GameScreen
      view={view}
      presentation={presentation}
      transitionCount={transitionCount}
      lastError={lastError}
      checkpointLabel={checkpoint?.label ?? null}
      timedDecision={timedDecision}
      flow={flow}
      sceneEpoch={sceneEpoch}
      muted={muted}
      onToggleMuted={onToggleMuted}
      isCommitting={isCommitting}
      storageAvailable={storageAvailable}
      hasSave={hasSave}
      onSave={onSave}
      saveFeedback={saveFeedback}
      onDismissSaveFeedback={onDismissSaveFeedback}
      onSelect={onChoose}
      onRestart={onRestart}
    />
  );
}
