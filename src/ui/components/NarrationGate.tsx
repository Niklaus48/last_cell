import type { ChoiceAnnouncement, NarrationPhase } from '../../app/narrationFlow';

interface NarrationGateProps {
  readonly phase: NarrationPhase;
  readonly announcement: ChoiceAnnouncement | null;
  readonly onContinue: () => void;
}

const CONTINUE_LABEL = 'ادامه';

/**
 * The two reading stages of a scene: the narration pause and the narrator's
 * choice announcement.
 *
 * Both offer the same explicit Continue action, and both also complete on their
 * own after the configured reading pause. Manual and automatic completion are
 * mutually exclusive — they call the same guarded function — so the stage can
 * only ever advance once.
 *
 * The button is a normal `button` with visible focus, keyboard reachable, and it
 * is never disabled: the player can always move on before the pause expires.
 */
export function NarrationGate({
  phase,
  announcement,
  onContinue,
}: NarrationGateProps): React.ReactElement {
  const isAnnouncement = phase === 'choice_announcement';

  return (
    <div className="narration-gate" data-flow-phase={phase}>
      {isAnnouncement && announcement !== null && (
        <section
          className="choice-announcement"
          aria-label={announcement.heading}
          data-testid="choice-announcement"
        >
          <h3 className="choice-announcement__heading">{announcement.heading}</h3>
          <p className="choice-announcement__lead">{announcement.lead}</p>
          <ol className="choice-announcement__list">
            {announcement.options.map((option, index) => (
              // Text only: the labels are what the story already says, and they
              // are not selectable until the choices stage.
              <li key={`${index}-${option}`} className="choice-announcement__item">
                {option}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="narration-gate__actions">
        <button type="button" className="button button--primary" onClick={onContinue}>
          {CONTINUE_LABEL}
        </button>
        <p className="narration-gate__hint" role="note">
          {isAnnouncement
            ? 'انتخاب‌ها پس از این اعلام در دسترس قرار می‌گیرند.'
            : 'برای ادامهٔ روایت، «ادامه» را انتخاب کن؛ روایت خودبه‌خود هم پیش می‌رود.'}
        </p>
      </div>
    </div>
  );
}
