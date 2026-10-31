/**
 * The small shape the change notice needs from the story layer.
 *
 * Kept separate from the component so the *data* (labels) stays testable in a
 * Node environment and the component stays free of lookups.
 */
import type { ClueDefinition, VariableMeta } from '../../story/engine';

export interface ChangeNoticeModel {
  /** Label of the choice that was taken, or null when it is not known. */
  readonly choiceLabel: string | null;
  readonly variableLabels: Readonly<Record<string, VariableMeta>>;
  readonly clueLabels: Readonly<Record<string, string>>;
}

export function clueLabelsFrom(clues: readonly ClueDefinition[]): Readonly<Record<string, string>> {
  return Object.fromEntries(clues.map((clue) => [clue.id, clue.label]));
}
