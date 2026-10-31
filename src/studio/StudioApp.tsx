/**
 * The story studio: one page that shows the whole decision tree, lets every part
 * of it be edited, and applies the result to the game.
 *
 * How "applying" works (the decision the user asked me to make):
 * the studio writes **one JSON content pack** to disk, next to the chapter it
 * describes. The game reads that file at start-up; when it is valid it replaces
 * the story, the pacing, the artwork mapping and the audio; when it is not, the
 * game quietly keeps playing the canonical content. A JSON file in the repo is
 * better than a browser-only database here because it is versioned, diffable,
 * reviewable, works offline, and is the same artifact that can be handed to
 * someone else.
 */
import { useCallback, useMemo, useState } from 'react';
import { validateStory } from '../story/engine/validation';
import {
  addChoice,
  addNarrationParagraph,
  buildTree,
  createDraft,
  draftFromPack,
  draftToPack,
  moveNarrationParagraph,
  presentationFor,
  removeChoice,
  removeNarrationParagraph,
  sceneById,
  setNarrationParagraph,
  setReadingPause,
  setSceneAudio,
  setTimedDecision,
  updateChoice,
  updatePresentation,
  updateScene,
  type StudioDraft,
} from './model';
import { StoryTreeView } from './StoryTreeView';
import { SceneEditor } from './SceneEditor';
import { validateContentPack } from '../story/content/pack/validate';
import type { ContentPack } from '../story/content/pack/types';
import { getScenePresentation } from '../presentation';
import './studio.css';

type SaveState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'saved'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string };

export function StudioApp(): React.ReactElement {
  const [draft, setDraft] = useState<StudioDraft>(() => createDraft());
  const [selectedId, setSelectedId] = useState<string>(() => draft.story.initialSceneId);
  const [save, setSave] = useState<SaveState>({ kind: 'idle' });
  const [loaded, setLoaded] = useState(false);

  const update = useCallback((next: StudioDraft) => {
    setDraft(next);
    setSave({ kind: 'idle' });
  }, []);

  // --- load whatever is on disk once, so reopening the studio continues work ---
  if (!loaded) {
    setLoaded(true);
    void fetch('/__studio/pack')
      .then((response) => response.json() as Promise<{ ok: boolean; pack: ContentPack | null }>)
      .then((result) => {
        if (result.ok && result.pack !== null) {
          setDraft(draftFromPack(result.pack));
        }
      })
      .catch(() => {
        // No dev API (e.g. a static preview): the canonical content is the draft.
      });
  }

  const storyIssues = useMemo(() => {
    const result = validateStory(draft.story);
    return result.ok ? [] : result.errors.map((error) => `${error.path}: ${error.message}`);
  }, [draft.story]);

  const pack = useMemo(() => draftToPack(draft), [draft]);
  const packIssues = useMemo(() => {
    const result = validateContentPack(JSON.parse(JSON.stringify(pack)) as unknown);
    return result.ok ? [] : result.errors;
  }, [pack]);

  const issues = [...storyIssues, ...packIssues];

  const tree = useMemo(() => buildTree(draft), [draft]);
  const timedSceneIds = useMemo(
    () => new Set(draft.story.scenes.filter((scene) => scene.timedDecision !== undefined).map((scene) => scene.id)),
    [draft.story],
  );

  const selectedScene = sceneById(draft, selectedId);

  const mutators = useMemo(
    () => ({
      updateScene: (sceneId: string, patch: { title?: string; backgroundAssetId?: string }) =>
        update(updateScene(draft, sceneId, patch)),
      setParagraph: (sceneId: string, index: number, text: string) =>
        update(setNarrationParagraph(draft, sceneId, index, text)),
      addParagraph: (sceneId: string) => update(addNarrationParagraph(draft, sceneId)),
      removeParagraph: (sceneId: string, index: number) =>
        update(removeNarrationParagraph(draft, sceneId, index)),
      moveParagraph: (sceneId: string, index: number, direction: -1 | 1) =>
        update(moveNarrationParagraph(draft, sceneId, index, direction)),
      updateChoiceLabel: (sceneId: string, choiceId: string, label: string) =>
        update(updateChoice(draft, sceneId, choiceId, { label })),
      retargetChoice: (sceneId: string, choiceId: string, outcome: Parameters<typeof updateChoice>[3]['outcome'] extends undefined ? never : NonNullable<Parameters<typeof updateChoice>[3]['outcome']>) =>
        update(updateChoice(draft, sceneId, choiceId, { outcome })),
      addChoice: (sceneId: string) => update(addChoice(draft, sceneId)),
      removeChoice: (sceneId: string, choiceId: string) => update(removeChoice(draft, sceneId, choiceId)),
      setTimedDecision: (sceneId: string, timed: { durationMs: number; defaultChoiceId: string } | null) =>
        update(setTimedDecision(draft, sceneId, timed)),
      setReadingPause: (sceneId: string, ms: number | null) => update(setReadingPause(draft, sceneId, ms)),
      updatePresentation: (
        sceneId: string,
        patch: Parameters<typeof updatePresentation>[2],
      ) => update(updatePresentation(draft, sceneId, patch)),
      setSceneAudio: (sceneId: string, audio: Parameters<typeof setSceneAudio>[2]) =>
        update(setSceneAudio(draft, sceneId, audio)),
    }),
    [draft, update],
  );

  const apply = (): void => {
    if (issues.length > 0) {
      setSave({ kind: 'error', message: 'پیش از اعمال، خطاهای اعتبارسنجی را رفع کن.' });
      return;
    }
    setSave({ kind: 'saving' });
    void fetch('/__studio/pack', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pack }),
    })
      .then((response) => response.json() as Promise<{ ok: boolean; error?: string }>)
      .then((result) => {
        setSave(
          result.ok
            ? { kind: 'saved', message: 'اعمال شد. بازی با همین محتوا بارگذاری می‌شود.' }
            : { kind: 'error', message: result.error ?? 'ذخیره نشد.' },
        );
      })
      .catch(() => setSave({ kind: 'error', message: 'سرور توسعه در دسترس نیست (npm run dev).' }));
  };

  const reset = (): void => {
    setDraft(createDraft());
    setSelectedId(draft.story.initialSceneId);
    setSave({ kind: 'idle' });
  };

  const exportJson = (): void => {
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'studio.pack.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const preview = selectedScene === null ? null : getScenePresentation(selectedScene);

  return (
    <div className="studio">
      <header className="studio__bar">
        <h1 className="studio__title">کارگاه داستان — آخرین سلول</h1>
        <div className="studio__actions">
          <button type="button" className="primary" onClick={apply} disabled={issues.length > 0}>
            اعمال در بازی
          </button>
          <button type="button" className="secondary" onClick={exportJson}>
            خروجی JSON
          </button>
          <button type="button" className="secondary" onClick={reset}>
            بازگشت به نسخهٔ اصلی
          </button>
          <a className="link" href="/" target="_blank" rel="noreferrer">
            باز کردن بازی ↗
          </a>
        </div>
      </header>

      {save.kind !== 'idle' && (
        <p className={`banner banner--${save.kind === 'error' ? 'error' : 'ok'}`} role="status">
          {save.kind === 'saving' ? 'در حال ذخیره…' : save.message}
        </p>
      )}

      {issues.length > 0 && (
        <details className="issues" open>
          <summary>{issues.length} خطای اعتبارسنجی — تا رفع نشود اعمال ممکن نیست</summary>
          <ul>
            {issues.map((issue) => (
              <li key={issue} dir="auto">{issue}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="studio__body">
        <nav className="studio__list" aria-label="صحنه‌ها">
          {draft.story.scenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              className={`scene-item${scene.id === selectedId ? ' is-active' : ''}`}
              onClick={() => setSelectedId(scene.id)}
            >
              <span className="scene-item__title">{scene.title}</span>
              <span className="scene-item__meta" dir="ltr">{scene.id}</span>
            </button>
          ))}
        </nav>

        <main className="studio__main">
          <section className="studio__tree">
            <h2 className="editor__heading">درخت تصمیم</h2>
            <StoryTreeView
              tree={tree}
              selectedId={selectedId}
              onSelect={setSelectedId}
              timedSceneIds={timedSceneIds}
            />
            <p className="muted small">
              {tree.nodes.length} گره · {tree.edges.length} پیوند — برای ویرایش روی هر گره بزن.
            </p>
          </section>

          <section className="studio__editor">
            {selectedScene === null ? (
              <div className="editor">
                <h2 className="editor__heading">گرهٔ پایانی</h2>
                <p className="muted">
                  این گره یک پایان یا شکست است. متن آن در بخش پایان‌ها نگهداری می‌شود؛ برای
                  تغییر مسیر، گزینه‌ای را که به این گره می‌رسد ویرایش کن.
                </p>
                {preview !== null && (
                  <p className="muted small" dir="ltr">
                    asset: {preview.assetId} · camera: {preview.camera} · overlay: {preview.overlay}
                  </p>
                )}
              </div>
            ) : (
              <SceneEditor
                draft={draft}
                scene={selectedScene}
                update={update}
                mutators={mutators}
              />
            )}
          </section>
        </main>

        <aside className="studio__side">
          <h2 className="editor__heading">پیش‌نمایش صحنه</h2>
          {selectedScene !== null && (
            <>
              <div
                className="preview"
                style={{
                  background: `linear-gradient(160deg, #0d1016 0%, #1a2028 55%, #08090c 100%)`,
                  backgroundImage: preview === null ? undefined : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: preview === null ? undefined : `${preview.focus.x}% ${preview.focus.y}%`,
                }}
              >
                <div className="preview__overlay" data-overlay={preview?.overlay ?? 'none'} />
                <p className="preview__title">{selectedScene.title}</p>
                <p className="preview__text">{selectedScene.narration[0] ?? ''}</p>
              </div>
              <ul className="facts">
                <li>شناسه: <code dir="ltr">{selectedScene.id}</code></li>
                <li>گزینه‌ها: {selectedScene.choices.length}</li>
                <li>پاراگراف‌ها: {selectedScene.narration.length}</li>
                <li>تصویر: <code dir="ltr">{presentationFor(draft, selectedScene.id).assetId ?? '—'}</code></li>
                <li>صدا: <code dir="ltr">{draft.sceneAudio[selectedScene.id]?.voice ?? '—'}</code></li>
                <li>مکث خواندن: {draft.readingPauseMs[selectedScene.id] ?? 'خودکار'}</li>
              </ul>
            </>
          )}

          <h2 className="editor__heading">آزمایش مسیر</h2>
          <RouteWalker draft={draft} onSelect={setSelectedId} />
        </aside>
      </div>
    </div>
  );
}

/**
 * A tiny walker over the *draft*: click through the branches without touching the
 * saved game, so a structural edit (a choice pointing somewhere new, a deleted
 * scene) can be checked before it is applied.
 */
function RouteWalker({
  draft,
  onSelect,
}: {
  readonly draft: StudioDraft;
  readonly onSelect: (id: string) => void;
}): React.ReactElement {
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [history, setHistory] = useState<readonly string[]>([]);
  const [terminal, setTerminal] = useState<string | null>(null);

  const current = sceneId === null ? null : sceneById(draft, sceneId);

  const go = (next: string | null, label: string): void => {
    setHistory((previous) => [...previous, label]);
    if (next === null) {
      setTerminal(label);
      return;
    }
    setSceneId(next);
  };

  return (
    <div className="walker">
      <div className="walker__controls">
        <button type="button" className="secondary" onClick={() => { setSceneId(draft.story.initialSceneId); setTerminal(null); setHistory([]); }}>
          شروع
        </button>
        <button type="button" className="secondary" onClick={() => { setSceneId(null); setTerminal(null); setHistory([]); }}>
          پاک کردن
        </button>
      </div>
      <p className="muted small">گام‌ها: {history.length}</p>
      {terminal !== null && <p className="banner banner--ok">{terminal}</p>}
      {current !== null && (
        <>
          <p className="small" style={{ margin: 0 }}>{current.title}</p>
          <button type="button" className="mini" onClick={() => onSelect(current.id)}>
            باز کردن در ویرایشگر
          </button>
          {current.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="secondary"
              onClick={() => {
                const outcome = choice.outcome;
                if (outcome.type === 'transition') {
                  if (sceneById(draft, outcome.targetSceneId) === null) {
                    go(null, `مسیر به صحنهٔ ناموجود «${outcome.targetSceneId}» — خطای ساختاری`);
                  } else {
                    go(outcome.targetSceneId, `${current.id} → ${outcome.targetSceneId}`);
                  }
                } else if (outcome.type === 'ending') {
                  const ending = draft.story.endings.find((entry) => entry.id === outcome.endingId);
                  go(null, `پایان — ${ending?.title ?? outcome.endingId}`);
                } else {
                  const failure = (draft.story.failures ?? []).find((entry) => entry.id === outcome.failureId);
                  go(null, `شکست — ${failure?.title ?? outcome.failureId}`);
                }
              }}
            >
              {choice.label}
            </button>
          ))}
          {current.choices.length === 0 && (
            <p className="banner banner--error">این صحنه گزینه‌ای ندارد؛ بازیکن گیر می‌کند.</p>
          )}
        </>
      )}
    </div>
  );
}
