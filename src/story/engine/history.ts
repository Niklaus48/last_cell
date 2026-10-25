/**
 * Derivation helpers for the player's path. Pure, React-free, DOM-free.
 *
 * `StoryState` stores only `history`; the ordered unique scene list, the choice
 * sequence and "has this scene been visited" are all derived here so the two
 * representations can never drift apart.
 */
import type { ChoiceId, HistoryEntry, SceneId } from './types';

/** Ordered, de-duplicated list of scenes the player has stood in. */
export function deriveVisitedSceneIds(history: readonly HistoryEntry[]): readonly SceneId[] {
  const seen: SceneId[] = [];
  for (const entry of history) {
    if (!seen.includes(entry.sceneId)) {
      seen.push(entry.sceneId);
    }
  }
  return seen;
}

/** Ordered sequence of choice ids the player actually took successfully. */
export function deriveChoiceSequence(history: readonly HistoryEntry[]): readonly ChoiceId[] {
  return history.flatMap((entry) => (entry.choiceId === null ? [] : [entry.choiceId]));
}

/** Ordered list of successful scene-to-scene moves (for the future flowchart). */
export interface SceneTransitionStep {
  readonly fromSceneId: SceneId;
  readonly choiceId: ChoiceId;
  readonly toSceneId: SceneId;
}

/**
 * Reconstructs the successful transitions from history.
 * Pairs each picked choice with the scene it led to. A choice that ended or
 * failed the run has no following scene entry and is therefore not a move.
 */
export function deriveSceneTransitions(
  history: readonly HistoryEntry[],
): readonly SceneTransitionStep[] {
  const steps: SceneTransitionStep[] = [];
  for (let index = 0; index < history.length - 1; index += 1) {
    const current = history[index];
    const next = history[index + 1];
    if (current === undefined || next === undefined || current.choiceId === null) {
      continue;
    }
    steps.push({
      fromSceneId: current.sceneId,
      choiceId: current.choiceId,
      toSceneId: next.sceneId,
    });
  }
  return steps;
}

/** The scene the player is standing in, per the history. */
export function currentSceneOf(history: readonly HistoryEntry[]): SceneId | null {
  return history.at(-1)?.sceneId ?? null;
}
