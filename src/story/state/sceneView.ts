/**
 * Presentation-facing view of a scene, produced by the story layer.
 *
 * The engine deliberately deals in ids and declarative data. Attachment
 * metadata (asset URLs, etc.) is resolved here, outside React, so components
 * stay dumb. This is not React state: it is a plain derived data structure.
 */
import { deriveVisitedSceneIds } from '../engine';
import type {
  ChoiceDefinition,
  EndingDefinition,
  FailureDefinition,
  HistoryEntry,
  SceneDefinition,
  StoryState,
} from '../engine';

export interface VisualAsset {
  readonly id: string;
  /** CSS colour used as the scene backdrop. */
  readonly backdrop: string;
}

/**
 * Local-only assets. No remote URLs: the app must work offline once loaded.
 */
const visualAssets: Readonly<Record<string, VisualAsset>> = {
  'cell-night': { id: 'cell-night', backdrop: 'linear-gradient(160deg, #0d1016 0%, #141a22 45%, #0a0c10 100%)' },
  corridor: { id: 'corridor', backdrop: 'linear-gradient(160deg, #0a0d12 0%, #101720 55%, #070a0e 100%)' },
  'interrogation-room': { id: 'interrogation-room', backdrop: 'linear-gradient(160deg, #171011 0%, #1d1518 50%, #0b0809 100%)' },
  // Chapter 1 locations (local gradients only — nothing is fetched).
  'cell-interior': { id: 'cell-interior', backdrop: 'linear-gradient(170deg, #0c0f14 0%, #161b23 48%, #080a0d 100%)' },
  office: { id: 'office', backdrop: 'linear-gradient(165deg, #12100c 0%, #1d1a12 52%, #0a0906 100%)' },
  cafeteria: { id: 'cafeteria', backdrop: 'linear-gradient(165deg, #0b1113 0%, #131e21 50%, #070c0e 100%)' },
  'service-corridor': { id: 'service-corridor', backdrop: 'linear-gradient(165deg, #0a0f10 0%, #121a1b 55%, #060a0b 100%)' },
  door: { id: 'door', backdrop: 'linear-gradient(160deg, #0d0f12 0%, #191c20 50%, #08090b 100%)' },
  alcove: { id: 'alcove', backdrop: 'linear-gradient(165deg, #0e1014 0%, #1a1d24 52%, #090a0d 100%)' },
  gate: { id: 'gate', backdrop: 'linear-gradient(170deg, #080b10 0%, #101822 55%, #05070a 100%)' },
};

const fallbackAsset: VisualAsset = {
  id: 'default',
  backdrop: 'linear-gradient(160deg, #0b0e13 0%, #131922 60%, #07090c 100%)',
};

export function resolveVisualAsset(assetId: string | undefined): VisualAsset {
  if (assetId === undefined) {
    return fallbackAsset;
  }
  return visualAssets[assetId] ?? fallbackAsset;
}

export interface SceneViewModel {
  readonly scene: SceneDefinition;
  readonly choices: readonly ChoiceDefinition[];
  readonly asset: VisualAsset;
  /** 1-based position of the current scene on the player's path. */
  readonly step: number;
}

export function toSceneViewModel(
  scene: SceneDefinition,
  choices: readonly ChoiceDefinition[],
  history: readonly HistoryEntry[],
): SceneViewModel {
  return {
    scene,
    choices,
    asset: resolveVisualAsset(scene.backgroundAssetId),
    step: history.length,
  };
}

export interface EndingViewModel {
  readonly ending: EndingDefinition;
  readonly visitedCount: number;
}

export function toEndingViewModel(
  ending: EndingDefinition,
  state: StoryState,
): EndingViewModel {
  // visited scenes are derived from history, never stored twice
  return { ending, visitedCount: deriveVisitedSceneIds(state.history).length };
}

export interface FailureViewModel {
  readonly failure: FailureDefinition;
  readonly visitedCount: number;
  /** True when the failure declares a checkpoint the player could return to. */
  readonly recoverable: boolean;
}

export function toFailureViewModel(
  failure: FailureDefinition,
  state: StoryState,
): FailureViewModel {
  return {
    failure,
    visitedCount: deriveVisitedSceneIds(state.history).length,
    recoverable: failure.kind === 'recoverable' && failure.recovery !== undefined,
  };
}
