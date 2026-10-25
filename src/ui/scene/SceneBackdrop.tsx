import {
  classNames,
  resolveAssetUrl,
  resolveFallbackGradient,
  type ScenePresentation,
} from '../../presentation';
import { cameraClass, overlayClass, transitionClass } from '../../presentation/presets';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';
import { useSceneImage } from './useSceneImage';

interface SceneBackdropProps {
  readonly presentation: ScenePresentation;
}

/**
 * Paints the current scene: fallback gradient, artwork (when it exists), slow
 * camera motion, atmospheric overlay and a readability scrim.
 *
 * View only. It receives a resolved presentation and never asks the engine
 * anything, never changes scene and never touches story state.
 *
 * Rendering rules:
 * - the scene's gradient is always painted, so there is never a blank or
 *   half-loaded screen and a missing file costs nothing;
 * - the artwork layer appears only once it has actually loaded, so a broken or
 *   pending image can never show as a broken-image icon;
 * - both layers are keyed by scene id, so a new scene restarts its own fade and
 *   no stale layer survives the change;
 * - the whole layer is `aria-hidden`, non-interactive and behind the UI;
 * - reduced motion drops the camera preset and uses a cut instead of a fade.
 */
export function SceneBackdrop({ presentation }: SceneBackdropProps): React.ReactElement {
  const reducedMotion = usePrefersReducedMotion();
  const url = resolveAssetUrl(presentation.assetId);
  const status = useSceneImage(url);
  const fallback = resolveFallbackGradient(presentation.fallbackGradientId);

  const transition = transitionClass(reducedMotion ? 'cut' : presentation.transition);
  const camera = reducedMotion ? '' : cameraClass(presentation.camera);
  const showImage = url !== null && status === 'loaded';

  return (
    <div
      className="scene-backdrop"
      aria-hidden="true"
      data-scene-id={presentation.sceneId}
      data-motion={reducedMotion ? 'reduced' : 'full'}
      data-camera={reducedMotion ? 'none' : presentation.camera}
      data-image-status={status}
      style={{ pointerEvents: 'none' }}
    >
      <div className={classNames('scene-camera', camera)}>
        <div
          key={`gradient-${presentation.sceneId}`}
          className={classNames('scene-layer', 'scene-layer--gradient', transition)}
          style={{ background: fallback.background }}
        />
        {showImage && (
          <div
            key={`image-${presentation.sceneId}`}
            className={classNames('scene-layer', 'scene-layer--image', transitionClass('fade'))}
            style={{
              backgroundImage: `url("${url}")`,
              // Cover-crop keeps the artwork un-stretched; the focal point only
              // decides which part of the image survives the crop.
              backgroundPosition: `${presentation.focus.x}% ${presentation.focus.y}%`,
            }}
          />
        )}
      </div>

      <div className={classNames('scene-overlay', overlayClass(presentation.overlay))} />
      <div className="scene-scrim" />
    </div>
  );
}
