/**
 * The single place where a presentation *preset id* becomes a CSS class.
 *
 * Story and presentation data carry ids only. If a class needs to change, or a
 * preset gains a variant, it changes here and in the stylesheet — never in
 * scene content.
 */
import type { CameraPreset, OverlayPreset, TransitionPreset } from './types';

const cameraClasses: Readonly<Record<CameraPreset, string>> = {
  none: '',
  'slow-zoom-in': 'scene-camera--zoom-in',
  'slow-zoom-out': 'scene-camera--zoom-out',
  'pan-left': 'scene-camera--pan-left',
  'pan-right': 'scene-camera--pan-right',
};

const overlayClasses: Readonly<Record<OverlayPreset, string>> = {
  none: '',
  vignette: 'scene-overlay--vignette',
  haze: 'scene-overlay--haze',
  cold: 'scene-overlay--cold',
};

const transitionClasses: Readonly<Record<TransitionPreset, string>> = {
  fade: 'scene-layer--fade',
  cut: 'scene-layer--cut',
};

export function cameraClass(preset: CameraPreset): string {
  return cameraClasses[preset];
}

export function overlayClass(preset: OverlayPreset): string {
  return overlayClasses[preset];
}

export function transitionClass(preset: TransitionPreset): string {
  return transitionClasses[preset];
}

/** Join class names, dropping empty entries. */
export function classNames(...parts: readonly (string | false | null | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === 'string' && part.length > 0).join(' ');
}
