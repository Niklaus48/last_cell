/**
 * Fallback appearances used when a scene has no artwork (or its image fails).
 *
 * These are the same local gradients the game already used in earlier phases, so
 * nothing changes visually until real illustrations are supplied. They are pure
 * CSS colour strings held in the presentation layer — never in story data.
 */
import type { FallbackGradientId } from './types';

export interface FallbackAppearance {
  readonly id: FallbackGradientId;
  /** CSS background value. Only ever applied as an inline `background` style. */
  readonly background: string;
}

const gradients: Readonly<Record<FallbackGradientId, FallbackAppearance>> = {
  'cell-night': {
    id: 'cell-night',
    background: 'linear-gradient(160deg, #0d1016 0%, #141a22 45%, #0a0c10 100%)',
  },
  corridor: {
    id: 'corridor',
    background: 'linear-gradient(160deg, #0a0d12 0%, #101720 55%, #070a0e 100%)',
  },
  'interrogation-room': {
    id: 'interrogation-room',
    background: 'linear-gradient(160deg, #171011 0%, #1d1518 50%, #0b0809 100%)',
  },
  'cell-interior': {
    id: 'cell-interior',
    background: 'linear-gradient(170deg, #0c0f14 0%, #161b23 48%, #080a0d 100%)',
  },
  office: {
    id: 'office',
    background: 'linear-gradient(165deg, #12100c 0%, #1d1a12 52%, #0a0906 100%)',
  },
  cafeteria: {
    id: 'cafeteria',
    background: 'linear-gradient(165deg, #0b1113 0%, #131e21 50%, #070c0e 100%)',
  },
  'service-corridor': {
    id: 'service-corridor',
    background: 'linear-gradient(165deg, #0a0f10 0%, #121a1b 55%, #060a0b 100%)',
  },
  door: {
    id: 'door',
    background: 'linear-gradient(160deg, #0d0f12 0%, #191c20 50%, #08090b 100%)',
  },
  alcove: {
    id: 'alcove',
    background: 'linear-gradient(165deg, #0e1014 0%, #1a1d24 52%, #090a0d 100%)',
  },
  gate: {
    id: 'gate',
    background: 'linear-gradient(170deg, #080b10 0%, #101822 55%, #05070a 100%)',
  },
};

/** Neutral last resort, used when even the requested gradient is unknown. */
export const neutralFallback: FallbackAppearance = {
  id: 'default',
  background: 'linear-gradient(160deg, #0b0e13 0%, #131922 60%, #07090c 100%)',
};

export function resolveFallbackGradient(id: FallbackGradientId | undefined): FallbackAppearance {
  if (id === undefined) {
    return neutralFallback;
  }
  return gradients[id] ?? neutralFallback;
}

export function hasFallbackGradient(id: FallbackGradientId): boolean {
  return gradients[id] !== undefined;
}

export function fallbackGradientIds(): readonly FallbackGradientId[] {
  return Object.keys(gradients);
}
