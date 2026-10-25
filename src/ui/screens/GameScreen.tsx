import { ChoiceList } from '../components/ChoiceList';
import { NarrationBlock } from '../components/NarrationBlock';
import { toPersianDigits } from '../format';
import { toPersianError } from '../messages';
import type { StoryEngineError } from '../../story/engine';
import type { SceneViewModel } from '../../story/state/sceneView';

interface GameScreenProps {
  readonly view: SceneViewModel;
  readonly transitionCount: number;
  readonly lastError: StoryEngineError | null;
  readonly onSelect: (choiceId: string) => void;
  readonly onRestart: () => void;
}

export function GameScreen({
  view,
  transitionCount,
  lastError,
  onSelect,
  onRestart,
}: GameScreenProps): React.ReactElement {
  return (
    <main
      className="screen screen--game"
      style={{ background: view.asset.backdrop }}
      aria-label="صحنهٔ داستان"
    >
      <div className="game-topbar">
        <span className="game-topbar__step">صحنهٔ {toPersianDigits(view.step)}</span>
        <button type="button" className="button button--ghost" onClick={onRestart}>
          بازگشت به آغاز
        </button>
      </div>

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

        <ChoiceList choices={view.choices} onSelect={onSelect} />
      </div>
    </main>
  );
}
