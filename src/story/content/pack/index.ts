/**
 * The active content pack.
 *
 * The pack file lives next to the chapter it describes and is imported statically,
 * so Vite bundles it and a rebuild (or HMR) picks up edits immediately. When the
 * file is missing, empty, or fails validation the game falls back to the canonical
 * TypeScript content — a broken edit can never leave the game unplayable.
 */
import rawPack from '../chapter1/studio.pack.json';
import { EMPTY_PACK, type ContentPack, type SceneAudio } from './types';
import type { ScenePresentationOverride } from '../../../presentation/types';
import { validateContentPack } from './validate';

export interface ActivePack {
  readonly pack: ContentPack;
  /** True when the pack came from a validated file (not the fallback). */
  readonly active: boolean;
  readonly errors: readonly string[];
}

function load(): ActivePack {
  const result = validateContentPack(rawPack);
  if (!result.ok || result.pack === null) {
    return { pack: EMPTY_PACK, active: false, errors: result.errors };
  }
  // A pack for a different story is simply not ours.
  if (result.pack.storyKey !== 'chapter1') {
    return { pack: EMPTY_PACK, active: false, errors: [] };
  }
  const isEmpty =
    result.pack.story === null &&
    Object.keys(result.pack.flow?.readingPauseMs ?? {}).length === 0 &&
    (result.pack.presentation?.overrides?.length ?? 0) === 0 &&
    Object.keys(result.pack.audio?.scenes ?? {}).length === 0;
  return { pack: result.pack, active: !isEmpty, errors: [] };
}

const active = load();

/** The pack in force, or an empty pack when nothing (valid) is installed. */
export const contentPack: ContentPack = active.pack;

/** Diagnostics for the studio and for development warnings. */
export const packStatus = { active: active.active, errors: active.errors } as const;

/** Story replacement, or `null` to use the canonical content. */
export function packStory(): ContentPack['story'] {
  return active.active ? contentPack.story : null;
}

/** Reading pause override for a scene, in milliseconds, or `undefined`. */
export function getSceneReadingPauseMs(sceneId: string): number | undefined {
  return active.active ? contentPack.flow?.readingPauseMs?.[sceneId] : undefined;
}

/** Presentation overrides authored in the studio. */
export function getPackPresentationOverrides(): readonly ScenePresentationOverride[] {
  return active.active ? (contentPack.presentation?.overrides ?? []) : [];
}

/** Artwork manifest overrides authored in the studio (asset id → file name). */
export function getPackArtworkAssets(): Readonly<Record<string, string | null>> {
  return active.active ? (contentPack.presentation?.assets ?? {}) : {};
}

/** Audio manifest overrides authored in the studio (asset id → file name). */
export function getPackAudioAssets(): Readonly<Record<string, string | null>> {
  return active.active ? (contentPack.audio?.assets ?? {}) : {};
}

/** Audio attached to one scene. */
export function getSceneAudio(sceneId: string): SceneAudio | null {
  return active.active ? (contentPack.audio?.scenes?.[sceneId] ?? null) : null;
}

export { EMPTY_PACK };
export type { ContentPack, SceneAudio };
export { validateContentPack };
