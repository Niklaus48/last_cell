interface NarrationBlockProps {
  readonly title: string;
  readonly paragraphs: readonly string[];
  /** Changes on each transition so a CSS key can replay a subtle fade. */
  readonly animationKey: number;
}

export function NarrationBlock({
  title,
  paragraphs,
  animationKey,
}: NarrationBlockProps): React.ReactElement {
  return (
    <article className="narration" key={animationKey} aria-live="polite">
      <h2 className="narration__title">{title}</h2>
      {paragraphs.map((paragraph, index) => (
        <p className="narration__paragraph" key={`${animationKey}-${index}`}>
          {paragraph}
        </p>
      ))}
    </article>
  );
}
