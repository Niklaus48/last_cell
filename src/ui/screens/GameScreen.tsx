import { useState } from 'react';
import { ChoiceList } from '../components/ChoiceList';
import { StatePanel } from '../components/StatePanel';
import { ChangeNotice } from '../components/ChangeNotice';
import { changeDirection } from '../stateText';
import { NarrationBlock } from '../components/NarrationBlock';
import { TimedDecisionBanner } from '../components/TimedDecisionBanner';
import { toPersianDigits } from '../format';
import { toPersianError } from '../messages';
import type { ChoiceAvailability, StateChangeSummary, StoryEngineError, VariableMeta } from '../../story/engine';
import type { SceneViewModel } from '../../story/state/sceneView';
import type { ScenePresentation } from '../../presentation';
import { SceneBackdrop } from '../scene/SceneBackdrop';
import { ChoiceAnnouncement, NarrationGate } from '../components/NarrationGate';
import { useSceneAudio } from '../audio/useSceneAudio';
import type { NarrationFlowState } from '../../app/useNarrationFlow';
import type { ActiveTimedDecision } from '../../app/useTimedDecision';
import type { SaveFeedback } from '../../app/useStorySession';

interface GameScreenProps {
  readonly view: SceneViewModel;
  /** Resolved visual presentation of the current scene. */
  readonly presentation: ScenePresentation;
  readonly transitionCount: number;
  readonly lastError: StoryEngineError | null;
  /** Persian label when the engine created a checkpoint for this scene. */
  readonly checkpointLabel: string | null;
  /** Live countdown when the current scene declares a timed decision. */
  readonly timedDecision: ActiveTimedDecision | null;
  /** Narration stage of the scene: choices exist only in `choices_available`. */
  readonly flow: NarrationFlowState;
  /** Every choice of the scene, available or not, with the reasons behind it. */
  readonly choiceAvailability: readonly ChoiceAvailability[];
  /** Player-facing variable names declared by the story. */
  readonly variableMeta: Readonly<Record<string, VariableMeta>>;
  /** Live variable values of the run. */
  readonly variables: Readonly<Record<string, number | string | boolean>>;
  /** What the previous choice changed, shown once as a notice. */
  readonly lastChanges: StateChangeSummary | null;
  readonly lastChoiceLabel: string | null;
  readonly onDismissChanges: () => void;
  /** Clue id → label, for naming a discovery in the notice. */
  readonly clueLabels: Readonly<Record<string, string>>;
  /** Session identity; a new value restarts the scene's audio. */
  readonly sceneEpoch: number;
  readonly muted: boolean;
  readonly onToggleMuted: () => void;
  /** True while a transition or save/load is being applied. */
  readonly isCommitting: boolean;
  readonly storageAvailable: boolean;
  readonly hasSave: boolean;
  readonly onSave: () => void;
  readonly saveFeedback: SaveFeedback | null;
  readonly onDismissSaveFeedback: () => void;
  readonly onSelect: (choiceId: string) => void;
  readonly onRestart: () => void;
}

export function GameScreen({
  view,
  presentation,
  transitionCount,
  lastError,
  checkpointLabel,
  timedDecision,
  flow,
  choiceAvailability,
  variableMeta,
  variables,
  lastChanges,
  lastChoiceLabel,
  onDismissChanges,
  clueLabels,
  sceneEpoch,
  muted,
  onToggleMuted,
  isCommitting,
  storageAvailable,
  hasSave,
  onSave,
  saveFeedback,
  onDismissSaveFeedback,
  onSelect,
  onRestart,
}: GameScreenProps): React.ReactElement {
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  // Sound is best-effort: it never blocks reading, choices or the countdown.
  useSceneAudio({ sceneId: view.scene.id, epoch: sceneEpoch, muted });

  const requestSave = (): void => {
    // Overwriting is the destructive part, so it is the only part that asks.
    if (hasSave && !confirmOverwrite) {
      setConfirmOverwrite(true);
      return;
    }
    setConfirmOverwrite(false);
    onSave();
  };

  return (
    <main className="screen screen--game" aria-label="صحنهٔ داستان">
      <SceneBackdrop presentation={presentation} />

      <div className="game-topbar">
        <span className="game-topbar__step">
          صحنهٔ {toPersianDigits(view.step)}
          {checkpointLabel !== null && (
            <span className="game-topbar__checkpoint"> · نقطهٔ امن: {checkpointLabel}</span>
          )}
        </span>
        <span className="game-topbar__actions">
          <button
            type="button"
            className="button button--ghost"
            onClick={requestSave}
            disabled={!storageAvailable || isCommitting}
            aria-label="ذخیرهٔ بازی در همین مرورگر"
          >
            ذخیره
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={onToggleMuted}
            aria-pressed={muted}
            aria-label={muted ? 'روشن کردن صدا' : 'بی‌صدا کردن بازی'}
          >
            {muted ? 'صدا خاموش' : 'صدا روشن'}
          </button>
          <button type="button" className="button button--ghost" onClick={onRestart}>
            بازگشت به آغاز
          </button>
        </span>
      </div>

      <StatePanel
        variables={variables}
        meta={variableMeta}
        changes={
          lastChanges === null
            ? []
            : lastChanges.variableChanges.map((change) => ({
                variable: change.variable,
                direction: changeDirection(change),
              }))
        }
      />

      {confirmOverwrite && (
        <div className="confirm-row" role="group" aria-label="تأیید رونویسی ذخیره">
          <p className="confirm-row__text">ذخیرهٔ قبلی رونویسی شود؟</p>
          <button type="button" className="button button--secondary" onClick={requestSave}>
            بله، ذخیره کن
          </button>
          <button
            type="button"
            className="button button--inline"
            onClick={() => setConfirmOverwrite(false)}
          >
            انصراف
          </button>
        </div>
      )}

      {!storageAvailable && (
        <p className="save-notice save-notice--muted" role="status">
          ذخیره‌سازی محلی در این مرورگر در دسترس نیست.
        </p>
      )}

      {saveFeedback !== null && (
        <p
          className={saveFeedback.kind === 'error' ? 'error-banner' : 'save-notice'}
          role={saveFeedback.kind === 'error' ? 'alert' : 'status'}
        >
          {saveFeedback.message}
          <button
            type="button"
            className="button button--inline"
            onClick={onDismissSaveFeedback}
            aria-label="بستن پیام"
          >
            ×
          </button>
        </p>
      )}

      <div className="game-content">
        {lastChanges !== null && (
          <ChangeNotice
            notice={{ choiceLabel: lastChoiceLabel, variableLabels: variableMeta, clueLabels }}
            changes={lastChanges}
            meta={variableMeta}
            onDismiss={onDismissChanges}
          />
        )}

        <NarrationBlock
          title={view.scene.title}
          paragraphs={view.scene.narration}
          animationKey={transitionCount}
        />

        {lastError !== null && (
          <p className="error-banner" role="alert">
            {toPersianError(lastError.code)}
          </p>
        )}

        {/*
          Reading stages: the choices are not rendered at all, so there is no
          button to click, focus, or activate from the keyboard, and no countdown
          exists yet. The engine additionally refuses any choice while the gate
          is closed.
        */}
        {flow.canContinue && flow.announcement !== null && (
          <ChoiceAnnouncement announcement={flow.announcement} />
        )}

        {flow.canContinue && <NarrationGate phase={flow.phase} onContinue={flow.continue} />}

        {/* Decision stage: rendered only now, which is when the clock may start. */}
        {flow.choicesEnabled && timedDecision !== null && (
          <TimedDecisionBanner countdown={timedDecision} />
        )}

        {flow.choicesEnabled && (
          <ChoiceList
            choices={choiceAvailability}
            onSelect={onSelect}
            disabled={isCommitting}
            variableLabels={variableMeta}
            clueLabels={clueLabels}
          />
        )}
      </div>
    </main>
  );
}
