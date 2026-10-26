/**
 * The narration flow as a pure model: stage order, timing configuration and the
 * announcement derived from the engine's available choices.
 *
 * Node environment — no React, no DOM.
 */
import { describe, expect, it } from 'vitest';
import {
  CHOICE_ANNOUNCEMENT_HEADING,
  CHOICE_ANNOUNCEMENT_LEAD,
  NARRATION_PHASES,
  NARRATION_TIMING,
  announcementStageDurationMs,
  buildChoiceAnnouncement,
  choicesInteractive,
  decisionClockRunning,
  flowKeyOf,
  initialPhase,
  narrationStageDurationMs,
  phaseAfter,
  stageDurationMs,
  stageKey,
  type NarrationPhase,
  type NarrationTiming,
} from '../src/app/narrationFlow';

describe('stage order', () => {
  it('always starts a scene with the narration', () => {
    expect(initialPhase()).toBe('scene_narration');
  });

  it('goes narration → announcement → choices when the scene has choices', () => {
    expect(phaseAfter('scene_narration', true)).toBe('choice_announcement');
    expect(phaseAfter('choice_announcement', true)).toBe('choices_available');
    expect(phaseAfter('choices_available', true)).toBeNull();
  });

  it('skips the announcement when there is nothing to announce', () => {
    // A scene whose choices are all conditionally unavailable must not stall.
    expect(phaseAfter('scene_narration', false)).toBe('choices_available');
    expect(phaseAfter('choices_available', false)).toBeNull();
  });

  it('walks the whole sequence exactly once', () => {
    const visited: NarrationPhase[] = [];
    let phase: NarrationPhase | null = initialPhase();
    while (phase !== null) {
      visited.push(phase);
      phase = phaseAfter(phase, true);
    }
    expect(visited).toEqual(['scene_narration', 'choice_announcement', 'choices_available']);
    expect(visited).toEqual([...NARRATION_PHASES]);
  });

  it('marks only the last stage as interactive and countdown-safe', () => {
    expect(choicesInteractive('scene_narration')).toBe(false);
    expect(choicesInteractive('choice_announcement')).toBe(false);
    expect(choicesInteractive('choices_available')).toBe(true);

    // The decision clock is allowed exactly where the choices are interactive.
    for (const phase of NARRATION_PHASES) {
      expect(decisionClockRunning(phase)).toBe(choicesInteractive(phase));
    }
  });
});

describe('reading pauses', () => {
  it('are centralised, positive and long enough to read', () => {
    expect(NARRATION_TIMING.sceneNarrationMs).toBeGreaterThanOrEqual(2000);
    expect(NARRATION_TIMING.perNarrationParagraphMs).toBeGreaterThan(0);
    expect(NARRATION_TIMING.choiceAnnouncementMs).toBeGreaterThanOrEqual(2000);
    expect(NARRATION_TIMING.perAnnouncedChoiceMs).toBeGreaterThan(0);
  });

  it('scale with what there is to read', () => {
    const oneParagraph = narrationStageDurationMs(1);
    const fiveParagraphs = narrationStageDurationMs(5);
    const fiveOptions = announcementStageDurationMs(5);
    const twoOptions = announcementStageDurationMs(2);

    expect(fiveParagraphs).toBeGreaterThan(oneParagraph);
    expect(fiveOptions).toBeGreaterThan(twoOptions);
    // A long scene may still be read before anything moves on its own.
    expect(fiveParagraphs).toBeGreaterThanOrEqual(10000);
  });

  it('respect the declared ceilings and never go negative', () => {
    expect(narrationStageDurationMs(500)).toBe(NARRATION_TIMING.maxSceneNarrationMs);
    expect(announcementStageDurationMs(500)).toBe(NARRATION_TIMING.maxChoiceAnnouncementMs);
    expect(narrationStageDurationMs(0)).toBe(NARRATION_TIMING.sceneNarrationMs);
    expect(announcementStageDurationMs(0)).toBe(NARRATION_TIMING.choiceAnnouncementMs);
    expect(narrationStageDurationMs(-3)).toBeGreaterThanOrEqual(0);
    expect(narrationStageDurationMs(Number.NaN)).toBeGreaterThanOrEqual(0);
    // A nonsensical count falls back to the plain base pause, never to a stall.
    expect(announcementStageDurationMs(Number.POSITIVE_INFINITY)).toBe(
      NARRATION_TIMING.choiceAnnouncementMs,
    );
  });

  it('are tunable from one place', () => {
    const custom: NarrationTiming = {
      sceneNarrationMs: 1000,
      perNarrationParagraphMs: 100,
      maxSceneNarrationMs: 1500,
      choiceAnnouncementMs: 500,
      perAnnouncedChoiceMs: 50,
      maxChoiceAnnouncementMs: 800,
    };
    expect(narrationStageDurationMs(2, custom)).toBe(1200);
    expect(narrationStageDurationMs(99, custom)).toBe(1500);
    expect(announcementStageDurationMs(2, custom)).toBe(600);
    expect(announcementStageDurationMs(99, custom)).toBe(800);
    expect(stageDurationMs('scene_narration', custom)).toBe(1000);
    expect(stageDurationMs('choice_announcement', custom)).toBe(500);
  });

  it('never schedule anything once the choices are available', () => {
    expect(stageDurationMs('choices_available')).toBeNull();
  });
});

describe('stage identity', () => {
  it('keys each stage of each scene visit separately', () => {
    const first = flowKeyOf(0, 'ch1-cell-dawn', 0);
    const sameSceneLater = flowKeyOf(0, 'ch1-cell-dawn', 2);
    const newSession = flowKeyOf(1, 'ch1-cell-dawn', 0);

    expect(new Set([first, sameSceneLater, newSession]).size).toBe(3);
    expect(stageKey(first, 'scene_narration')).not.toBe(stageKey(first, 'choice_announcement'));
  });
});

describe('choice announcement', () => {
  const available = [{ label: 'میله را امتحان می‌کنم.' }, { label: 'گوش می‌دهم.' }];

  it('reuses the choice labels verbatim, and adds no story text', () => {
    const announcement = buildChoiceAnnouncement(available);
    expect(announcement).not.toBeNull();
    expect(announcement?.options).toEqual(['میله را امتحان می‌کنم.', 'گوش می‌دهم.']);
    expect(announcement?.heading).toBe(CHOICE_ANNOUNCEMENT_HEADING);
    expect(announcement?.lead).toBe(CHOICE_ANNOUNCEMENT_LEAD);
  });

  it('returns nothing to announce for an empty list', () => {
    expect(buildChoiceAnnouncement([])).toBeNull();
  });

  it('announces only what it is given (unavailable choices never leak)', () => {
    // The caller passes the engine's filtered list; building from a filtered
    // list produces exactly that list and nothing more.
    const filtered = available.slice(0, 1);
    expect(buildChoiceAnnouncement(filtered)?.options).toEqual(['میله را امتحان می‌کنم.']);
  });

  it('keeps the option order the engine returned', () => {
    const announcement = buildChoiceAnnouncement(available);
    expect(announcement?.options[0]).toBe(available[0]?.label);
    expect(announcement?.options[1]).toBe(available[1]?.label);
  });
});
