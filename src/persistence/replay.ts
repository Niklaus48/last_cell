/**
 * Rebuilds in-session checkpoints for a restored save.
 *
 * Checkpoints are session objects, not part of the saved snapshot: the snapshot
 * stores the run's *state*, while a checkpoint is a saved state plus the id of
 * the declared opportunity it was taken at. A loaded run therefore starts with
 * no checkpoints, which would quietly break recovery for a saved failure.
 *
 * Rather than persisting them (a second source of truth that could drift), we
 * replay the run's own history through the public engine API: the engine is
 * deterministic, so replaying the recorded choices reproduces exactly the states
 * the player actually stood in, and we re-take the declared checkpoints as we
 * pass them. Nothing is invented — a checkpoint only exists if the replay
 * genuinely reaches its declared scene.
 */
import type { Checkpoint, StoryEngine, StoryState } from '../story/engine';

export function rebuildCheckpoints(
  engine: StoryEngine,
  state: StoryState,
): readonly Checkpoint[] {
  const captured: Checkpoint[] = [];

  const capture = (current: StoryState): void => {
    const opportunity = engine.getCheckpointOpportunity(current);
    if (opportunity === null) {
      return;
    }
    const created = engine.createCheckpoint(current, opportunity.id);
    if (!created.ok) {
      return;
    }
    const index = captured.findIndex(
      (entry) => entry.checkpointId === created.checkpoint.checkpointId,
    );
    if (index === -1) {
      captured.push(created.checkpoint);
    } else {
      // Newest snapshot per declared checkpoint wins, matching live play.
      captured[index] = created.checkpoint;
    }
  };

  let current = engine.start();
  capture(current);

  // History records two entries per step: one when a scene is entered
  // (`choiceId: null`) and one when it is left (`choiceId` set). Nulls are
  // skipped rather than treated as the end of the recorded path.
  for (let index = 0; index < state.history.length - 1; index += 1) {
    const entry = state.history[index];
    const choiceId = entry?.choiceId ?? null;
    if (choiceId === null) {
      continue;
    }
    const result = engine.choose(current, { sceneId: current.currentSceneId, choiceId });
    if (!result.ok) {
      // The history cannot be replayed with this content: keep what we have.
      break;
    }
    current = result.state;
    capture(current);
  }

  return captured;
}
