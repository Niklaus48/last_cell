/**
 * Structural validation of story definitions.
 *
 * Pure, React-free, DOM-free. Catches authoring mistakes that would otherwise
 * turn into broken runs at runtime: missing initial scene, duplicate ids,
 * dangling scene/ending/failure/checkpoint references, undeclared clues,
 * impossible increments, dead-end scenes, malformed timed decisions.
 */
import type {
  CheckpointDefinition,
  ChoiceCondition,
  ChoiceDefinition,
  ClueDefinition,
  EndingDefinition,
  FailureDefinition,
  SceneDefinition,
  StateEffect,
  StoryDefinition,
} from './types';

export type StoryValidationCode =
  | 'EMPTY_FIELD'
  | 'NO_SCENES'
  | 'DUPLICATE_SCENE_ID'
  | 'DUPLICATE_CHOICE_ID'
  | 'DUPLICATE_ENDING_ID'
  | 'DUPLICATE_CLUE_ID'
  | 'DUPLICATE_CHECKPOINT_ID'
  | 'DUPLICATE_FAILURE_ID'
  | 'UNKNOWN_INITIAL_SCENE'
  | 'UNKNOWN_TARGET_SCENE'
  | 'UNKNOWN_ENDING'
  | 'UNKNOWN_FAILURE'
  | 'UNKNOWN_CLUE'
  | 'UNKNOWN_CHECKPOINT'
  | 'UNKNOWN_CHECKPOINT_SCENE'
  | 'INVALID_RECOVERY'
  | 'INVALID_INCREMENT'
  | 'SCENE_WITHOUT_CHOICES'
  | 'SCENE_WITHOUT_NARRATION'
  | 'INVALID_TIMED_DECISION'
  | 'INVALID_CONDITION'
  | 'INVALID_EFFECT';

export interface StoryValidationError {
  /** Machine-readable reason. */
  readonly code: StoryValidationCode;
  /** Location inside the story definition, e.g. `scenes[1].choices[0].outcome`. */
  readonly path: string;
  /** Human-readable explanation (developer-facing). */
  readonly message: string;
}

export type StoryValidationResult =
  | { readonly ok: true; readonly story: StoryDefinition }
  | { readonly ok: false; readonly errors: readonly StoryValidationError[] };

type Report = (error: StoryValidationError) => void;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStateValue(value: unknown): boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

interface StoryIndex {
  readonly sceneIds: ReadonlySet<string>;
  readonly endingIds: ReadonlySet<string>;
  readonly failureIds: ReadonlySet<string>;
  readonly checkpointIds: ReadonlySet<string>;
  /** `null` when the story declares no clue registry (references are then free-form). */
  readonly clueIds: ReadonlySet<string> | null;
}

function validateCondition(
  condition: ChoiceCondition,
  path: string,
  index: StoryIndex,
  report: Report,
): void {
  switch (condition.kind) {
    case 'always':
      return;
    case 'visitedScene':
      if (!isNonEmptyString(condition.sceneId)) {
        report({ code: 'INVALID_CONDITION', path: `${path}.sceneId`, message: 'visitedScene requires a non-empty scene id.' });
      } else if (!index.sceneIds.has(condition.sceneId)) {
        report({
          code: 'INVALID_CONDITION',
          path: `${path}.sceneId`,
          message: `visitedScene references unknown scene "${condition.sceneId}".`,
        });
      }
      return;
    case 'clueDiscovered':
      if (!isNonEmptyString(condition.clueId)) {
        report({ code: 'INVALID_CONDITION', path: `${path}.clueId`, message: 'clueDiscovered requires a non-empty clue id.' });
      } else if (index.clueIds !== null && !index.clueIds.has(condition.clueId)) {
        report({
          code: 'UNKNOWN_CLUE',
          path: `${path}.clueId`,
          message: `clueDiscovered references undeclared clue "${condition.clueId}".`,
        });
      }
      return;
    case 'compareVariable':
      if (!isNonEmptyString(condition.variable)) {
        report({ code: 'INVALID_CONDITION', path: `${path}.variable`, message: 'compareVariable requires a non-empty variable name.' });
      }
      if (!isStateValue(condition.value)) {
        report({
          code: 'INVALID_CONDITION',
          path: `${path}.value`,
          message: 'compareVariable value must be a string, number or boolean.',
        });
      }
      if (
        (condition.operator === 'gt' ||
          condition.operator === 'gte' ||
          condition.operator === 'lt' ||
          condition.operator === 'lte') &&
        typeof condition.value !== 'number'
      ) {
        report({
          code: 'INVALID_CONDITION',
          path: `${path}.value`,
          message: `Ordered operator "${condition.operator}" requires a numeric value.`,
        });
      }
      return;
    case 'not':
      validateCondition(condition.condition, `${path}.condition`, index, report);
      return;
    case 'all':
    case 'any':
      if (condition.conditions.length === 0) {
        report({
          code: 'INVALID_CONDITION',
          path: `${path}.conditions`,
          message: `"${condition.kind}" requires at least one child condition.`,
        });
      }
      condition.conditions.forEach((child, childIndex) => {
        validateCondition(child, `${path}.conditions[${childIndex}]`, index, report);
      });
      return;
  }
}

function validateEffect(
  effect: StateEffect,
  path: string,
  index: StoryIndex,
  initialVariables: Readonly<Record<string, unknown>>,
  report: Report,
): void {
  switch (effect.kind) {
    case 'setVariable':
      if (!isNonEmptyString(effect.variable)) {
        report({ code: 'INVALID_EFFECT', path: `${path}.variable`, message: 'setVariable requires a non-empty variable name.' });
      }
      if (!isStateValue(effect.value)) {
        report({
          code: 'INVALID_EFFECT',
          path: `${path}.value`,
          message: 'setVariable value must be a string, number or boolean.',
        });
      }
      return;

    case 'incrementVariable': {
      if (!isNonEmptyString(effect.variable)) {
        report({ code: 'INVALID_EFFECT', path: `${path}.variable`, message: 'incrementVariable requires a non-empty variable name.' });
        return;
      }
      if (typeof effect.amount !== 'number' || !Number.isFinite(effect.amount)) {
        report({
          code: 'INVALID_INCREMENT',
          path: `${path}.amount`,
          message: 'Increment amount must be a finite number.',
        });
      }
      const declared = initialVariables[effect.variable];
      if (declared !== undefined && typeof declared !== 'number') {
        report({
          code: 'INVALID_INCREMENT',
          path: `${path}.variable`,
          message: `Variable "${effect.variable}" is declared as ${typeof declared} in initialVariables and cannot be incremented.`,
        });
      }
      return;
    }

    case 'unsetVariable':
      if (!isNonEmptyString(effect.variable)) {
        report({ code: 'INVALID_EFFECT', path: `${path}.variable`, message: 'unsetVariable requires a non-empty variable name.' });
      }
      return;

    case 'discoverClue':
      if (!isNonEmptyString(effect.clueId)) {
        report({ code: 'INVALID_EFFECT', path: `${path}.clueId`, message: 'discoverClue requires a non-empty clue id.' });
      } else if (index.clueIds !== null && !index.clueIds.has(effect.clueId)) {
        report({
          code: 'UNKNOWN_CLUE',
          path: `${path}.clueId`,
          message: `discoverClue references undeclared clue "${effect.clueId}".`,
        });
      }
      return;
  }
}

function checkScene(
  scene: SceneDefinition,
  index: number,
  storyIndex: StoryIndex,
  initialVariables: Readonly<Record<string, unknown>>,
  report: Report,
): void {
  const scenePath = `scenes[${index}]`;
  // Story data may arrive from JSON, so collections are treated as untrusted.
  const narration: readonly unknown[] = Array.isArray(scene.narration) ? scene.narration : [];
  const choices: readonly ChoiceDefinition[] = Array.isArray(scene.choices) ? scene.choices : [];

  if (!isNonEmptyString(scene.id)) {
    report({ code: 'EMPTY_FIELD', path: `${scenePath}.id`, message: 'Scene id must be a non-empty string.' });
  }
  if (!isNonEmptyString(scene.title)) {
    report({ code: 'EMPTY_FIELD', path: `${scenePath}.title`, message: 'Scene title must be a non-empty string.' });
  }
  if (narration.length === 0) {
    report({ code: 'SCENE_WITHOUT_NARRATION', path: `${scenePath}.narration`, message: `Scene "${scene.id}" has no narration.` });
  }
  narration.forEach((paragraph, paragraphIndex) => {
    if (!isNonEmptyString(paragraph)) {
      report({
        code: 'EMPTY_FIELD',
        path: `${scenePath}.narration[${paragraphIndex}]`,
        message: 'Narration paragraphs must be non-empty strings.',
      });
    }
  });
  if (choices.length === 0) {
    report({ code: 'SCENE_WITHOUT_CHOICES', path: `${scenePath}.choices`, message: `Scene "${scene.id}" is a dead end: it has no choices.` });
  }

  const choiceIds = new Set<string>();
  choices.forEach((choice: ChoiceDefinition, choiceIndex) => {
    const choicePath = `${scenePath}.choices[${choiceIndex}]`;
    if (!isNonEmptyString(choice.id)) {
      report({ code: 'EMPTY_FIELD', path: `${choicePath}.id`, message: 'Choice id must be a non-empty string.' });
    } else if (choiceIds.has(choice.id)) {
      report({
        code: 'DUPLICATE_CHOICE_ID',
        path: `${choicePath}.id`,
        message: `Duplicate choice id "${choice.id}" in scene "${scene.id}".`,
      });
    } else {
      choiceIds.add(choice.id);
    }

    if (!isNonEmptyString(choice.label)) {
      report({ code: 'EMPTY_FIELD', path: `${choicePath}.label`, message: 'Choice label must be a non-empty string.' });
    }

    switch (choice.outcome.type) {
      case 'transition':
        if (!storyIndex.sceneIds.has(choice.outcome.targetSceneId)) {
          report({
            code: 'UNKNOWN_TARGET_SCENE',
            path: `${choicePath}.outcome.targetSceneId`,
            message: `Choice "${choice.id}" leads to unknown scene "${choice.outcome.targetSceneId}".`,
          });
        }
        break;
      case 'ending':
        if (!storyIndex.endingIds.has(choice.outcome.endingId)) {
          report({
            code: 'UNKNOWN_ENDING',
            path: `${choicePath}.outcome.endingId`,
            message: `Choice "${choice.id}" leads to unknown ending "${choice.outcome.endingId}".`,
          });
        }
        break;
      case 'failure':
        if (!storyIndex.failureIds.has(choice.outcome.failureId)) {
          report({
            code: 'UNKNOWN_FAILURE',
            path: `${choicePath}.outcome.failureId`,
            message: `Choice "${choice.id}" leads to unknown failure "${choice.outcome.failureId}".`,
          });
        }
        break;
    }

    if (choice.condition !== undefined) {
      validateCondition(choice.condition, `${choicePath}.condition`, storyIndex, report);
    }

    choice.effects?.forEach((effect, effectIndex) => {
      validateEffect(
        effect,
        `${choicePath}.effects[${effectIndex}]`,
        storyIndex,
        initialVariables,
        report,
      );
    });
  });

  if (scene.timedDecision !== undefined && scene.timedDecision !== null) {
    const timedPath = `${scenePath}.timedDecision`;
    if (!Number.isFinite(scene.timedDecision.durationMs) || scene.timedDecision.durationMs <= 0) {
      report({ code: 'INVALID_TIMED_DECISION', path: `${timedPath}.durationMs`, message: 'Timed decision duration must be a positive number of milliseconds.' });
    }
    if (!choiceIds.has(scene.timedDecision.defaultChoiceId)) {
      report({
        code: 'INVALID_TIMED_DECISION',
        path: `${timedPath}.defaultChoiceId`,
        message: `Timed decision default choice "${scene.timedDecision.defaultChoiceId}" does not exist in scene "${scene.id}".`,
      });
    }
  }
}

/**
 * Validates a story definition. Returns the same object on success so callers
 * can chain: `const result = validateStory(story); if (result.ok) ...`
 */
export function validateStory(story: StoryDefinition): StoryValidationResult {
  const errors: StoryValidationError[] = [];
  const report: Report = (error) => {
    errors.push(error);
  };

  if (!isNonEmptyString(story.id)) {
    report({ code: 'EMPTY_FIELD', path: 'id', message: 'Story id must be a non-empty string.' });
  }
  if (!isNonEmptyString(story.title)) {
    report({ code: 'EMPTY_FIELD', path: 'title', message: 'Story title must be a non-empty string.' });
  }
  const scenes: readonly SceneDefinition[] = Array.isArray(story.scenes) ? story.scenes : [];
  const endings: readonly EndingDefinition[] = Array.isArray(story.endings) ? story.endings : [];
  const clues: readonly ClueDefinition[] | null = Array.isArray(story.clues) ? story.clues : null;
  const checkpoints: readonly CheckpointDefinition[] | null = Array.isArray(story.checkpoints)
    ? story.checkpoints
    : null;
  const failures: readonly FailureDefinition[] | null = Array.isArray(story.failures)
    ? story.failures
    : null;

  if (!Array.isArray(story.scenes) || scenes.length === 0) {
    report({ code: 'NO_SCENES', path: 'scenes', message: 'A story must contain at least one scene.' });
  }
  if (!Array.isArray(story.endings)) {
    report({ code: 'EMPTY_FIELD', path: 'endings', message: 'Story endings must be an array.' });
  }

  // --- scenes ---
  const sceneIds = new Set<string>();
  scenes.forEach((scene, index) => {
    if (!isNonEmptyString(scene.id)) {
      return;
    }
    if (sceneIds.has(scene.id)) {
      report({
        code: 'DUPLICATE_SCENE_ID',
        path: `scenes[${index}].id`,
        message: `Duplicate scene id "${scene.id}".`,
      });
    }
    sceneIds.add(scene.id);
  });

  if (!sceneIds.has(story.initialSceneId)) {
    report({
      code: 'UNKNOWN_INITIAL_SCENE',
      path: 'initialSceneId',
      message: `Initial scene "${story.initialSceneId}" does not exist in the story.`,
    });
  }

  // --- endings ---
  const endingIds = new Set<string>();
  endings.forEach((ending: EndingDefinition, index) => {
    if (!isNonEmptyString(ending.id)) {
      report({ code: 'EMPTY_FIELD', path: `endings[${index}].id`, message: 'Ending id must be a non-empty string.' });
      return;
    }
    if (endingIds.has(ending.id)) {
      report({
        code: 'DUPLICATE_ENDING_ID',
        path: `endings[${index}].id`,
        message: `Duplicate ending id "${ending.id}".`,
      });
    }
    endingIds.add(ending.id);
    if (!isNonEmptyString(ending.title)) {
      report({ code: 'EMPTY_FIELD', path: `endings[${index}].title`, message: 'Ending title must be a non-empty string.' });
    }
  });

  // --- clues ---
  const clueIds = new Set<string>();
  clues?.forEach((clue: ClueDefinition, index) => {
    if (!isNonEmptyString(clue.id)) {
      report({ code: 'EMPTY_FIELD', path: `clues[${index}].id`, message: 'Clue id must be a non-empty string.' });
      return;
    }
    if (clueIds.has(clue.id)) {
      report({
        code: 'DUPLICATE_CLUE_ID',
        path: `clues[${index}].id`,
        message: `Duplicate clue id "${clue.id}".`,
      });
    }
    clueIds.add(clue.id);
    if (!isNonEmptyString(clue.label)) {
      report({ code: 'EMPTY_FIELD', path: `clues[${index}].label`, message: 'Clue label must be a non-empty string.' });
    }
  });

  // --- checkpoints ---
  const checkpointIds = new Set<string>();
  checkpoints?.forEach((checkpoint: CheckpointDefinition, index) => {
    if (!isNonEmptyString(checkpoint.id)) {
      report({ code: 'EMPTY_FIELD', path: `checkpoints[${index}].id`, message: 'Checkpoint id must be a non-empty string.' });
      return;
    }
    if (checkpointIds.has(checkpoint.id)) {
      report({
        code: 'DUPLICATE_CHECKPOINT_ID',
        path: `checkpoints[${index}].id`,
        message: `Duplicate checkpoint id "${checkpoint.id}".`,
      });
    }
    checkpointIds.add(checkpoint.id);
    if (!sceneIds.has(checkpoint.sceneId)) {
      report({
        code: 'UNKNOWN_CHECKPOINT_SCENE',
        path: `checkpoints[${index}].sceneId`,
        message: `Checkpoint "${checkpoint.id}" refers to unknown scene "${checkpoint.sceneId}".`,
      });
    }
  });

  // --- failures ---
  const failureIds = new Set<string>();
  failures?.forEach((failure: FailureDefinition, index) => {
    if (!isNonEmptyString(failure.id)) {
      report({ code: 'EMPTY_FIELD', path: `failures[${index}].id`, message: 'Failure id must be a non-empty string.' });
      return;
    }
    if (failureIds.has(failure.id)) {
      report({
        code: 'DUPLICATE_FAILURE_ID',
        path: `failures[${index}].id`,
        message: `Duplicate failure id "${failure.id}".`,
      });
    }
    failureIds.add(failure.id);

    if (!isNonEmptyString(failure.title)) {
      report({ code: 'EMPTY_FIELD', path: `failures[${index}].title`, message: 'Failure title must be a non-empty string.' });
    }

    if (failure.kind === 'recoverable') {
      if (failure.recovery === undefined) {
        report({
          code: 'INVALID_RECOVERY',
          path: `failures[${index}].recovery`,
          message: `Recoverable failure "${failure.id}" must declare a recovery target.`,
        });
      } else if (failure.recovery.type !== 'checkpoint') {
        report({
          code: 'INVALID_RECOVERY',
          path: `failures[${index}].recovery.type`,
          message: `Failure "${failure.id}" recovery type "${String(failure.recovery.type)}" is not supported.`,
        });
      } else if (!checkpointIds.has(failure.recovery.checkpointId)) {
        report({
          code: 'UNKNOWN_CHECKPOINT',
          path: `failures[${index}].recovery.checkpointId`,
          message: `Failure "${failure.id}" recovers to unknown checkpoint "${failure.recovery.checkpointId}".`,
        });
      }
    } else if (failure.kind === 'terminal') {
      if (failure.recovery !== undefined) {
        report({
          code: 'INVALID_RECOVERY',
          path: `failures[${index}].recovery`,
          message: `Terminal failure "${failure.id}" must not declare a recovery target.`,
        });
      }
    } else {
      report({
        code: 'INVALID_RECOVERY',
        path: `failures[${index}].kind`,
        message: `Failure "${failure.id}" has unknown kind "${String(failure.kind)}".`,
      });
    }
  });

  const storyIndex: StoryIndex = {
    sceneIds,
    endingIds,
    failureIds,
    checkpointIds,
    clueIds: clues === null ? null : clueIds,
  };
  const initialVariables: Readonly<Record<string, unknown>> = story.initialVariables ?? {};

  scenes.forEach((scene, index) => {
    checkScene(scene, index, storyIndex, initialVariables, report);
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, story };
}
