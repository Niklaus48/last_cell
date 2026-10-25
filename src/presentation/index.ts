/**
 * Presentation layer entry point.
 *
 * Separate from `src/story/**` on purpose: visuals are derived from story data
 * but never feed back into it. Import from here rather than from individual
 * modules so the boundary stays obvious.
 */
export {
  CAMERA_PRESETS,
  DEFAULT_FOCUS,
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
  type TransitionPreset,
} from './types';
export {
  ASSET_FILE_PATTERN,
  SCENE_ASSETS,
  SCENE_ASSET_DIRECTORY,
  hasAssetEntry,
  pendingAssetIds,
  resetAssetWarnings,
  resolveAssetUrl,
  suppliedAssetIds,
  validateAssetManifest,
  type AssetManifestIssue,
} from './assetManifest';
export {
  fallbackGradientIds,
  hasFallbackGradient,
  neutralFallback,
  resolveFallbackGradient,
  type FallbackAppearance,
} from './fallbacks';
export {
  SCENE_PRESENTATION_OVERRIDES,
  getScenePresentation,
  validateScenePresentation,
} from './scenePresentation';
export { cameraClass, classNames, overlayClass, transitionClass } from './presets';
