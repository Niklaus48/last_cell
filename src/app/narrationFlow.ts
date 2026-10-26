/**
 * Narration-gated choice flow: the typed model behind every scene.
 *
 * A scene is never "just choices". It is a short sequence:
 *
 *   scene_narration → choice_announcement → choices_available
 *
 * Nothing here touches React, the engine or the DOM: this module is pure data
 * plus pure functions, so the sequence can be tested without rendering and the
 * timing lives in one place instead of being scattered across components.
 *
 * Design notes:
 * - The phase is *derived* state. It is never persisted; a restored run starts
 *   its scene again from `scene_narration`, which is why a save can never expose
 *   choices (or a countdown) that the player never reached.
 * - A scene with no available choice after condition evaluation skips the
 *   announcement stage: there is nothing to announce, and the flow must not get
 *   stuck waiting for a choice that does not exist.
 * - The wording below is UI chrome, not story text. Choice labels come verbatim
 *   from the (already condition-filtered) engine output.
 */

/** The three interactive stages of a scene. */
export type NarrationPhase = 'scene_narration' | 'choice_announcement' | 'choices_available';

export const NARRATION_PHASES: readonly NarrationPhase[] = [
  'scene_narration',
  'choice_announcement',
  'choices_available',
];

/**
 * Reading pauses, in milliseconds.
 *
 * Centralised on purpose: every auto-advance delay in the game comes from this
 * object and nowhere else. The pause scales with how much there is to read — a
 * five-paragraph scene gets far longer than a one-line one — but always within
 * declared bounds, so the flow stays predictable and the Continue action is
 * never the only way forward.
 */
export interface NarrationTiming {
  /** Base pause before the scene's narration appears, before reading time. */
  readonly sceneNarrationMs: number;
  /** Reading time granted per narration paragraph. */
  readonly perNarrationParagraphMs: number;
  /** Upper bound for the narration pause. */
  readonly maxSceneNarrationMs: number;
  /** Base pause while the narrator announces the choices. */
  readonly choiceAnnouncementMs: number;
  /** Reading time granted per announced option. */
  readonly perAnnouncedChoiceMs: number;
  /** Upper bound for the announcement pause. */
  readonly maxChoiceAnnouncementMs: number;
}

export const NARRATION_TIMING: NarrationTiming = {
  sceneNarrationMs: 4000,
  perNarrationParagraphMs: 1800,
  maxSceneNarrationMs: 24000,
  choiceAnnouncementMs: 3500,
  perAnnouncedChoiceMs: 900,
  maxChoiceAnnouncementMs: 12000,
};

function clampPause(value: number, max: number): number {
  // Never negative, never longer than the declared ceiling, never NaN.
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.min(value, max);
}

/** Pause before a scene's narration advances, scaled by its paragraph count. */
export function narrationStageDurationMs(
  paragraphCount: number,
  timing: NarrationTiming = NARRATION_TIMING,
): number {
  const paragraphs = Number.isFinite(paragraphCount) ? Math.max(0, paragraphCount) : 0;
  return clampPause(
    timing.sceneNarrationMs + paragraphs * timing.perNarrationParagraphMs,
    timing.maxSceneNarrationMs,
  );
}

/** Pause before the announcements advances, scaled by the number of options. */
export function announcementStageDurationMs(
  optionCount: number,
  timing: NarrationTiming = NARRATION_TIMING,
): number {
  const options = Number.isFinite(optionCount) ? Math.max(0, optionCount) : 0;
  return clampPause(
    timing.choiceAnnouncementMs + options * timing.perAnnouncedChoiceMs,
    timing.maxChoiceAnnouncementMs,
  );
}

/** Base pause of a stage, or `null` when the stage never advances on its own. */
export function stageDurationMs(
  phase: NarrationPhase,
  timing: NarrationTiming = NARRATION_TIMING,
): number | null {
  switch (phase) {
    case 'scene_narration':
      return timing.sceneNarrationMs;
    case 'choice_announcement':
      return timing.choiceAnnouncementMs;
    case 'choices_available':
      // The player is in charge from here; nothing advances on its own.
      return null;
  }
}

/** First stage of a scene: always the narration, with or without choices. */
export function initialPhase(): NarrationPhase {
  return 'scene_narration';
}

/**
 * The stage that follows `phase`, or `null` when the sequence is complete.
 *
 * `hasChoices` decides whether the announcement stage happens at all: a scene
 * whose choices are all conditionally unavailable has nothing to announce and
 * goes straight to the (empty) choice stage so the flow cannot stall.
 */
export function phaseAfter(phase: NarrationPhase, hasChoices: boolean): NarrationPhase | null {
  switch (phase) {
    case 'scene_narration':
      return hasChoices ? 'choice_announcement' : 'choices_available';
    case 'choice_announcement':
      return 'choices_available';
    case 'choices_available':
      return null;
  }
}

/** True when the player may pick a choice in this stage. */
export function choicesInteractive(phase: NarrationPhase): boolean {
  return phase === 'choices_available';
}

/** True while time must not run: scene presentation, narration, announcement. */
export function decisionClockRunning(phase: NarrationPhase): boolean {
  return choicesInteractive(phase);
}

/** Identity of one stage, used to make advancing exactly-once. */
export function stageKey(flowKey: string, phase: NarrationPhase): string {
  return `${flowKey}#${phase}`;
}

/**
 * Identity of a scene visit: a new session, a new scene, or the same scene at a
 * different point on the path is a new flow and restarts at the narration.
 */
export function flowKeyOf(epoch: number, sceneId: string, historyLength: number): string {
  return `${epoch}#${sceneId}#${historyLength}`;
}

/** What the narrator says before the choices appear. Labels are story text. */
export interface ChoiceAnnouncement {
  readonly heading: string;
  /** Neutral UI sentence; it introduces the labels, it does not rewrite them. */
  readonly lead: string;
  readonly options: readonly string[];
}

export const CHOICE_ANNOUNCEMENT_HEADING = 'تصمیم پیش رو';
export const CHOICE_ANNOUNCEMENT_LEAD = 'راوی گزینه‌های پیش رو را اعلام می‌کند:';

/**
 * Builds the announcement from the choices the engine reports as available.
 *
 * Only labels are used — no narration is invented, and unavailable conditional
 * choices can never leak in, because the caller passes the already-filtered list.
 * Returns `null` when there is nothing to announce.
 */
export function buildChoiceAnnouncement(
  choices: readonly { readonly label: string }[],
): ChoiceAnnouncement | null {
  if (choices.length === 0) {
    return null;
  }
  return {
    heading: CHOICE_ANNOUNCEMENT_HEADING,
    lead: CHOICE_ANNOUNCEMENT_LEAD,
    options: choices.map((choice) => choice.label),
  };
}
