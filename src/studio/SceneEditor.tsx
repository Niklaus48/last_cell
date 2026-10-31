/**
 * Scene inspector: everything about one scene, in one column.
 *
 * Sections mirror the content pack: text, structure (choices → targets), timing,
 * artwork and sound. Every edit goes through a mutator in `model.ts`, so the draft
 * stays immutable and the validation/preview stay in sync.
 */
import { useState } from 'react';
import type { ChoiceOutcome, SceneDefinition } from '../story/engine';
import {
  CAMERA_PRESETS,
  OVERLAY_PRESETS,
  TRANSITION_PRESETS,
  type CameraPreset,
  type OverlayPreset,
  type TransitionPreset,
} from '../presentation/types';
import {
  audioFor,
  presentationFor,
  type StudioDraft,
} from './model';

interface SceneEditorProps {
  readonly draft: StudioDraft;
  readonly scene: SceneDefinition;
  readonly update: (next: StudioDraft) => void;
  readonly mutators: {
    readonly updateScene: (sceneId: string, patch: { title?: string; backgroundAssetId?: string }) => void;
    readonly setParagraph: (sceneId: string, index: number, text: string) => void;
    readonly addParagraph: (sceneId: string) => void;
    readonly removeParagraph: (sceneId: string, index: number) => void;
    readonly moveParagraph: (sceneId: string, index: number, direction: -1 | 1) => void;
    readonly updateChoiceLabel: (sceneId: string, choiceId: string, label: string) => void;
    readonly retargetChoice: (sceneId: string, choiceId: string, outcome: ChoiceOutcome) => void;
    readonly addChoice: (sceneId: string) => void;
    readonly removeChoice: (sceneId: string, choiceId: string) => void;
    readonly setTimedDecision: (
      sceneId: string,
      timed: { durationMs: number; defaultChoiceId: string } | null,
    ) => void;
    readonly setReadingPause: (sceneId: string, ms: number | null) => void;
    readonly updatePresentation: (
      sceneId: string,
      patch: {
        assetId?: string;
        camera?: CameraPreset;
        transition?: TransitionPreset;
        overlay?: OverlayPreset;
        focus?: { x: number; y: number };
      },
    ) => void;
    readonly setSceneAudio: (
      sceneId: string,
      audio: { voice?: string; sfx?: readonly { assetId: string; atMs: number; volume?: number }[] },
    ) => void;
  };
}

function targetValue(outcome: ChoiceOutcome): string {
  switch (outcome.type) {
    case 'transition':
      return `scene:${outcome.targetSceneId}`;
    case 'ending':
      return `ending:${outcome.endingId}`;
    case 'failure':
      return `failure:${outcome.failureId}`;
  }
}

function parseTarget(value: string): ChoiceOutcome {
  const [kind, id] = [value.slice(0, value.indexOf(':')), value.slice(value.indexOf(':') + 1)];
  if (kind === 'ending') return { type: 'ending', endingId: id };
  if (kind === 'failure') return { type: 'failure', failureId: id };
  return { type: 'transition', targetSceneId: id };
}

export function SceneEditor({ draft, scene, update, mutators }: SceneEditorProps): React.ReactElement {
  const presentation = presentationFor(draft, scene.id);
  const audio = audioFor(draft, scene.id);
  const readingPause = draft.readingPauseMs[scene.id];

  const targetOptions = [
    ...draft.story.scenes.map((entry) => ({ value: `scene:${entry.id}`, label: `صحنه — ${entry.title}` })),
    ...draft.story.endings.map((ending) => ({ value: `ending:${ending.id}`, label: `پایان — ${ending.title}` })),
    ...(draft.story.failures ?? []).map((failure) => ({
      value: `failure:${failure.id}`,
      label: `شکست — ${failure.title}`,
    })),
  ];

  return (
    <div className="editor">
      <section className="editor__section">
        <h2 className="editor__heading">منطقهٔ {scene.id}</h2>
        <label className="field">
          <span className="field__label">عنوان صحنه</span>
          <input
            className="field__input"
            value={scene.title}
            onChange={(event) => mutators.updateScene(scene.id, { title: event.target.value })}
          />
        </label>
        <label className="field">
          <span className="field__label">شناسهٔ تصویر (asset id)</span>
          <input
            className="field__input"
            dir="ltr"
            value={presentation.assetId ?? scene.backgroundAssetId ?? ''}
            onChange={(event) => mutators.updatePresentation(scene.id, { assetId: event.target.value })}
          />
          <span className="field__hint">
            فایل تصویر را از بخش «تصویر صحنه» بارگذاری کن؛ نامش همان شناسهٔ فایل می‌شود.
          </span>
        </label>
      </section>

      <section className="editor__section">
        <h2 className="editor__heading">متن راوی</h2>
        {scene.narration.map((paragraph, index) => (
          <div className="paragraph-row" key={`${scene.id}-p${index}`}>
            <textarea
              className="field__textarea"
              value={paragraph}
              rows={3}
              aria-label={`پاراگراف ${index + 1}`}
              onChange={(event) => mutators.setParagraph(scene.id, index, event.target.value)}
            />
            <div className="paragraph-row__tools">
              <button type="button" className="mini" onClick={() => mutators.moveParagraph(scene.id, index, -1)}>
                ↑
              </button>
              <button type="button" className="mini" onClick={() => mutators.moveParagraph(scene.id, index, 1)}>
                ↓
              </button>
              <button type="button" className="mini mini--danger" onClick={() => mutators.removeParagraph(scene.id, index)}>
                حذف
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="secondary" onClick={() => mutators.addParagraph(scene.id)}>
          + پاراگراف تازه
        </button>
      </section>

      <section className="editor__section">
        <h2 className="editor__heading">گزینه‌ها و مسیر درخت</h2>
        {scene.choices.length === 0 && <p className="muted">این صحنه گزینه‌ای ندارد.</p>}
        {scene.choices.map((choice) => (
          <div className="choice-row" key={choice.id}>
            <input
              className="field__input"
              value={choice.label}
              aria-label={`متن گزینه ${choice.id}`}
              onChange={(event) => mutators.updateChoiceLabel(scene.id, choice.id, event.target.value)}
            />
            <select
              className="field__select"
              value={targetValue(choice.outcome)}
              aria-label={`مقصد گزینه ${choice.id}`}
              onChange={(event) => mutators.retargetChoice(scene.id, choice.id, parseTarget(event.target.value))}
            >
              {targetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="mini mini--danger"
              onClick={() => mutators.removeChoice(scene.id, choice.id)}
              aria-label={`حذف گزینه ${choice.id}`}
            >
              حذف
            </button>
          </div>
        ))}
        <button type="button" className="secondary" onClick={() => mutators.addChoice(scene.id)}>
          + گزینهٔ تازه
        </button>
      </section>

      <section className="editor__section">
        <h2 className="editor__heading">زمان‌بندی</h2>
        <label className="field">
          <span className="field__label">مکث خواندن این صحنه (میلی‌ثانیه) — خالی: خودکار</span>
          <input
            className="field__input"
            type="number"
            min={0}
            step={500}
            value={readingPause ?? ''}
            onChange={(event) => {
              const raw = event.target.value;
              mutators.setReadingPause(scene.id, raw === '' ? null : Number(raw));
            }}
          />
        </label>

        <label className="field field--inline">
          <input
            type="checkbox"
            checked={scene.timedDecision !== undefined}
            onChange={(event) => {
              if (!event.target.checked) {
                mutators.setTimedDecision(scene.id, null);
                return;
              }
              const fallback = scene.choices[0]?.id;
              if (fallback === undefined) {
                return;
              }
              mutators.setTimedDecision(scene.id, { durationMs: 10000, defaultChoiceId: fallback });
            }}
          />
          <span>تصمیم زمان‌دار</span>
        </label>

        {scene.timedDecision !== undefined && (
          <div className="field-row">
            <label className="field">
              <span className="field__label">مدت (میلی‌ثانیه)</span>
              <input
                className="field__input"
                type="number"
                min={1000}
                step={500}
                value={scene.timedDecision.durationMs}
                onChange={(event) => {
                  const timed = scene.timedDecision;
                  if (timed === undefined) return;
                  mutators.setTimedDecision(scene.id, {
                    ...timed,
                    durationMs: Number(event.target.value),
                  });
                }}
              />
            </label>
            <label className="field">
              <span className="field__label">گزینهٔ پیش‌فرض</span>
              <select
                className="field__select"
                value={scene.timedDecision.defaultChoiceId}
                onChange={(event) => {
                  const timed = scene.timedDecision;
                  if (timed === undefined) return;
                  mutators.setTimedDecision(scene.id, {
                    ...timed,
                    defaultChoiceId: event.target.value,
                  });
                }}
              >
                {scene.choices.map((choice) => (
                  <option key={choice.id} value={choice.id}>
                    {choice.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </section>

      <section className="editor__section">
        <h2 className="editor__heading">تصویر صحنه</h2>
        <div className="field-row">
          <label className="field">
            <span className="field__label">دوربین</span>
            <select
              className="field__select"
              value={presentation.camera ?? 'slow-zoom-in'}
              onChange={(event) =>
                mutators.updatePresentation(scene.id, { camera: event.target.value as CameraPreset })
              }
            >
              {CAMERA_PRESETS.map((preset) => (
                <option key={preset} value={preset}>{preset}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">لایهٔ نور</span>
            <select
              className="field__select"
              value={presentation.overlay ?? 'vignette'}
              onChange={(event) =>
                mutators.updatePresentation(scene.id, { overlay: event.target.value as OverlayPreset })
              }
            >
              {OVERLAY_PRESETS.map((preset) => (
                <option key={preset} value={preset}>{preset}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">گذار</span>
            <select
              className="field__select"
              value={presentation.transition ?? 'fade'}
              onChange={(event) =>
                mutators.updatePresentation(scene.id, { transition: event.target.value as TransitionPreset })
              }
            >
              {TRANSITION_PRESETS.map((preset) => (
                <option key={preset} value={preset}>{preset}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span className="field__label">نقطهٔ کانونی X٪</span>
            <input
              className="field__input"
              type="number"
              min={0}
              max={100}
              value={presentation.focus?.x ?? 50}
              onChange={(event) =>
                mutators.updatePresentation(scene.id, {
                  focus: { x: Number(event.target.value), y: presentation.focus?.y ?? 50 },
                })
              }
            />
          </label>
          <label className="field">
            <span className="field__label">نقطهٔ کانونی Y٪</span>
            <input
              className="field__input"
              type="number"
              min={0}
              max={100}
              value={presentation.focus?.y ?? 50}
              onChange={(event) =>
                mutators.updatePresentation(scene.id, {
                  focus: { x: presentation.focus?.x ?? 50, y: Number(event.target.value) },
                })
              }
            />
          </label>
        </div>
        <FilePicker
          kind="image"
          label="بارگذاری تصویر این صحنه"
          onUploaded={(fileName) => {
            const assetId = presentation.assetId ?? scene.id;
            update({
              ...draft,
              artwork: { ...draft.artwork, [assetId]: fileName },
            });
          }}
        />
        <p className="muted small">
          شناسهٔ تصویر: <code dir="ltr">{presentation.assetId ?? scene.backgroundAssetId ?? '—'}</code>
          {' · '}فایل: <code dir="ltr">{draft.artwork[presentation.assetId ?? ''] ?? 'تنظیم‌نشده'}</code>
        </p>
      </section>

      <section className="editor__section">
        <h2 className="editor__heading">صدا</h2>
        <label className="field">
          <span className="field__label">صدای راوی این صحنه (asset id)</span>
          <input
            className="field__input"
            dir="ltr"
            value={audio.voice ?? ''}
            onChange={(event) => {
              const voice = event.target.value.trim();
              const sfx = audio.sfx ?? [];
              mutators.setSceneAudio(scene.id, {
                ...(voice === '' ? {} : { voice }),
                ...(sfx.length === 0 ? {} : { sfx }),
              });
            }}
          />
        </label>
        <FilePicker
          kind="audio"
          label="بارگذاری صدای راوی"
          onUploaded={(fileName) => {
            const assetId = audio.voice !== undefined && audio.voice !== '' ? audio.voice : `voice-${scene.id}`;
            update({
              ...draft,
              audioAssets: { ...draft.audioAssets, [assetId]: fileName },
              sceneAudio: { ...draft.sceneAudio, [scene.id]: { ...audio, voice: assetId } },
            });
          }}
        />

        <h3 className="editor__subheading">افکت‌های صوتی زمان‌دار</h3>
        {(audio.sfx ?? []).map((cue, index) => (
          <div className="cue-row" key={`${scene.id}-cue-${index}`}>
            <input
              className="field__input"
              dir="ltr"
              aria-label={`شناسهٔ افکت ${index + 1}`}
              value={cue.assetId}
              onChange={(event) => {
                const sfx = [...(audio.sfx ?? [])];
                sfx[index] = { ...cue, assetId: event.target.value };
                mutators.setSceneAudio(scene.id, { ...audio, sfx });
              }}
            />
            <input
              className="field__input field__input--narrow"
              type="number"
              min={0}
              step={250}
              aria-label={`زمان افکت ${index + 1} (میلی‌ثانیه)`}
              value={cue.atMs}
              onChange={(event) => {
                const sfx = [...(audio.sfx ?? [])];
                sfx[index] = { ...cue, atMs: Number(event.target.value) };
                mutators.setSceneAudio(scene.id, { ...audio, sfx });
              }}
            />
            <button
              type="button"
              className="mini mini--danger"
              aria-label={`حذف افکت ${index + 1}`}
              onClick={() => {
                const sfx = (audio.sfx ?? []).filter((_, i) => i !== index);
                mutators.setSceneAudio(scene.id, { ...audio, sfx });
              }}
            >
              حذف
            </button>
          </div>
        ))}
        <button
          type="button"
          className="secondary"
          onClick={() => {
            const sfx = [...(audio.sfx ?? []), { assetId: 'sfx-new', atMs: 1000 }];
            mutators.setSceneAudio(scene.id, { ...audio, sfx });
          }}
        >
          + افکت صوتی
        </button>
        <FilePicker
          kind="audio"
          label="بارگذاری فایل افکت"
          onUploaded={(fileName) => {
            const assetId = fileName.replace(/\.[^.]+$/, '');
            update({
              ...draft,
              audioAssets: { ...draft.audioAssets, [assetId]: fileName },
            });
          }}
        />
        <p className="muted small">
          فایل‌های صوتی در <code dir="ltr">public/assets/audio/chapter-1/</code> ذخیره می‌شوند.
        </p>
      </section>
    </div>
  );
}

/**
 * Uploads one file through the dev API and reports the stored file name.
 *
 * The stored name is sanitised and validated by the server (lowercase kebab-case,
 * known extension, ≤ 6 MB), so the result is always visible: a rejected upload
 * says why instead of failing quietly in the console.
 */
function FilePicker({
  kind,
  label,
  onUploaded,
}: {
  readonly kind: 'image' | 'audio';
  readonly label: string;
  readonly onUploaded: (fileName: string) => void;
}): React.ReactElement {
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);

  const handle = async (file: File): Promise<void> => {
    const name = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, '-')
      .replace(/-+/g, '-');
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    const response = await fetch('/__studio/upload', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind, name, data: btoa(binary) }),
    });
    const result = (await response.json()) as { ok: boolean; error?: string; path?: string };
    if (!result.ok) {
      throw new Error(result.error ?? 'upload failed');
    }
    onUploaded(name);
    setStatus({ ok: true, text: `ذخیره شد: ${result.path ?? name}` });
  };

  return (
    <div className="file-picker-wrap">
      <label className="file-picker">
        <span className="secondary">{label}</span>
        <input
          type="file"
          accept={kind === 'image' ? 'image/*' : 'audio/*'}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file === undefined) {
              return;
            }
            setStatus(null);
            void handle(file).catch((error: unknown) => {
              setStatus({
                ok: false,
                text: `بارگذاری نشد: ${error instanceof Error ? error.message : 'خطای نامشخص'}`,
              });
            });
          }}
        />
      </label>
      {status !== null && (
        <p className={status.ok ? 'muted small' : 'upload-error'} role="status">
          {status.text}
        </p>
      )}
    </div>
  );
}
