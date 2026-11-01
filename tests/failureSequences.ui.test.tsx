// @vitest-environment jsdom
/**
 * The failure sequences as the player actually meets them, through the real
 * `<App />`.
 *
 * The engine tests prove the state machine; these prove the experience: the
 * mistake is a scene with narration and a Continue, the result screen appears
 * only after both acts have been read, a fatal result is never presented as a
 * rescue, and every loss can be rewound or restarted from where it says.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from '../src/app/App';
import { chapter1Story, CHAPTER1_FAILURE } from '../src/story/content/chapter1';
import { choicesVisible, currentPhase, openChoices } from './helpers/flow';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Persian label of a choice, resolved from the canonical content. */
function labelOf(choiceId: string): string {
  for (const scene of chapter1Story.scenes) {
    const choice = scene.choices.find((candidate) => candidate.id === choiceId);
    if (choice !== undefined) {
      return choice.label;
    }
  }
  throw new Error(`unknown choice id ${choiceId}`);
}

/**
 * Clicks a choice by its content id.
 *
 * A gated choice's accessible name also carries its condition text, so matching
 * on the exact label would miss it; matching on the visible text keeps the test
 * about what the player reads.
 */
function clickChoice(choiceId: string): void {
  openChoices();
  const label = labelOf(choiceId);
  const button = [...document.querySelectorAll<HTMLButtonElement>('.choice-button')].find(
    (candidate) => (candidate.textContent ?? '').includes(label),
  );
  if (button === undefined) {
    throw new Error(`choice "${choiceId}" is not on screen`);
  }
  fireEvent.click(button);
}

/** Starts a fresh chapter and takes each choice in turn, through the gate. */
function play(choiceIds: readonly string[]): void {
  fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));
  for (const choiceId of choiceIds) {
    clickChoice(choiceId);
  }
}

function backdropSceneId(): string | null {
  return document.querySelector('.scene-backdrop')?.getAttribute('data-scene-id') ?? null;
}

/** Asserts that a scene is on screen and readable, but cannot end the attempt yet. */
function expectSceneNotResult(sceneId: string): void {
  expect(backdropSceneId()).toBe(sceneId);
  expect(currentPhase()).not.toBeNull();
  // The scene is narrated; the failure screen is not here yet.
  expect(screen.queryByRole('button', { name: /بازگشت به آخرین نقطهٔ امن/ })).toBeNull();
}

const TO_DOOR = [
  'listen-to-the-corridor',
  'go-back-to-the-bed',
  'stay-silent',
  'wait-for-the-steps-to-fade',
  'slip-out-now',
  'take-the-service-way',
  'cross-to-the-service-door',
  'head-straight-to-the-door',
  'straight-to-the-door',
];

describe('a failed attempt is read before it is scored', () => {
  it('plays the door sequence as two scenes before the result', () => {
    render(<App storyKey="chapter1" storage={null} />);
    play([...TO_DOOR, 'pick-the-bolt', 'press-the-pick']);

    // The rushed pick opens the sequence instead of ending the attempt.
    expectSceneNotResult('ch1-fail-door-detected');
    clickChoice('failure-door-continue');
    expectSceneNotResult('ch1-fail-door-captured');

    clickChoice('failure-door-result');

    expect(screen.getByRole('heading', { name: /سلول ۱۴/ })).not.toBeNull();
    expect(screen.getByRole('button', { name: /بازگشت به آخرین نقطهٔ امن/ })).not.toBeNull();
    expect(screen.getByRole('button', { name: /بازگشت به آغاز/ })).not.toBeNull();
  });

  it('rewinds to the checkpoint scene when the player recovers', () => {
    render(<App storyKey="chapter1" storage={null} />);
    play([...TO_DOOR, 'pick-the-bolt', 'press-the-pick']);
    clickChoice('failure-door-continue');
    clickChoice('failure-door-result');

    fireEvent.click(screen.getByRole('button', { name: /بازگشت به آخرین نقطهٔ امن/ }));

    // Back at the pre-door scene, with its narration starting over.
    expect(backdropSceneId()).toBe('ch1-corridor-mid');
    expect(currentPhase()).toBe('scene_narration');
    expect(choicesVisible()).toBe(false);
    // And nothing of the failure is left behind.
    expect(screen.queryByRole('heading', { name: /سلول ۱۴/ })).toBeNull();
  });

  it('does not present a fatal failure as a rescue', () => {
    render(<App storyKey="chapter1" storage={null} />);
    play([...TO_DOOR, 'force-the-door', 'forced-dash-into-gunfire']);

    expectSceneNotResult('ch1-fail-fatal-warning');
    clickChoice('failure-fatal-continue');
    expectSceneNotResult('ch1-fail-fatal-outcome');

    clickChoice('failure-fatal-result');

    // The result names the death and offers a rewind — never "you got away".
    expect(screen.getByRole('heading', { name: /کشته شدن در راهرو/ })).not.toBeNull();
    expect(screen.getByText(/مرگ کیان پایان یافت/)).not.toBeNull();
    expect(screen.getByRole('button', { name: /بازپخش تلاش از نقطهٔ امن/ })).not.toBeNull();
    // The safe-corner copy of the recoverable screen must not appear here.
    expect(screen.queryByRole('button', { name: /^بازگشت به آخرین نقطهٔ امن$/ })).toBeNull();
    expect(screen.queryByText(/بازگشت به سلول ۱۴/)).toBeNull();
  });

  it('rewinds the fatal attempt too, so the run is never stuck', () => {
    render(<App storyKey="chapter1" storage={null} />);
    play([...TO_DOOR, 'force-the-door', 'forced-dash-into-gunfire']);
    clickChoice('failure-fatal-continue');
    clickChoice('failure-fatal-result');

    fireEvent.click(screen.getByRole('button', { name: /بازپخش تلاش از نقطهٔ امن/ }));

    expect(backdropSceneId()).toBe('ch1-corridor-mid');
    expect(currentPhase()).toBe('scene_narration');
    // The run is playable again: the scene's choices come back.
    openChoices();
    expect(choicesVisible()).toBe(true);
  });

  it('keeps the office loss in the same three-beat shape', () => {
    render(<App storyKey="chapter1" storage={null} />);
    play([
      'test-the-bar',
      'leave-it',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'search-the-cell-first',
      'pull-the-note',
      'fold-it-into-your-sleeve',
      'take-the-office-way',
      'slip-past-the-door',
      'read-the-transfer-ledger',
    ]);

    // Picking up the page is a visible mistake, not a cut to a result.
    clickChoice('take-the-loose-page');
    expectSceneNotResult('ch1-fail-office-exposed');

    clickChoice('failure-office-continue');
    expectSceneNotResult('ch1-fail-office-captured');

    clickChoice('failure-office-result');
    expect(screen.getByRole('heading', { name: /دستگیری در دفتر/ })).not.toBeNull();
    expect(CHAPTER1_FAILURE.officeAlarm).toBe('f-ch1-office-alarm');
  });
});
