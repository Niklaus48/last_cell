import type { ChoiceAnnouncement as ChoiceAnnouncementModel, NarrationPhase } from '../../app/narrationFlow';

interface NarrationGateProps {
  readonly phase: NarrationPhase;
  readonly onContinue: () => void;
}

const CONTINUE_LABEL = 'ادامه';

/**
 * The narrator's choice announcement.
 *
 * Rendered as its own block (not inside the action bar) so that the action bar
 * below it can stick to the bottom of the viewport without dragging the
 * announcement along with it.
 */
export function ChoiceAnnouncement({
  announcement,
}: {
  readonly announcement: ChoiceAnnouncementModel;
}): React.ReactElement {
  return (
    <section
      className="choice-announcement"
      aria-label={announcement.heading}
      data-testid="choice-announcement"
    >
      <h3 className="choice-announcement__heading">{announcement.heading}</h3>
      <p className="choice-announcement__lead">{announcement.lead}</p>
      <ol className="choice-announcement__list">
        {announcement.options.map((option, index) => (
          // Text only: the labels are what the story already says, and they are
          // not selectable until the choices stage.
          <li key={`${index}-${option}`} className="choice-announcement__item">
            {option}
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The reading action bar: the same Continue action for both reading stages.
 *
 * Both stages also complete on their own after the configured reading pause.
 * Manual and automatic completion are mutually exclusive — they call the same
 * guarded function — so a stage can only ever advance once.
 *
 * The button is a normal `button` with visible focus, keyboard reachable, and it
 * is never disabled: the player can always move on before the pause expires.
 * The bar sticks to the bottom of the viewport, because a long scene is taller
 * than a phone screen and the action must never be something to hunt for.
 */
export function NarrationGate({ phase, onContinue }: NarrationGateProps): React.ReactElement {
  const isAnnouncement = phase === 'choice_announcement';

  return (
    <div className="narration-gate" data-flow-phase={phase}>
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
