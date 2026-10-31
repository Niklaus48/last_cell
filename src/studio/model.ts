/**
 * Studio editing model.
 *
 * The studio works on a *draft*: an editable deep copy of the story plus the
 * content-pack extras (reading pauses, presentation, audio). Nothing here talks
 * to React or to the game; the UI renders this and the save path serialises it.
 *
 * A draft is always a full `ContentPack`, so what the studio saves is exactly
 * what the game loads — no hidden merge rules, no partial files.
 */
import type {
  ChoiceDefinition,
  ChoiceOutcome,
  SceneDefinition,
  StoryDefinition,
} from '../story/engine';
import { chapter1Story } from '../story/content/chapter1';
import { EMPTY_PACK, type ContentPack, type SceneAudio } from '../story/content/pack/types';
import { validateContentPack } from '../story/content/pack/validate';
import {
  SCENE_PRESENTATION_OVERRIDES,
} from '../presentation/scenePresentation';
import type { ScenePresentationOverride } from '../presentation/types';

/** The canonical content, used as the base of a fresh draft. */
export const CANONICAL_STORY: StoryDefinition = chapter1Story;

export interface StudioDraft {
  readonly story: StoryDefinition;
  readonly readingPauseMs: Readonly<Record<string, number>>;
  readonly presentation: readonly ScenePresentationOverride[];
  readonly artwork: Readonly<Record<string, string | null>>;
  readonly audioAssets: Readonly<Record<string, string | null>>;
  readonly sceneAudio: Readonly<Record<string, SceneAudio>>;
}

/** Converts a validated pack into a draft (used when loading from disk). */
export function draftFromPack(pack: ContentPack): StudioDraft {
  return {
    story: pack.story ?? CANONICAL_STORY,
    readingPauseMs: pack.flow?.readingPauseMs ?? {},
    presentation: pack.presentation?.overrides ?? [],
    artwork: pack.presentation?.assets ?? {},
    audioAssets: pack.audio?.assets ?? {},
    sceneAudio: pack.audio?.scenes ?? {},
  };
}

/** What an import attempt produced: a draft, or the reasons it was refused. */
export type ImportResult =
  | { readonly ok: true; readonly draft: StudioDraft }
  | { readonly ok: false; readonly errors: readonly string[] };

/**
 * Reads a pack from JSON text — the inverse of the "export JSON" button.
 *
 * Importing is deliberately *not* saving: the file lands in the draft, where it
 * can be inspected and edited, and only the Apply button writes to disk. A file
 * that fails validation changes nothing.
 */
export function importPackJson(text: string): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unreadable file';
    return { ok: false, errors: [`فایل JSON خوانده نشد: ${detail}`] };
  }

  const result = validateContentPack(raw);
  if (!result.ok || result.pack === null) {
    return { ok: false, errors: result.errors.length > 0 ? result.errors : ['بستهٔ نامعتبر'] };
  }
  return { ok: true, draft: draftFromPack(result.pack) };
}

/** A fresh draft: canonical story, canonical presentation, no audio. */
export function createDraft(): StudioDraft {
  return {
    story: CANONICAL_STORY,
    readingPauseMs: {},
    presentation: SCENE_PRESENTATION_OVERRIDES,
    artwork: {},
    audioAssets: {},
    sceneAudio: {},
  };
}

export function draftToPack(draft: StudioDraft): ContentPack {
  return {
    ...EMPTY_PACK,
    story: draft.story,
    flow: { readingPauseMs: draft.readingPauseMs },
    presentation: { overrides: draft.presentation, assets: draft.artwork },
    audio: { assets: draft.audioAssets, scenes: draft.sceneAudio },
  };
}

// ---------------------------------------------------------------- selectors --

export function scenesOf(draft: StudioDraft): readonly SceneDefinition[] {
  return draft.story.scenes;
}

export function sceneById(draft: StudioDraft, sceneId: string): SceneDefinition | null {
  return draft.story.scenes.find((scene) => scene.id === sceneId) ?? null;
}

export function presentationFor(
  draft: StudioDraft,
  sceneId: string,
): ScenePresentationOverride {
  return (
    draft.presentation.find((override) => override.sceneId === sceneId) ?? { sceneId }
  );
}

export function audioFor(draft: StudioDraft, sceneId: string): SceneAudio {
  return draft.sceneAudio[sceneId] ?? {};
}

// ------------------------------------------------------------------ mutators --
// Every mutator returns a new draft; the UI keeps one draft in state and sets the
// result. Cheap enough at this size (32 scenes) and trivially undoable later.

function withScene(
  draft: StudioDraft,
  sceneId: string,
  update: (scene: SceneDefinition) => SceneDefinition,
): StudioDraft {
  return {
    ...draft,
    story: {
      ...draft.story,
      scenes: draft.story.scenes.map((scene) => (scene.id === sceneId ? update(scene) : scene)),
    },
  };
}

export function updateScene(
  draft: StudioDraft,
  sceneId: string,
  patch: Partial<Pick<SceneDefinition, 'title' | 'narration' | 'backgroundAssetId'>>,
): StudioDraft {
  return withScene(draft, sceneId, (scene) => ({ ...scene, ...patch }));
}

export function setNarrationParagraph(
  draft: StudioDraft,
  sceneId: string,
  index: number,
  text: string,
): StudioDraft {
  return withScene(draft, sceneId, (scene) => ({
    ...scene,
    narration: scene.narration.map((paragraph, i) => (i === index ? text : paragraph)),
  }));
}

export function addNarrationParagraph(draft: StudioDraft, sceneId: string): StudioDraft {
  return withScene(draft, sceneId, (scene) => ({
    ...scene,
    narration: [...scene.narration, ''],
  }));
}

export function removeNarrationParagraph(
  draft: StudioDraft,
  sceneId: string,
  index: number,
): StudioDraft {
  return withScene(draft, sceneId, (scene) => ({
    ...scene,
    narration: scene.narration.filter((_, i) => i !== index),
  }));
}

export function moveNarrationParagraph(
  draft: StudioDraft,
  sceneId: string,
  index: number,
  direction: -1 | 1,
): StudioDraft {
  return withScene(draft, sceneId, (scene) => {
    const target = index + direction;
    if (target < 0 || target >= scene.narration.length) {
      return scene;
    }
    const narration = [...scene.narration];
    const [moved] = narration.splice(index, 1);
    if (moved === undefined) {
      return scene;
    }
    narration.splice(target, 0, moved);
    return { ...scene, narration };
  });
}

export function updateChoice(
  draft: StudioDraft,
  sceneId: string,
  choiceId: string,
  patch: Partial<Pick<ChoiceDefinition, 'label' | 'outcome'>>,
): StudioDraft {
  return withScene(draft, sceneId, (scene) => ({
    ...scene,
    choices: scene.choices.map((choice) =>
      choice.id === choiceId ? { ...choice, ...patch } : choice,
    ),
  }));
}

/** Points a choice at another scene / ending / failure — this edits the tree. */
export function retargetChoice(
  draft: StudioDraft,
  sceneId: string,
  choiceId: string,
  outcome: ChoiceOutcome,
): StudioDraft {
  return updateChoice(draft, sceneId, choiceId, { outcome });
}

export function addChoice(draft: StudioDraft, sceneId: string): StudioDraft {
  return withScene(draft, sceneId, (scene) => {
    let n = scene.choices.length + 1;
    while (scene.choices.some((choice) => choice.id === `choice-${n}`)) {
      n += 1;
    }
    return {
      ...scene,
      choices: [
        ...scene.choices,
        {
          id: `choice-${n}`,
          label: 'گزینهٔ تازه',
          outcome: { type: 'transition', targetSceneId: scene.id },
        },
      ],
    };
  });
}

export function removeChoice(draft: StudioDraft, sceneId: string, choiceId: string): StudioDraft {
  return withScene(draft, sceneId, (scene) => {
    // Dropping the default choice would leave an invalid timed decision behind,
    // so the timed block is removed with it.
    const { timedDecision, ...rest } = scene;
    const choices = scene.choices.filter((choice) => choice.id !== choiceId);
    const keepTimed = timedDecision !== undefined && timedDecision.defaultChoiceId !== choiceId;
    return keepTimed ? { ...rest, choices, timedDecision } : { ...rest, choices };
  });
}

export function setTimedDecision(
  draft: StudioDraft,
  sceneId: string,
  timed: { durationMs: number; defaultChoiceId: string } | null,
): StudioDraft {
  return withScene(draft, sceneId, (scene) => {
    if (timed !== null) {
      return { ...scene, timedDecision: timed };
    }
    // `exactOptionalPropertyTypes` wants the key gone, not set to undefined.
    return {
      id: scene.id,
      title: scene.title,
      narration: scene.narration,
      choices: scene.choices,
      ...(scene.backgroundAssetId === undefined
        ? {}
        : { backgroundAssetId: scene.backgroundAssetId }),
    };
  });
}

export function setReadingPause(
  draft: StudioDraft,
  sceneId: string,
  ms: number | null,
): StudioDraft {
  const next = { ...draft.readingPauseMs };
  if (ms === null) {
    delete next[sceneId];
  } else {
    next[sceneId] = ms;
  }
  return { ...draft, readingPauseMs: next };
}

export function updatePresentation(
  draft: StudioDraft,
  sceneId: string,
  patch: Partial<Omit<ScenePresentationOverride, 'sceneId'>>,
): StudioDraft {
  const current = presentationFor(draft, sceneId);
  const updated: ScenePresentationOverride = { ...current, ...patch, sceneId };
  const others = draft.presentation.filter((override) => override.sceneId !== sceneId);
  return { ...draft, presentation: [...others, updated] };
}

/**
 * Declares an audio id in the manifest as "no file yet".
 *
 * The validator (rightly) refuses a cue pointing at a sound nobody declared, so
 * the studio declares the id the moment the author names it: the scene is valid
 * and silent until the file is uploaded, instead of invalid and confusing.
 */
function declareAudio(draft: StudioDraft, assetId: string | undefined): StudioDraft {
  if (assetId === undefined || assetId.trim() === '') {
    return draft;
  }
  if (Object.prototype.hasOwnProperty.call(draft.audioAssets, assetId)) {
    return draft;
  }
  return { ...draft, audioAssets: { ...draft.audioAssets, [assetId]: null } };
}

export function setSceneAudio(
  draft: StudioDraft,
  sceneId: string,
  audio: SceneAudio,
): StudioDraft {
  let next = declareAudio(draft, audio.voice);
  for (const cue of audio.sfx ?? []) {
    next = declareAudio(next, cue.assetId);
  }
  const scenes = { ...next.sceneAudio };
  const empty = (audio.sfx?.length ?? 0) === 0 && audio.voice === undefined;
  if (empty) {
    delete scenes[sceneId];
  } else {
    scenes[sceneId] = audio;
  }
  return { ...next, sceneAudio: scenes };
}

export function setArtworkFile(draft: StudioDraft, assetId: string, file: string | null): StudioDraft {
  return { ...draft, artwork: { ...draft.artwork, [assetId]: file } };
}

export function setAudioFile(draft: StudioDraft, assetId: string, file: string | null): StudioDraft {
  return { ...draft, audioAssets: { ...draft.audioAssets, [assetId]: file } };
}

// --------------------------------------------------------------- tree layout --

export interface TreeNode {
  readonly id: string;
  readonly kind: 'scene' | 'ending' | 'failure';
  readonly title: string;
  readonly depth: number;
  readonly x: number;
  readonly y: number;
}

export interface TreeEdge {
  readonly from: string;
  readonly to: string;
  readonly choiceId: string;
  readonly label: string;
  readonly kind: 'transition' | 'ending' | 'failure';
}

export interface StoryTree {
  readonly nodes: readonly TreeNode[];
  readonly edges: readonly TreeEdge[];
}

const COLUMN_WIDTH = 250;
const ROW_HEIGHT = 96;

/**
 * Layered layout: the starting scene on the right (RTL), each transition moving
 * one column further left, terminals included so branch endings are visible.
 * Deterministic (breadth-first, story order) so the graph does not jump around
 * between renders.
 */
export function buildTree(draft: StudioDraft): StoryTree {
  const story = draft.story;
  const nodes: TreeNode[] = [];
  const edges: TreeEdge[] = [];
  const placed = new Set<string>();
  const depthOf = new Map<string, number>();
  const terminalTitles = new Map<string, { kind: 'ending' | 'failure'; title: string }>();

  for (const ending of story.endings) {
    terminalTitles.set(`ending:${ending.id}`, { kind: 'ending', title: ending.title });
  }
  for (const failure of story.failures ?? []) {
    terminalTitles.set(`failure:${failure.id}`, { kind: 'failure', title: failure.title });
  }

  const queue: string[] = [story.initialSceneId];
  depthOf.set(story.initialSceneId, 0);

  while (queue.length > 0) {
    const sceneId = queue.shift();
    if (sceneId === undefined) {
      break;
    }
    const scene = story.scenes.find((candidate) => candidate.id === sceneId);
    if (scene === undefined) {
      continue;
    }
    const depth = depthOf.get(sceneId) ?? 0;
    if (!placed.has(sceneId)) {
      placed.add(sceneId);
      nodes.push({ id: sceneId, kind: 'scene', title: scene.title, depth, x: 0, y: 0 });
    }

    for (const choice of scene.choices) {
      const outcome = choice.outcome;
      if (outcome.type === 'transition') {
        edges.push({
          from: sceneId,
          to: outcome.targetSceneId,
          choiceId: choice.id,
          label: choice.label,
          kind: 'transition',
        });
        if (!depthOf.has(outcome.targetSceneId)) {
          depthOf.set(outcome.targetSceneId, depth + 1);
          queue.push(outcome.targetSceneId);
        }
      } else {
        const key = outcome.type === 'ending' ? `ending:${outcome.endingId}` : `failure:${outcome.failureId}`;
        edges.push({
          from: sceneId,
          to: key,
          choiceId: choice.id,
          label: choice.label,
          kind: outcome.type,
        });
        if (!placed.has(key)) {
          placed.add(key);
          const meta = terminalTitles.get(key);
          nodes.push({
            id: key,
            kind: outcome.type,
            title: meta?.title ?? key,
            depth: depth + 1,
            x: 0,
            y: 0,
          });
        }
      }
    }
  }

  // Unreachable scenes are still worth seeing: park them in a final column.
  const orphanDepth = Math.max(0, ...depthOf.values()) + 1;
  for (const scene of story.scenes) {
    if (!placed.has(scene.id)) {
      placed.add(scene.id);
      nodes.push({
        id: scene.id,
        kind: 'scene',
        title: scene.title,
        depth: orphanDepth,
        x: 0,
        y: 0,
      });
    }
  }

  // Rows: group by column, keep story order inside a column.
  const order = new Map<string, number>();
  story.scenes.forEach((scene, index) => order.set(scene.id, index));
  const byDepth = new Map<number, TreeNode[]>();
  for (const node of nodes) {
    const bucket = byDepth.get(node.depth) ?? [];
    bucket.push(node);
    byDepth.set(node.depth, bucket);
  }

  // Screen coordinates, RTL: the opening scene sits in the right-most column and
  // every transition moves one column to the left.
  const maxDepth = Math.max(0, ...byDepth.keys());
  const laidOut: TreeNode[] = [];
  for (const [depth, bucket] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
    bucket.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
    bucket.forEach((node, index) => {
      laidOut.push({
        ...node,
        x: (maxDepth - depth) * COLUMN_WIDTH,
        y: index * ROW_HEIGHT,
      });
    });
  }

  return { nodes: laidOut, edges };
}
