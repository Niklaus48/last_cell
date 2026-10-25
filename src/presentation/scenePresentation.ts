/**
 * Scene → presentation resolution.
 *
 * Presentation is derived, never stored in story data: the canonical `SceneDefinition`
 * still carries only `backgroundAssetId`, and everything cinematic is layered on
 * top here. That keeps the engine and the content untouched while making the
 * visuals fully data-driven.
 *
 * Resolution order (later wins):
 *   1. `DEFAULT_PRESENTATION`
 *   2. location defaults for the scene's `backgroundAssetId`
 *   3. a scene-specific entry in `SCENE_PRESENTATION_OVERRIDES`
 */
import { CHAPTER1_SCENE } from '../story/content/chapter1/ids';
import {
  CAMERA_PRESETS,
  DEFAULT_PRESENTATION,
  OVERLAY_PRESETS,
  TRANSITION_PRESETS,
  type CameraPreset,
  type FallbackGradientId,
  type OverlayPreset,
  type SceneFocus,
  type ScenePresentation,
  type ScenePresentationOverride,
  type SceneVisualSource,
} from './types';
import { hasFallbackGradient } from './fallbacks';
import { hasAssetEntry } from './assetManifest';

interface LocationDefaults {
  readonly camera: CameraPreset;
  readonly overlay: OverlayPreset;
  readonly fallbackGradientId: FallbackGradientId;
  readonly focus: SceneFocus;
}

/**
 * Per-location defaults, keyed by the `backgroundAssetId` the content already
 * uses. A scene that declares no presentation metadata still gets a sensible,
 * stable look from this table.
 */
const LOCATION_DEFAULTS: Readonly<Record<string, LocationDefaults>> = {
  'cell-interior': {
    camera: 'slow-zoom-in',
    overlay: 'vignette',
    fallbackGradientId: 'cell-interior',
    focus: { x: 50, y: 45 },
  },
  'cell-night': {
    camera: 'slow-zoom-in',
    overlay: 'vignette',
    fallbackGradientId: 'cell-night',
    focus: { x: 50, y: 50 },
  },
  corridor: {
    camera: 'pan-right',
    overlay: 'haze',
    fallbackGradientId: 'corridor',
    focus: { x: 50, y: 50 },
  },
  'service-corridor': {
    camera: 'pan-left',
    overlay: 'haze',
    fallbackGradientId: 'service-corridor',
    focus: { x: 45, y: 55 },
  },
  office: {
    camera: 'slow-zoom-in',
    overlay: 'vignette',
    fallbackGradientId: 'office',
    focus: { x: 60, y: 50 },
  },
  cafeteria: {
    camera: 'pan-right',
    overlay: 'haze',
    fallbackGradientId: 'cafeteria',
    focus: { x: 50, y: 50 },
  },
  door: {
    camera: 'none',
    overlay: 'cold',
    fallbackGradientId: 'door',
    focus: { x: 50, y: 55 },
  },
  alcove: {
    camera: 'slow-zoom-in',
    overlay: 'vignette',
    fallbackGradientId: 'alcove',
    focus: { x: 40, y: 50 },
  },
  gate: {
    camera: 'slow-zoom-out',
    overlay: 'cold',
    fallbackGradientId: 'gate',
    focus: { x: 50, y: 40 },
  },
  'interrogation-room': {
    camera: 'slow-zoom-in',
    overlay: 'vignette',
    fallbackGradientId: 'interrogation-room',
    focus: { x: 50, y: 50 },
  },
};

/**
 * Scene-specific tweaks. Keep this list short and intentional: it is for scenes
 * that genuinely need a different treatment, not for restyling every scene.
 *
 * Scene ids come from the canonical content (`CHAPTER1_SCENE`), never from
 * string literals typed here, so a renamed scene breaks the build rather than
 * silently losing its presentation.
 */
export const SCENE_PRESENTATION_OVERRIDES: readonly ScenePresentationOverride[] = [
  {
    // The stranger is heard, not seen: hold still and cool the light down.
    sceneId: CHAPTER1_SCENE.strangerArrives,
    camera: 'none',
    overlay: 'cold',
    focus: { x: 50, y: 35 },
  },
  {
    // The corridor is where the escape starts moving: lead the eye down it.
    sceneId: CHAPTER1_SCENE.corridorFirst,
    camera: 'pan-right',
    overlay: 'haze',
  },
  {
    // The locked door is a still, tense beat.
    sceneId: CHAPTER1_SCENE.lockedDoor,
    camera: 'none',
    overlay: 'cold',
    focus: { x: 50, y: 60 },
  },
  {
    // Footsteps: the camera stops moving so the player feels exposed.
    sceneId: CHAPTER1_SCENE.doorAttempt,
    camera: 'none',
    overlay: 'cold',
    transition: 'fade',
  },
  {
    // The yard is the first open space in six months: pull back slowly.
    sceneId: CHAPTER1_SCENE.finalApproach,
    camera: 'slow-zoom-out',
    overlay: 'cold',
    focus: { x: 50, y: 40 },
  },
];

function locationDefaults(backgroundAssetId: string | undefined): LocationDefaults {
  if (backgroundAssetId !== undefined) {
    const found = LOCATION_DEFAULTS[backgroundAssetId];
    if (found !== undefined) {
      return found;
    }
  }
  return {
    camera: DEFAULT_PRESENTATION.camera,
    overlay: DEFAULT_PRESENTATION.overlay,
    fallbackGradientId: 'default',
    focus: DEFAULT_PRESENTATION.focus,
  };
}

const overrideByScene = new Map<string, ScenePresentationOverride>(
  SCENE_PRESENTATION_OVERRIDES.map((entry) => [entry.sceneId, entry]),
);

/**
 * Resolves the presentation for a scene. Works for any scene id — including
 * scenes with no metadata at all, and scenes from the dev fixture.
 */
export function getScenePresentation(scene: SceneVisualSource): ScenePresentation {
  const base = locationDefaults(scene.backgroundAssetId);
  const override = overrideByScene.get(scene.id);

  return {
    sceneId: scene.id,
    assetId: override?.assetId ?? scene.backgroundAssetId ?? 'default',
    focus: override?.focus ?? base.focus,
    camera: override?.camera ?? base.camera,
    transition: override?.transition ?? DEFAULT_PRESENTATION.transition,
    overlay: override?.overlay ?? base.overlay,
    fallbackGradientId: base.fallbackGradientId,
  };
}

function isValidFocus(focus: SceneFocus): boolean {
  const inRange = (value: number): boolean => Number.isFinite(value) && value >= 0 && value <= 100;
  return inRange(focus.x) && inRange(focus.y);
}

/**
 * Validates the presentation configuration against the real scenes and manifest.
 * Returns one message per problem; an empty array means everything is coherent.
 */
export function validateScenePresentation(
  scenes: readonly SceneVisualSource[],
  overrides: readonly ScenePresentationOverride[] = SCENE_PRESENTATION_OVERRIDES,
): readonly string[] {
  const problems: string[] = [];
  const sceneIds = new Set(scenes.map((scene) => scene.id));
  const seen = new Set<string>();

  for (const scene of scenes) {
    if (scene.backgroundAssetId !== undefined && !hasAssetEntry(scene.backgroundAssetId)) {
      problems.push(
        `scene "${scene.id}" declares backgroundAssetId "${scene.backgroundAssetId}" which is not in the asset manifest`,
      );
    }
    if (
      scene.backgroundAssetId !== undefined &&
      !hasFallbackGradient(scene.backgroundAssetId)
    ) {
      problems.push(
        `scene "${scene.id}" has no fallback gradient for "${scene.backgroundAssetId}"`,
      );
    }
  }

  for (const override of overrides) {
    if (!sceneIds.has(override.sceneId)) {
      problems.push(`presentation override references unknown scene "${override.sceneId}"`);
    }
    if (seen.has(override.sceneId)) {
      problems.push(`duplicate presentation override for scene "${override.sceneId}"`);
    }
    seen.add(override.sceneId);

    if (override.camera !== undefined && !CAMERA_PRESETS.includes(override.camera)) {
      problems.push(`scene "${override.sceneId}" has unknown camera preset "${override.camera}"`);
    }
    if (override.transition !== undefined && !TRANSITION_PRESETS.includes(override.transition)) {
      problems.push(
        `scene "${override.sceneId}" has unknown transition preset "${override.transition}"`,
      );
    }
    if (override.overlay !== undefined && !OVERLAY_PRESETS.includes(override.overlay)) {
      problems.push(`scene "${override.sceneId}" has unknown overlay preset "${override.overlay}"`);
    }
    if (override.focus !== undefined && !isValidFocus(override.focus)) {
      problems.push(
        `scene "${override.sceneId}" has focus outside 0–100: ${String(override.focus.x)}, ${String(override.focus.y)}`,
      );
    }
    if (override.assetId !== undefined) {
      if (override.assetId.trim().length === 0) {
        problems.push(`scene "${override.sceneId}" has an empty assetId`);
      } else if (!hasAssetEntry(override.assetId)) {
        problems.push(
          `scene "${override.sceneId}" uses asset id "${override.assetId}" which is not in the asset manifest`,
        );
      }
    }
  }

  return problems;
}
