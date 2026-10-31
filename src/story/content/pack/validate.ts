/**
 * Validation for content packs.
 *
 * A pack arrives as untrusted JSON (hand-edited, written by the studio, or pasted
 * in). Nothing in it is trusted until it has been through this module: the shape
 * is checked field by field, the story itself goes through the engine's own
 * `validateStory`, and anything unrecognised is reported instead of guessed at.
 *
 * The result is either a normalised, deeply-readonly pack ready for the game, or
 * a list of human-readable errors. There is no third state: a pack that fails
 * validation is never partially applied.
 */
import { validateStory } from '../../engine/validation';
import { chapter1Story } from '../chapter1';
import {
  CAMERA_PRESETS,
  OVERLAY_PRESETS,
  TRANSITION_PRESETS,
  type CameraPreset,
  type OverlayPreset,
  type ScenePresentationOverride,
  type TransitionPreset,
} from '../../../presentation/types';
import {
  CONTENT_PACK_FORMAT_VERSION,
  type ContentPack,
  type ReadingPauseMap,
  type SceneAudio,
  type SfxCue,
} from './types';

export interface PackValidationResult {
  readonly ok: boolean;
  readonly errors: readonly string[];
  /** Normalised pack; `null` when validation failed. */
  readonly pack: ContentPack | null;
}

interface Report {
  (message: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** File names only: no URLs, no absolute paths, no traversal. */
const ASSET_FILE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(webp|jpg|jpeg|png|mp3|ogg|wav|m4a|opus)$/;

function validateAssetFiles(
  value: unknown,
  path: string,
  report: Report,
): Readonly<Record<string, string | null>> {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    report(`${path} must be an object of assetId → fileName.`);
    return {};
  }
  const result: Record<string, string | null> = {};
  for (const [assetId, file] of Object.entries(value)) {
    if (!isNonEmptyString(assetId)) {
      report(`${path} has an empty asset id.`);
      continue;
    }
    if (file === null) {
      result[assetId] = null;
      continue;
    }
    if (typeof file !== 'string' || !ASSET_FILE_PATTERN.test(file)) {
      report(
        `${path}.${assetId} must be a plain file name like "scene-01.webp" (no URL, no path).`,
      );
      continue;
    }
    result[assetId] = file;
  }
  return result;
}

function validatePresentationOverrides(
  value: unknown,
  sceneIds: ReadonlySet<string>,
  report: Report,
): readonly ScenePresentationOverride[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    report('presentation.overrides must be an array.');
    return [];
  }
  const seen = new Set<string>();
  const overrides: ScenePresentationOverride[] = [];
  value.forEach((raw, index) => {
    const path = `presentation.overrides[${index}]`;
    if (!isRecord(raw)) {
      report(`${path} must be an object.`);
      return;
    }
    const sceneId = raw['sceneId'];
    if (!isNonEmptyString(sceneId)) {
      report(`${path}.sceneId must be a non-empty string.`);
      return;
    }
    if (!sceneIds.has(sceneId)) {
      report(`${path}.sceneId "${sceneId}" does not exist in the story.`);
      return;
    }
    if (seen.has(sceneId)) {
      report(`${path} duplicates sceneId "${sceneId}".`);
      return;
    }
    seen.add(sceneId);

    const override: {
      sceneId: string;
      assetId?: string;
      focus?: { x: number; y: number };
      camera?: CameraPreset;
      transition?: TransitionPreset;
      overlay?: OverlayPreset;
    } = { sceneId };

    const assetId = raw['assetId'];
    if (assetId !== undefined) {
      if (!isNonEmptyString(assetId)) {
        report(`${path}.assetId must be a non-empty string.`);
      } else {
        override.assetId = assetId;
      }
    }

    const focus = raw['focus'];
    if (focus !== undefined) {
      if (
        !isRecord(focus) ||
        typeof focus['x'] !== 'number' ||
        typeof focus['y'] !== 'number' ||
        !Number.isFinite(focus['x']) ||
        !Number.isFinite(focus['y']) ||
        focus['x'] < 0 ||
        focus['x'] > 100 ||
        focus['y'] < 0 ||
        focus['y'] > 100
      ) {
        report(`${path}.focus must be {x, y} percentages between 0 and 100.`);
      } else {
        override.focus = { x: focus['x'], y: focus['y'] };
      }
    }

    const camera = raw['camera'];
    if (camera !== undefined) {
      if (typeof camera !== 'string' || !CAMERA_PRESETS.includes(camera as never)) {
        report(`${path}.camera must be one of ${CAMERA_PRESETS.join(', ')}.`);
      } else {
        override.camera = camera as CameraPreset;
      }
    }
    const transition = raw['transition'];
    if (transition !== undefined) {
      if (typeof transition !== 'string' || !TRANSITION_PRESETS.includes(transition as never)) {
        report(`${path}.transition must be one of ${TRANSITION_PRESETS.join(', ')}.`);
      } else {
        override.transition = transition as TransitionPreset;
      }
    }
    const overlay = raw['overlay'];
    if (overlay !== undefined) {
      if (typeof overlay !== 'string' || !OVERLAY_PRESETS.includes(overlay as never)) {
        report(`${path}.overlay must be one of ${OVERLAY_PRESETS.join(', ')}.`);
      } else {
        override.overlay = overlay as OverlayPreset;
      }
    }

    overrides.push(override);
  });
  return overrides;
}

function validateReadingPauses(
  value: unknown,
  sceneIds: ReadonlySet<string>,
  report: Report,
): ReadingPauseMap {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    report('flow.readingPauseMs must be an object of sceneId → milliseconds.');
    return {};
  }
  const result: Record<string, number> = {};
  for (const [sceneId, ms] of Object.entries(value)) {
    if (!sceneIds.has(sceneId)) {
      report(`flow.readingPauseMs references unknown scene "${sceneId}".`);
      continue;
    }
    if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0 || ms > 120000) {
      report(`flow.readingPauseMs.${sceneId} must be a number of milliseconds between 0 and 120000.`);
      continue;
    }
    result[sceneId] = ms;
  }
  return result;
}

function validateSceneAudio(
  value: unknown,
  sceneIds: ReadonlySet<string>,
  report: Report,
): Readonly<Record<string, SceneAudio>> {
  if (value === undefined) {
    return {};
  }
  if (!isRecord(value)) {
    report('audio.scenes must be an object of sceneId → scene audio.');
    return {};
  }
  const result: Record<string, SceneAudio> = {};
  for (const [sceneId, raw] of Object.entries(value)) {
    const path = `audio.scenes.${sceneId}`;
    if (!sceneIds.has(sceneId)) {
      report(`${path} references an unknown scene.`);
      continue;
    }
    if (!isRecord(raw)) {
      report(`${path} must be an object.`);
      continue;
    }
    const audio: { voice?: string; sfx?: readonly SfxCue[] } = {};

    const voice = raw['voice'];
    if (voice !== undefined && voice !== null && voice !== '') {
      if (!isNonEmptyString(voice)) {
        report(`${path}.voice must be a non-empty asset id.`);
      } else {
        audio.voice = voice;
      }
    }

    const sfx = raw['sfx'];
    if (sfx !== undefined) {
      if (!Array.isArray(sfx)) {
        report(`${path}.sfx must be an array.`);
      } else {
        const cues: SfxCue[] = [];
        sfx.forEach((cue, index) => {
          const cuePath = `${path}.sfx[${index}]`;
          if (!isRecord(cue)) {
            report(`${cuePath} must be an object.`);
            return;
          }
          const assetId = cue['assetId'];
          const atMs = cue['atMs'];
          if (!isNonEmptyString(assetId)) {
            report(`${cuePath}.assetId must be a non-empty asset id.`);
            return;
          }
          if (typeof atMs !== 'number' || !Number.isFinite(atMs) || atMs < 0 || atMs > 600000) {
            report(`${cuePath}.atMs must be between 0 and 600000 milliseconds.`);
            return;
          }
          const volume = cue['volume'];
          if (volume !== undefined) {
            if (typeof volume !== 'number' || !Number.isFinite(volume) || volume < 0 || volume > 1) {
              report(`${cuePath}.volume must be between 0 and 1.`);
              return;
            }
          }
          cues.push(volume === undefined ? { assetId, atMs } : { assetId, atMs, volume });
        });
        if (cues.length > 0) {
          audio.sfx = cues;
        }
      }
    }

    if (audio.voice !== undefined || audio.sfx !== undefined) {
      result[sceneId] = audio;
    }
  }
  return result;
}

/**
 * Validates an unknown value as a content pack.
 *
 * `story` is required: the studio always writes the full story so the file alone
 * is enough to reconstruct the game (no hidden merge rules).
 */
export function validateContentPack(raw: unknown): PackValidationResult {
  const errors: string[] = [];
  const report: Report = (message) => {
    errors.push(message);
  };

  if (!isRecord(raw)) {
    return { ok: false, errors: ['The content pack must be a JSON object.'], pack: null };
  }

  if (raw['formatVersion'] !== CONTENT_PACK_FORMAT_VERSION) {
    report(
      `Unsupported pack formatVersion ${String(raw['formatVersion'])}; expected ${CONTENT_PACK_FORMAT_VERSION}.`,
    );
  }
  const storyKey = raw['storyKey'];
  if (!isNonEmptyString(storyKey)) {
    report('storyKey must be a non-empty string.');
  }

  // --- story ---
  const storyRaw = raw['story'];
  let story: ContentPack['story'] = null;
  if (storyRaw !== null && storyRaw !== undefined) {
    const result = validateStory(storyRaw as never);
    if (!result.ok) {
      for (const error of result.errors) {
        report(`story.${error.path}: ${error.message}`);
      }
    } else {
      story = storyRaw as ContentPack['story'];
    }
  }

  /**
   * Scene ids that overrides may legitimately mention. A pack that only adds
   * pacing, artwork or sound (`story: null`) is layered on top of the canonical
   * chapter, so the canonical ids count too — otherwise the most common kind of
   * partial pack would be impossible to write.
   */
  const sceneIds = new Set<string>(
    (story ?? chapter1Story).scenes
      .map((scene) => scene.id)
      .filter((id): id is string => typeof id === 'string'),
  );

  // --- flow ---
  const flowRaw = raw['flow'];
  if (flowRaw !== undefined && !isRecord(flowRaw)) {
    report('flow must be an object.');
  }
  const readingPauseMs = validateReadingPauses(
    isRecord(flowRaw) ? flowRaw['readingPauseMs'] : undefined,
    sceneIds,
    report,
  );

  // --- presentation ---
  const presentationRaw = raw['presentation'];
  if (presentationRaw !== undefined && !isRecord(presentationRaw)) {
    report('presentation must be an object.');
  }
  const overrides = validatePresentationOverrides(
    isRecord(presentationRaw) ? presentationRaw['overrides'] : undefined,
    sceneIds,
    report,
  );
  const presentationAssets = validateAssetFiles(
    isRecord(presentationRaw) ? presentationRaw['assets'] : undefined,
    'presentation.assets',
    report,
  );

  // --- audio ---
  const audioRaw = raw['audio'];
  if (audioRaw !== undefined && !isRecord(audioRaw)) {
    report('audio must be an object.');
  }
  const audioAssets = validateAssetFiles(
    isRecord(audioRaw) ? audioRaw['assets'] : undefined,
    'audio.assets',
    report,
  );
  const sceneAudio = validateSceneAudio(
    isRecord(audioRaw) ? audioRaw['scenes'] : undefined,
    sceneIds,
    report,
  );

  // Audio may only reference sounds that are declared in the pack manifest or in
  // the built-in audio manifest; unknown ids are a content error, not a crash.
  const knownAudio = new Set(Object.keys(audioAssets));
  for (const [sceneId, audio] of Object.entries(sceneAudio)) {
    const referenced = [
      ...(audio.voice === undefined ? [] : [audio.voice]),
      ...(audio.sfx ?? []).map((cue) => cue.assetId),
    ];
    for (const assetId of referenced) {
      if (!knownAudio.has(assetId)) {
        report(`audio.scenes.${sceneId} references audio "${assetId}" missing from audio.assets.`);
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, pack: null };
  }

  const pack: ContentPack = {
    formatVersion: CONTENT_PACK_FORMAT_VERSION,
    storyKey: storyKey as string,
    story,
    flow: { readingPauseMs },
    presentation: { overrides, assets: presentationAssets },
    audio: { assets: audioAssets, scenes: sceneAudio },
  };
  return { ok: true, errors: [], pack };
}
