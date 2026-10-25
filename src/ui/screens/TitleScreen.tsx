interface TitleScreenProps {
  readonly onStart: () => void;
  readonly storyTitle: string;
}

export function TitleScreen({ onStart, storyTitle }: TitleScreenProps): React.ReactElement {
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
        <p className="title-actions__note">{storyTitle}</p>
      </div>
    </main>
  );
}
