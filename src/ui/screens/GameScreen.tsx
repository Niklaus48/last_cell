import { useState } from 'react';
import { ChoiceList } from '../components/ChoiceList';
import { NarrationBlock } from '../components/NarrationBlock';
import { TimedDecisionBanner } from '../components/TimedDecisionBanner';
import { toPersianDigits } from '../format';
import { toPersianError } from '../messages';
import type { StoryEngineError } from '../../story/engine';
import type { SceneViewModel } from '../../story/state/sceneView';
import type { ScenePresentation } from '../../presentation';
import { SceneBackdrop } from '../scene/SceneBackdrop';
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
          <button type="button" className="button button--ghost" onClick={onRestart}>
            بازگشت به آغاز
          </button>
        </span>
      </div>

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

        {timedDecision !== null && <TimedDecisionBanner countdown={timedDecision} />}

        <ChoiceList choices={view.choices} onSelect={onSelect} disabled={isCommitting} />
      </div>
    </main>
  );
}
