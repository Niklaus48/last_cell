/**
 * Structural validation of story definitions.
 *
 * Pure, React-free, DOM-free. Catches authoring mistakes that would otherwise
 * turn into broken runs at runtime: missing initial scene, duplicate ids,
 * dangling scene/ending references, dead-end scenes, malformed timed decisions.
 */
import type {
  ChoiceCondition,
  ChoiceDefinition,
  SceneDefinition,
  StoryDefinition,
} from './types';

export type StoryValidationCode =
  | 'EMPTY_FIELD'
  | 'NO_SCENES'
  | 'DUPLICATE_SCENE_ID'
  | 'DUPLICATE_CHOICE_ID'
  | 'DUPLICATE_ENDING_ID'
  | 'UNKNOWN_INITIAL_SCENE'
  | 'UNKNOWN_TARGET_SCENE'
  | 'UNKNOWN_ENDING'
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function checkScene(
  scene: SceneDefinition,
  index: number,
  sceneIds: ReadonlySet<string>,
  endingIds: ReadonlySet<string>,
  report: (error: StoryValidationError) => void,
): void {
  const scenePath = `scenes[${index}]`;

  if (!isNonEmptyString(scene.id)) {
    report({ code: 'EMPTY_FIELD', path: `${scenePath}.id`, message: 'Scene id must be a non-empty string.' });
  }
  if (!isNonEmptyString(scene.title)) {
    report({ code: 'EMPTY_FIELD', path: `${scenePath}.title`, message: 'Scene title must be a non-empty string.' });
  }
  if (scene.narration.length === 0) {
    report({ code: 'SCENE_WITHOUT_NARRATION', path: `${scenePath}.narration`, message: `Scene "${scene.id}" has no narration.` });
  }
  scene.narration.forEach((paragraph, paragraphIndex) => {
    if (!isNonEmptyString(paragraph)) {
      report({
        code: 'EMPTY_FIELD',
        path: `${scenePath}.narration[${paragraphIndex}]`,
        message: 'Narration paragraphs must be non-empty strings.',
      });
    }
  });
  if (scene.choices.length === 0) {
    report({ code: 'SCENE_WITHOUT_CHOICES', path: `${scenePath}.choices`, message: `Scene "${scene.id}" is a dead end: it has no choices.` });
  }

  const choiceIds = new Set<string>();
  scene.choices.forEach((choice: ChoiceDefinition, choiceIndex) => {
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

    if (choice.outcome.type === 'transition') {
      if (!sceneIds.has(choice.outcome.targetSceneId)) {
        report({
          code: 'UNKNOWN_TARGET_SCENE',
          path: `${choicePath}.outcome.targetSceneId`,
          message: `Choice "${choice.id}" leads to unknown scene "${choice.outcome.targetSceneId}".`,
        });
      }
    } else if (!endingIds.has(choice.outcome.endingId)) {
      report({
        code: 'UNKNOWN_ENDING',
        path: `${choicePath}.outcome.endingId`,
        message: `Choice "${choice.id}" leads to unknown ending "${choice.outcome.endingId}".`,
      });
    }

    if (choice.condition !== undefined) {
      validateCondition(choice.condition, `${choicePath}.condition`, scene.id, report);
    }

    choice.effects?.forEach((effect, effectIndex) => {
      const effectPath = `${choicePath}.effects[${effectIndex}]`;
      if (!isNonEmptyString(effect.variable)) {
        report({ code: 'INVALID_EFFECT', path: `${effectPath}.variable`, message: 'Effect variable must be a non-empty string.' });
      }
      if (effect.kind === 'incrementVariable' && !Number.isFinite(effect.amount)) {
        report({ code: 'INVALID_EFFECT', path: `${effectPath}.amount`, message: 'Increment amount must be a finite number.' });
      }
    });
  });

  if (scene.timedDecision !== undefined) {
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

function validateCondition(
  condition: ChoiceCondition,
  path: string,
  sceneId: string,
  report: (error: StoryValidationError) => void,
): void {
  switch (condition.kind) {
    case 'always':
    case 'visitedScene':
      return;
    case 'compareVariable':
      if (!isNonEmptyString(condition.variable)) {
        report({ code: 'INVALID_CONDITION', path: `${path}.variable`, message: 'Condition variable must be a non-empty string.' });
      }
      return;
    case 'not':
      validateCondition(condition.condition, `${path}.condition`, sceneId, report);
      return;
    case 'all':
    case 'any':
      if (condition.conditions.length === 0) {
        report({
          code: 'INVALID_CONDITION',
          path: `${path}.conditions`,
          message: `"${condition.kind}" condition in scene "${sceneId}" must contain at least one child condition.`,
        });
      }
      condition.conditions.forEach((child, index) => {
        validateCondition(child, `${path}.conditions[${index}]`, sceneId, report);
      });
      return;
  }
}

/**
 * Validates a story definition. Returns the same object on success so callers
 * can chain: `const result = validateStory(story); if (result.ok) ...`
 */
export function validateStory(story: StoryDefinition): StoryValidationResult {
  const errors: StoryValidationError[] = [];
  const report = (error: StoryValidationError): void => {
    errors.push(error);
  };

  if (!isNonEmptyString(story.id)) {
    report({ code: 'EMPTY_FIELD', path: 'id', message: 'Story id must be a non-empty string.' });
  }
  if (!isNonEmptyString(story.title)) {
    report({ code: 'EMPTY_FIELD', path: 'title', message: 'Story title must be a non-empty string.' });
  }
  if (story.scenes.length === 0) {
    report({ code: 'NO_SCENES', path: 'scenes', message: 'A story must contain at least one scene.' });
  }

  const sceneIds = new Set<string>();
  story.scenes.forEach((scene, index) => {
    if (!isNonEmptyString(scene.id)) {
      return; // already reported by checkScene
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

  const endingIds = new Set<string>();
  story.endings.forEach((ending, index) => {
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

  story.scenes.forEach((scene, index) => {
    checkScene(scene, index, sceneIds, endingIds, report);
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, story };
}
