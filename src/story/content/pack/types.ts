/**
 * Content pack: the single editable snapshot of a story.
 *
 * WHY THIS EXISTS
 * The studio (a development-only tool) edits the story, its visuals, its reading
 * pacing and its audio, then writes this one JSON file. The game reads the same
 * file at start-up: when it is present and valid the pack *replaces* the story for
 * that key; when it is absent or invalid the game silently falls back to the
 * canonical TypeScript content. Nothing else in the app changes shape.
 *
 * PROPERTIES
 * - Plain JSON: diffable in git, reviewable in a PR, offline, no database.
 * - Untrusted input: everything is validated before use (`validate.ts`), and an
 *   invalid pack never reaches the engine.
 * - Declarative only: no functions, no imports, no CSS — the same rule the story
 *   engine already enforces for scene data.
 */
import type { StoryDefinition } from '../../engine';
import type { ScenePresentationOverride } from '../../../presentation/types';

export const CONTENT_PACK_FORMAT_VERSION = 1;

/** Asset id for a sound file. Resolved to a URL by `src/audio/audioManifest.ts`. */
export type AudioAssetId = string;

/**
 * One sound effect placed at a moment in the scene.
 *
 * `atMs` is measured from the moment the scene becomes visible, so it survives
 * changes to the reading pause: "a door slams 3 seconds in" stays 3 seconds in.
 */
export interface SfxCue {
  readonly assetId: AudioAssetId;
  readonly atMs: number;
  /** 0–1, defaults to 1. */
  readonly volume?: number;
}

/** Sound attached to one scene. */
export interface SceneAudio {
  /** Narrator voice-over for the scene. Holds the narration stage until it ends. */
  readonly voice?: AudioAssetId;
  readonly sfx?: readonly SfxCue[];
}

/** Per-scene reading pause, in milliseconds (overrides the scaled default). */
export type ReadingPauseMap = Readonly<Record<string, number>>;

export interface ContentPack {
  readonly formatVersion: number;
  /** Which story this pack replaces. Currently always `chapter1`. */
  readonly storyKey: string;
  /** Full story replacement. `null` means "use the canonical content". */
  readonly story: StoryDefinition | null;
  readonly flow?: {
    readonly readingPauseMs?: ReadingPauseMap;
  };
  readonly presentation?: {
    readonly overrides?: readonly ScenePresentationOverride[];
    /** Artwork manifest overrides: asset id → file name inside the scene folder. */
    readonly assets?: Readonly<Record<string, string | null>>;
  };
  readonly audio?: {
    /** Audio manifest overrides: asset id → file name inside the audio folder. */
    readonly assets?: Readonly<Record<string, string | null>>;
    readonly scenes?: Readonly<Record<string, SceneAudio>>;
  };
}

/** A pack with no edits: the game behaves exactly as the canonical content. */
export const EMPTY_PACK: ContentPack = {
  formatVersion: CONTENT_PACK_FORMAT_VERSION,
  storyKey: 'chapter1',
  story: null,
  flow: { readingPauseMs: {} },
  presentation: { overrides: [], assets: {} },
  audio: { assets: {}, scenes: {} },
};
