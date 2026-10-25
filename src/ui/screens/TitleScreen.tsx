import type { SaveFeedback } from '../../app/useStorySession';

interface TitleScreenProps {
  readonly onStart: () => void;
  readonly storyTitle: string;
  /** True only when a stored save passed full validation. */
  readonly canResume: boolean;
  /** Persian explanation of the save situation, shown under the actions. */
  readonly resumeNote: string;
  readonly onResume: () => void;
  readonly saveFeedback: SaveFeedback | null;
  readonly onDismissFeedback: () => void;
}

export function TitleScreen({
  onStart,
  storyTitle,
  canResume,
  resumeNote,
  onResume,
  saveFeedback,
  onDismissFeedback,
}: TitleScreenProps): React.ReactElement {
  return (
    <main className="screen screen--title">
      <div className="title-art" aria-hidden="true">
        <span className="title-art__bars" />
      </div>

      <header className="title-header">
        <p className="title-header__eyebrow">روایت تعاملی</p>
        <h1 className="title-header__title">آخرین سلول</h1>
        <p className="title-header__subtitle">
          کیان فرهمند، در سلولی که هیچ‌کس نامش را بلد نیست.
        </p>
      </header>

      <p className="title-body">
        هر جمله‌ای که می‌گویی یک در را باز می‌کند و دری دیگر را برای همیشه می‌بندد. زمان کم است،
        اطلاعات کم‌تر.
      </p>

      <div className="title-actions">
        <button type="button" className="button button--primary" onClick={onStart}>
          شروع فصل اول
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={onResume}
          disabled={!canResume}
          aria-describedby="resume-note"
        >
          ادامه از ذخیرهٔ محلی
        </button>
        <p className="title-actions__note">{storyTitle}</p>
        <p id="resume-note" className={`title-actions__save ${canResume ? '' : 'title-actions__save--muted'}`}>
          {resumeNote}
        </p>
      </div>

      {saveFeedback !== null && (
        <p
          className={saveFeedback.kind === 'error' ? 'error-banner' : 'save-notice'}
          role={saveFeedback.kind === 'error' ? 'alert' : 'status'}
        >
          {saveFeedback.message}
          <button
            type="button"
            className="button button--inline"
            onClick={onDismissFeedback}
            aria-label="بستن پیام"
          >
            ×
          </button>
        </p>
      )}
    </main>
  );
}
