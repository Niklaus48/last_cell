/**
 * Presentation contract for cinematic scenes.
 *
 * ARCHITECTURAL RULE: this layer is pure data + pure functions. It knows about
 * scene ids and asset ids, never about choices, conditions, effects, clues,
 * checkpoints, timers or saves. Nothing here can change story progression: the
 * renderer only reads the current scene and paints it.
 *
 * Everything in this file is serialisable — no React, no callbacks, no CSS
 * strings, no browser objects. The only link to CSS is a preset *id*, which the
 * renderer maps to a class name in `presets.ts`.
 */
import type { SceneId } from '../story/engine';

/** Restrained camera moves. Applied to the artwork layer only. */
export type CameraPreset = 'none' | 'slow-zoom-in' | 'slow-zoom-out' | 'pan-left' | 'pan-right';

/** How a scene arrives. `cut` is used when motion is reduced. */
export type TransitionPreset = 'fade' | 'cut';

/** Atmospheric treatment drawn above the artwork, below the UI. */
export type OverlayPreset = 'none' | 'vignette' | 'haze' | 'cold';

/** Where the interesting part of the artwork sits, in percent of the image. */
export interface SceneFocus {
  readonly x: number;
  readonly y: number;
}

/** Id of a fallback gradient declared in `fallbacks.ts`. */
export type FallbackGradientId = string;

/** Fully resolved visual description of one scene. */
export interface ScenePresentation {
  readonly sceneId: SceneId;
  /** Asset id looked up in the art manifest. May be a location or a scene id. */
  readonly assetId: string;
  readonly focus: SceneFocus;
  readonly camera: CameraPreset;
  readonly transition: TransitionPreset;
  readonly overlay: OverlayPreset;
  readonly fallbackGradientId: FallbackGradientId;
}

/**
 * Hand-authored tweak for one scene. Every field is optional: omitted fields
 * fall back to the location defaults in `scenePresentation.ts`.
 */
export interface ScenePresentationOverride {
  readonly sceneId: SceneId;
  readonly assetId?: string;
  readonly focus?: SceneFocus;
  readonly camera?: CameraPreset;
  readonly transition?: TransitionPreset;
  readonly overlay?: OverlayPreset;
}

/** The minimal scene shape the resolver needs (satisfied by `SceneDefinition`). */
export interface SceneVisualSource {
  readonly id: string;
  readonly backgroundAssetId?: string | undefined;
}

export const CAMERA_PRESETS: readonly CameraPreset[] = [
  'none',
  'slow-zoom-in',
  'slow-zoom-out',
  'pan-left',
  'pan-right',
];

export const TRANSITION_PRESETS: readonly TransitionPreset[] = ['fade', 'cut'];

export const OVERLAY_PRESETS: readonly OverlayPreset[] = ['none', 'vignette', 'haze', 'cold'];

export const DEFAULT_FOCUS: SceneFocus = { x: 50, y: 50 };

/** Used whenever a scene declares nothing at all. */
export const DEFAULT_PRESENTATION = {
  camera: 'slow-zoom-in' as CameraPreset,
  transition: 'fade' as TransitionPreset,
  overlay: 'vignette' as OverlayPreset,
  focus: DEFAULT_FOCUS,
};
