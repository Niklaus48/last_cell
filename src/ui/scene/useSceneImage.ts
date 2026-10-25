import { useEffect, useState } from 'react';

export type SceneImageStatus = 'idle' | 'loading' | 'loaded' | 'error';

interface LoadResult {
  readonly url: string;
  readonly status: SceneImageStatus;
}

/**
 * Preloads a scene image and reports whether it is safe to paint.
 *
 * The status is stored together with the URL it belongs to, so a slow request
 * for a scene the player has already left can never report "loaded" for the
 * scene they are looking at now. The effect also cancels its handlers on
 * cleanup, so a late callback is dropped twice over.
 */
export function useSceneImage(url: string | null): SceneImageStatus {
  const [result, setResult] = useState<LoadResult | null>(null);

  useEffect(() => {
    if (url === null) {
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) {
        setResult({ url, status: 'loaded' });
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        // Expected while artwork is still pending or if a file is misplaced:
        // fall back to the scene gradient, and say so once in development.
        if (import.meta.env.DEV) {
          console.warn(`[presentation] could not load scene image "${url}" — using the gradient.`);
        }
        setResult({ url, status: 'error' });
      }
    };
    image.src = url;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [url]);

  if (url === null) {
    return 'idle';
  }
  if (result !== null && result.url === url) {
    return result.status;
  }
  return 'loading';
}
