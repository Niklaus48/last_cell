/**
 * Test helper for the narration gate.
 *
 * Every scene now starts in a reading stage, so UI tests that care about a
 * choice have to move through the gate first. `fireEvent` is used instead of
 * `userEvent` because it is synchronous and therefore works the same under fake
 * timers and real timer tests.
 */
import { fireEvent, screen } from '@testing-library/react';

/** Continue button label shared by both reading stages. */
export const CONTINUE_LABEL = 'ادامه';

/** True when the choice buttons are mounted (i.e. the decision stage is open). */
export function choicesVisible(): boolean {
  return document.querySelectorAll('.choice-button').length > 0;
}

/** Current stage, read from the DOM (the gate renders it as a data attribute). */
export function currentPhase(): string | null {
  return document.querySelector('.narration-gate')?.getAttribute('data-flow-phase') ?? null;
}

/**
 * Clicks Continue until the choices are mounted (or there is nothing to click).
 * Safe to call on scenes without choices: it stops as soon as the gate closes.
 */
export function openChoices(): void {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (choicesVisible()) {
      return;
    }
    const button = screen.queryByRole('button', { name: CONTINUE_LABEL });
    if (button === null) {
      return;
    }
    fireEvent.click(button);
  }
}

/** Advances exactly one reading stage (no more, no less). */
export function continueOnce(): void {
  const button = screen.queryByRole('button', { name: CONTINUE_LABEL });
  if (button === null) {
    throw new Error('no Continue button on screen');
  }
  fireEvent.click(button);
}
