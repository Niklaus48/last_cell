/**
 * Presentation-facing view of a scene, produced by the story layer.
 *
 * The engine deliberately deals in ids and declarative data; this module turns a
 * scene plus the derived history into the small structure the screens need. It
 * carries no visual styling: artwork, camera and overlays belong to
 * `src/presentation/`, so the story layer stays free of CSS concerns.
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

export interface SceneViewModel {
  readonly scene: SceneDefinition;
  readonly choices: readonly ChoiceDefinition[];
  /** 1-based position of the current scene on the player's path. */
  readonly step: number;
}

export function toSceneViewModel(
  scene: SceneDefinition,
  choices: readonly ChoiceDefinition[],
  history: readonly HistoryEntry[],
): SceneViewModel {
  // Visual presentation is resolved by `src/presentation/`, not here: this layer
  // describes the scene, it does not paint it.
  return {
    scene,
    choices,
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
