/**
 * Presentation-facing view of a scene, produced by the story layer.
 *
 * The engine deliberately deals in ids and declarative data. Attachment
 * metadata (asset URLs, etc.) is resolved here, outside React, so components
 * stay dumb. This is not React state: it is a plain derived data structure.
 */
import type {
  ChoiceDefinition,
  EndingDefinition,
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
  return { ending, visitedCount: state.visitedSceneIds.length };
}
