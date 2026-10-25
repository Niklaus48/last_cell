// @vitest-environment jsdom
/**
 * SceneBackdrop: painting, fallback, loading errors, stale loads, reduced motion.
 *
 * `Image` is faked so load/error callbacks are deterministic, and the manifest is
 * exercised through a mocked asset entry for the "artwork exists" cases.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { SceneBackdrop } from '../src/ui/scene/SceneBackdrop';
import {
  getScenePresentation,
  resetAssetWarnings,
  resolveFallbackGradient,
  type ScenePresentation,
} from '../src/presentation';
import * as manifest from '../src/presentation/assetManifest';

class FakeImage {
  static instances: FakeImage[] = [];

  onload: (() => void) | null = null;

  onerror: (() => void) | null = null;

  src = '';

  constructor() {
    FakeImage.instances.push(this);
  }

  finishLoad(): void {
    this.onload?.();
  }

  finishError(): void {
    this.onerror?.();
  }
}

function latestImage(): FakeImage {
  const image = FakeImage.instances.at(-1);
  if (image === undefined) {
    throw new Error('no image was requested');
  }
  return image;
}

function presentationFor(sceneId: string): ScenePresentation {
  return getScenePresentation({ id: sceneId, backgroundAssetId: 'door' });
}

function stubReducedMotion(reduced: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduced,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));
}

beforeEach(() => {
  FakeImage.instances = [];
  vi.stubGlobal('Image', FakeImage);
  stubReducedMotion(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  resetAssetWarnings();
});

describe('fallback painting', () => {
  it('paints the scene gradient when no artwork is supplied', () => {
    const presentation = presentationFor('ch1-locked-door');
    const { container } = render(<SceneBackdrop presentation={presentation} />);

    const gradient = container.querySelector('.scene-layer--gradient');
    expect(gradient).not.toBeNull();
    expect(gradient?.getAttribute('style')).toContain('linear-gradient');
    // No image was even requested: pending artwork is not an error.
    expect(container.querySelector('.scene-layer--image')).toBeNull();
    expect(FakeImage.instances).toHaveLength(0);
    expect(container.querySelector('.scene-backdrop')?.getAttribute('data-image-status')).toBe('idle');
  });

  it('marks itself decorative and non-interactive', () => {
    const { container } = render(<SceneBackdrop presentation={presentationFor('ch1-cell-dawn')} />);
    const backdrop = container.querySelector<HTMLElement>('.scene-backdrop');
    expect(backdrop?.getAttribute('aria-hidden')).toBe('true');
    expect(backdrop?.style.pointerEvents).toBe('none');
  });

  it('an unknown asset id renders the gradient instead of crashing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const presentation: ScenePresentation = {
      ...presentationFor('ch1-cell-dawn'),
      assetId: 'artwork-that-does-not-exist',
    };

    const { container } = render(<SceneBackdrop presentation={presentation} />);
    expect(container.querySelector('.scene-layer--gradient')).not.toBeNull();
    expect(warn.mock.calls.some((call) => String(call[0]).includes('unknown asset id'))).toBe(true);
  });

  it('uses the neutral gradient when even the fallback id is unknown', () => {
    const presentation: ScenePresentation = {
      ...presentationFor('ch1-cell-dawn'),
      fallbackGradientId: 'no-such-gradient',
    };
    const { container } = render(<SceneBackdrop presentation={presentation} />);
    const expected = resolveFallbackGradient('no-such-gradient').background;
    expect(container.querySelector('.scene-layer--gradient')?.getAttribute('style')).toContain(
      expected.split('(')[0] ?? '',
    );
  });
});

describe('artwork loading', () => {
  beforeEach(() => {
    // Pretend the artist supplied one file, without shipping any image.
    vi.spyOn(manifest, 'resolveAssetUrl').mockImplementation((assetId: string) =>
      assetId === 'door' || assetId === 'cell-interior'
        ? `/assets/scenes/chapter-1/${assetId}.webp`
        : null,
    );
  });

  it('shows the image only after it loads, then applies focal point + cover crop', () => {
    const presentation = presentationFor('ch1-locked-door');
    const { container } = render(<SceneBackdrop presentation={presentation} />);

    expect(container.querySelector('.scene-layer--image')).toBeNull();
    expect(container.querySelector('.scene-backdrop')?.getAttribute('data-image-status')).toBe(
      'loading',
    );

    act(() => {
      latestImage().finishLoad();
    });

    const image = container.querySelector<HTMLElement>('.scene-layer--image');
    expect(image).not.toBeNull();
    expect(image?.style.backgroundImage).toContain('/assets/scenes/chapter-1/door.webp');
    expect(image?.style.backgroundPosition).toBe(`${presentation.focus.x}% ${presentation.focus.y}%`);
    // The gradient stays underneath: no blank frame if the image is removed.
    expect(container.querySelector('.scene-layer--gradient')).not.toBeNull();
  });

  it('falls back gracefully when the image fails to load', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { container } = render(<SceneBackdrop presentation={presentationFor('ch1-locked-door')} />);

    act(() => {
      latestImage().finishError();
    });

    expect(container.querySelector('.scene-layer--image')).toBeNull();
    expect(container.querySelector('.scene-layer--gradient')).not.toBeNull();
    expect(container.querySelector('.scene-backdrop')?.getAttribute('data-image-status')).toBe('error');
    expect(warn.mock.calls.some((call) => String(call[0]).includes('could not load scene image'))).toBe(
      true,
    );
  });

  it('keeps the previous scene painted while the next image loads', () => {
    const { container, rerender } = render(
      <SceneBackdrop presentation={presentationFor('ch1-locked-door')} />,
    );
    act(() => {
      latestImage().finishLoad();
    });
    expect(container.querySelector('.scene-layer--image')).not.toBeNull();

    // Next scene: a different asset id, not loaded yet.
    rerender(
      <SceneBackdrop
        presentation={{ ...presentationFor('ch1-cell-dawn'), assetId: 'cell-interior' }}
      />,
    );
    expect(container.querySelector('.scene-layer--image')).toBeNull();
    expect(container.querySelector('.scene-layer--gradient')).not.toBeNull();
  });

  it('a stale image request cannot overwrite the current scene', () => {
    const { container, rerender } = render(
      <SceneBackdrop presentation={presentationFor('ch1-locked-door')} />,
    );
    const firstRequest = latestImage();

    rerender(
      <SceneBackdrop
        presentation={{ ...presentationFor('ch1-cell-dawn'), assetId: 'cell-interior' }}
      />,
    );
    const secondRequest = latestImage();
    expect(secondRequest).not.toBe(firstRequest);

    // The old request finishes late…
    act(() => {
      firstRequest.finishLoad();
    });
    expect(container.querySelector('.scene-layer--image')).toBeNull();
    expect(container.querySelector('.scene-backdrop')?.getAttribute('data-scene-id')).toBe(
      'ch1-cell-dawn',
    );

    // …and only the current scene's own image is painted.
    act(() => {
      secondRequest.finishLoad();
    });
    expect(container.querySelector('.scene-layer--image')?.getAttribute('style')).toContain(
      'cell-interior',
    );
  });
});

describe('scene changes and motion', () => {
  it('swaps gradient, motion preset and scene identity in one render', () => {
    const door = presentationFor('ch1-locked-door');
    const gate = { ...presentationFor('ch1-final-approach'), camera: 'slow-zoom-out' as const };

    const { container, rerender } = render(<SceneBackdrop presentation={door} />);
    expect(container.querySelector('.scene-backdrop')?.getAttribute('data-scene-id')).toBe(
      'ch1-locked-door',
    );
    expect(container.querySelector('.scene-camera')?.className).not.toContain('zoom-out');

    rerender(<SceneBackdrop presentation={gate} />);
    expect(container.querySelector('.scene-backdrop')?.getAttribute('data-scene-id')).toBe(
      'ch1-final-approach',
    );
    expect(container.querySelector('.scene-camera')?.className).toContain('scene-camera--zoom-out');
    expect(container.querySelector('.scene-backdrop')?.getAttribute('data-camera')).toBe(
      'slow-zoom-out',
    );
  });

  it('never renders two background layers for the same scene', () => {
    const { container, rerender } = render(
      <SceneBackdrop presentation={presentationFor('ch1-locked-door')} />,
    );
    rerender(<SceneBackdrop presentation={presentationFor('ch1-cell-dawn')} />);
    expect(container.querySelectorAll('.scene-layer--gradient')).toHaveLength(1);
    expect(container.querySelectorAll('.scene-backdrop')).toHaveLength(1);
  });

  it('disables camera motion and uses a cut when the user prefers reduced motion', () => {
    stubReducedMotion(true);
    const presentation = presentationFor('ch1-corridor-first');
    const { container } = render(<SceneBackdrop presentation={presentation} />);

    const backdrop = container.querySelector('.scene-backdrop');
    expect(backdrop?.getAttribute('data-motion')).toBe('reduced');
    expect(backdrop?.getAttribute('data-camera')).toBe('none');
    expect(container.querySelector('.scene-camera')?.className).not.toContain('scene-camera--pan');
    // Fade animation is replaced by the immediate preset.
    expect(container.querySelector('.scene-layer--gradient')?.className).toContain(
      'scene-layer--cut',
    );
  });

  it('keeps the declared camera preset when motion is allowed', () => {
    const { container } = render(
      <SceneBackdrop presentation={presentationFor('ch1-corridor-first')} />,
    );
    expect(container.querySelector('.scene-backdrop')?.getAttribute('data-motion')).toBe('full');
    expect(container.querySelector('.scene-camera')?.className).toContain('scene-camera--pan-right');
  });

  it('applies the declared overlay preset', () => {
    const { container } = render(<SceneBackdrop presentation={presentationFor('ch1-locked-door')} />);
    expect(container.querySelector('.scene-overlay')?.className).toContain('scene-overlay--cold');
  });
});
