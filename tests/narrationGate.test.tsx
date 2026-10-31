// @vitest-environment jsdom
/**
 * Narration-gated decisions, end to end through the real `<App />` and the real
 * `useStorySession` hook.
 *
 * Time is fully controlled: fake timers drive the reading pauses and the
 * countdown, and an injected monotonic clock drives every deadline. Nothing here
 * waits in real time. The default reading pauses come from `NARRATION_TIMING`
 * (6 s narration, 4 s announcement) so the tests assert against the shipped
 * configuration rather than a test-only one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { App } from '../src/app/App';
import { useStorySession } from '../src/app/useStorySession';
import { useNarrationFlow } from '../src/app/useNarrationFlow';
import { announcementStageDurationMs, narrationStageDurationMs } from '../src/app/narrationFlow';
import { createStoryEngine } from '../src/story/engine';
import { chapter1Story, CHAPTER1_SCENE } from '../src/story/content/chapter1';
import type { SaveStorage } from '../src/persistence';
import { CONTINUE_LABEL, choicesVisible, continueOnce, currentPhase, openChoices } from './helpers/flow';

const engine = createStoryEngine(chapter1Story);

/**
 * Reading pauses for the opening scene, derived from the canonical content and
 * the central timing model — never hard-coded in a test.
 */
const OPENING = engine.start();
const sceneNarrationMs = narrationStageDurationMs(engine.getCurrentScene(OPENING).narration.length);
const choiceAnnouncementMs = announcementStageDurationMs(
  engine.getAvailableChoices(OPENING).length,
);

/** Choices that lead to the 12-second stranger decision. */
const TO_STRANGER = ['test-the-bar', 'leave-it'] as const;
interface FakeStorage extends SaveStorage {
  readonly raw: () => string | null;
  readonly setRaw: (value: string | null) => void;
}

function fakeStorage(initial: string | null = null): FakeStorage {
  let value = initial;
  return {
    read: () => value,
    write: (next: string) => {
      value = next;
    },
    clear: () => {
      value = null;
    },
    raw: () => value,
    setRaw: (next: string | null) => {
      value = next;
    },
  };
}

/** Session hook with a manually driven clock. */
function sessionWith(storage: SaveStorage | null = null) {
  const clock = { value: 0 };
  const hook = renderHook(() =>
    useStorySession('chapter1', { storage, now: () => clock.value }),
  );

  const advance = (ms: number): void => {
    act(() => {
      clock.value += ms;
      vi.advanceTimersByTime(ms);
    });
  };
  const step = (choiceId: string): void => {
    openGate(hook);
    act(() => { hook.result.current.choose(choiceId); });
  };
  const playing = () => {
    const current = hook.result.current.session;
    if (current.phase !== 'playing') {
      throw new Error('session is not playing');
    }
    return current.state;
  };

  act(() => { hook.result.current.start(); });
  return { ...hook, clock, advance, step, playing };
}

/** One `act` per stage: a second `continue()` in the same flush is a no-op. */
function openGate(hook: { result: { current: ReturnType<typeof useStorySession> } }): void {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (hook.result.current.flow.phase === 'choices_available') {
      return;
    }
    act(() => { hook.result.current.flow.continue(); });
  }
}

const timedBanner = (): Element | null => document.querySelector('.timed-decision');

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('stage A — scene narration', () => {
  it('exposes no interactive choice when a scene appears', () => {
    render(<App storyKey="chapter1" storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));

    expect(currentPhase()).toBe('scene_narration');
    expect(choicesVisible()).toBe(false);
    // The narration itself is already readable.
    expect(screen.getByRole('heading', { name: /سلول ۱۴/ })).not.toBeNull();
    expect(screen.getByRole('button', { name: CONTINUE_LABEL })).not.toBeNull();
    // No countdown exists in this stage, and the choice labels are not buttons.
    expect(timedBanner()).toBeNull();
    expect(screen.queryAllByRole('button', { name: /میلهٔ دریچهٔ هوا را دوباره/ })).toHaveLength(0);
  });

  it('does not let keyboard input resolve a choice during narration', () => {
    render(<App storyKey="chapter1" storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));
    const stepBefore = document.querySelector('.game-topbar__step')?.textContent;

    // Enter/Space on the document, and a focus attempt on a non-existent choice.
    fireEvent.keyDown(document.body, { key: 'Enter' });
    fireEvent.keyUp(document.body, { key: 'Enter' });
    fireEvent.keyDown(document.body, { key: ' ' });

    expect(document.querySelector('.game-topbar__step')?.textContent).toBe(stepBefore);
    expect(currentPhase()).toBe('scene_narration');
  });

  it('advances exactly one stage per Continue', () => {
    render(<App storyKey="chapter1" storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));

    continueOnce();
    expect(currentPhase()).toBe('choice_announcement');
    expect(choicesVisible()).toBe(false);

    continueOnce();
    expect(currentPhase()).toBeNull();
    expect(choicesVisible()).toBe(true);
  });

  it('progresses on its own after the configured reading pause', () => {
    render(<App storyKey="chapter1" storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));

    act(() => { vi.advanceTimersByTime(sceneNarrationMs - 1); });
    expect(currentPhase()).toBe('scene_narration');

    act(() => { vi.advanceTimersByTime(1); });
    expect(currentPhase()).toBe('choice_announcement');

    act(() => { vi.advanceTimersByTime(choiceAnnouncementMs); });
    expect(choicesVisible()).toBe(true);
  });

  it('ignores an auto-advance that fires just after a manual Continue', () => {
    render(<App storyKey="chapter1" storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));

    // Click one tick before the scheduled auto-advance.
    act(() => { vi.advanceTimersByTime(sceneNarrationMs - 100); });
    continueOnce();
    expect(currentPhase()).toBe('choice_announcement');

    // The old callback would have fired here; it must not skip the announcement.
    act(() => { vi.advanceTimersByTime(200); });
    expect(currentPhase()).toBe('choice_announcement');
    expect(choicesVisible()).toBe(false);

    // The announcement still gets its own full pause, counted from the click
    // (200 ms have already elapsed above).
    act(() => { vi.advanceTimersByTime(choiceAnnouncementMs - 200 - 100); });
    expect(choicesVisible()).toBe(false);
    act(() => { vi.advanceTimersByTime(100); });
    expect(choicesVisible()).toBe(true);
  });

  it('cancels the pending auto-advance on unmount', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = render(<App storyKey="chapter1" storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));

    view.unmount();
    act(() => { vi.advanceTimersByTime(sceneNarrationMs * 5); });

    expect(errors).not.toHaveBeenCalled();
  });

  it('cancels pending progression on restart', () => {
    const session = sessionWith();
    session.advance(sceneNarrationMs - 500);
    expect(session.result.current.flow.phase).toBe('scene_narration');

    act(() => { session.result.current.restart(); });
    expect(session.result.current.session.phase).toBe('title');

    // Nothing may bubble out of the abandoned scene.
    session.advance(sceneNarrationMs * 5);
    expect(session.result.current.session.phase).toBe('title');
    expect(session.result.current.flow.phase).toBe('scene_narration');
  });
});

describe('stage B — narrator announces the choices', () => {
  it('shows the announcement as text before any choice is clickable', () => {
    render(<App storyKey="chapter1" storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));
    continueOnce();

    expect(currentPhase()).toBe('choice_announcement');
    const announcement = screen.getByTestId('choice-announcement');
    expect(announcement).not.toBeNull();
    expect(announcement.textContent).toContain('راوی گزینه‌های پیش رو را اعلام می‌کند');

    // The labels are visible as text, but they are not buttons yet.
    expect(announcement.textContent).toContain('میلهٔ دریچهٔ هوا را دوباره امتحان می‌کنم');
    expect(choicesVisible()).toBe(false);
    expect(screen.queryAllByRole('button', { name: /میلهٔ دریچهٔ هوا را دوباره/ })).toHaveLength(0);
    expect(timedBanner()).toBeNull();
  });

  it('announces only the choices the engine reports as available', () => {
    // On the quiet route («با نقشه پیش می‌روم» is the only option at the final
    // approach) two conditional choices stay hidden. The engine tells us exactly
    // which labels may be announced for that same state.
    const QUIET_ROUTE = [
      'listen-to-the-corridor',
      'go-back-to-the-bed',
      'stay-silent',
      'wait-for-the-steps-to-fade',
      'slip-out-now',
      'take-the-service-way',
      'cross-to-the-service-door',
      'head-straight-to-the-door',
      'straight-to-the-door',
      'pick-the-bolt',
      'freeze-and-observe',
      'search-steady',
      'take-the-hatch',
      'keep-moving',
    ] as const;

    let state = engine.start();
    for (const choiceId of QUIET_ROUTE) {
      const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId });
      if (!result.ok) {
        throw new Error(`${state.currentSceneId} → ${choiceId}: ${result.error.code}`);
      }
      state = result.state;
    }
    const expected = engine.getAvailableChoices(state).map((choice) => choice.label);
    const hidden = engine
      .getCurrentScene(state)
      .choices.filter((choice) => !expected.includes(choice.label))
      .map((choice) => choice.label);
    expect(hidden).toHaveLength(2);

    render(<App storyKey="chapter1" storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));
    for (const choiceId of QUIET_ROUTE) {
      openChoices();
      // Some options carry a visible condition line, so the accessible name is
      // longer than the label: match on the label being part of the button.
      const label = labelOf(choiceId);
      const button = screen
        .getAllByRole('button')
        .find((candidate) => (candidate.textContent ?? '').includes(label));
      if (button === undefined) {
        throw new Error(`no button for ${choiceId} (${label})`);
      }
      fireEvent.click(button);
    }

    // Arrive at the scene and stop at the announcement stage.
    expect(currentSceneId()).toBe(CHAPTER1_SCENE.finalApproach);
    continueOnce();
    expect(currentPhase()).toBe('choice_announcement');

    const announcementText = document.querySelector('.choice-announcement')?.textContent ?? '';
    for (const label of expected) {
      expect(announcementText).toContain(label);
    }
    for (const label of hidden) {
      expect(announcementText).not.toContain(label);
    }

    // …and the hidden choices never become clickable in this state either.
    continueOnce();
    for (const label of expected) {
      expect(screen.getAllByRole('button', { name: label })).toHaveLength(1);
    }
    for (const label of hidden) {
      expect(screen.queryAllByRole('button', { name: label })).toHaveLength(0);
    }
  });

  it('cannot be completed twice by a manual Continue and the pause timer', () => {
    render(<App storyKey="chapter1" storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));
    continueOnce();
    expect(currentPhase()).toBe('choice_announcement');

    act(() => { vi.advanceTimersByTime(choiceAnnouncementMs - 50); });
    continueOnce();
    expect(choicesVisible()).toBe(true);

    // The late announcement callback must not advance anything else.
    act(() => { vi.advanceTimersByTime(500); });
    expect(choicesVisible()).toBe(true);
    expect(currentSceneId()).toBe(CHAPTER1_SCENE.cellDawn);
  });

  it('does not stall a scene with nothing to announce', () => {
    // No choices at all (all conditionally unavailable): the flow skips the
    // announcement and settles on the decision stage so the engine flow can go on.
    const state = engine.start();
    const hook = renderHook(() =>
      useNarrationFlow({
        state,
        active: true,
        epoch: 0,
        choices: [],
        narrationParagraphs: engine.getCurrentScene(state).narration.length,
      }),
    );

    expect(hook.result.current.phase).toBe('scene_narration');
    act(() => { hook.result.current.continue(); });
    expect(hook.result.current.phase).toBe('choices_available');
    expect(hook.result.current.canContinue).toBe(false);
    expect(hook.result.current.announcement).toBeNull();

    // Continuing again changes nothing.
    act(() => { hook.result.current.continue(); });
    expect(hook.result.current.phase).toBe('choices_available');
  });
});

describe('stage C — timed decisions start with the choices', () => {
  /** Walks to the stranger decision and returns the session. */
  function atStrangerSession() {
    const session = sessionWith();
    for (const choiceId of TO_STRANGER) {
      session.step(choiceId);
    }
    return session;
  }

  it('runs no clock during narration or announcement', () => {
    const session = atStrangerSession();
    expect(session.playing().currentSceneId).toBe(CHAPTER1_SCENE.strangerArrives);

    expect(session.result.current.flow.phase).toBe('scene_narration');
    expect(session.result.current.timedDecision).toBeNull();

    session.advance(1);
    expect(session.result.current.timedDecision).toBeNull();

    act(() => { session.result.current.flow.continue(); });
    expect(session.result.current.flow.phase).toBe('choice_announcement');
    expect(session.result.current.timedDecision).toBeNull();

    // The announcement pause is running, and still no countdown exists.
    session.advance(choiceAnnouncementMs - 1);
    expect(session.result.current.flow.phase).toBe('choice_announcement');
    expect(session.result.current.timedDecision).toBeNull();

    // Completing the announcement is what creates the decision clock.
    session.advance(1);
    expect(session.result.current.flow.phase).toBe('choices_available');
    expect(session.result.current.timedDecision?.remainingSeconds).toBe(12);
  });

  it('gives the full declared duration only once the choices are visible', () => {
    render(<App storyKey="chapter1" storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));
    for (const choiceId of TO_STRANGER) {
      openChoices();
      fireEvent.click(screen.getByRole('button', { name: labelOf(choiceId) }));
    }

    // Reading the scene and hearing the announcement takes real time…
    expect(currentSceneId()).toBe(CHAPTER1_SCENE.strangerArrives);
    expect(timedBanner()).toBeNull();
    act(() => { vi.advanceTimersByTime(sceneNarrationMs); });
    expect(timedBanner()).toBeNull();
    expect(currentPhase()).toBe('choice_announcement');
    act(() => { vi.advanceTimersByTime(choiceAnnouncementMs); });

    // …and only then does the 12-second decision begin, from the full duration.
    expect(choicesVisible()).toBe(true);
    expect(screen.getByText(/زمان تصمیم: ۱۲ ثانیه/)).not.toBeNull();

    act(() => { vi.advanceTimersByTime(11000); });
    expect(screen.getByText(/زمان تصمیم: ۱ ثانیه/)).not.toBeNull();
    expect(currentSceneId()).toBe(CHAPTER1_SCENE.strangerArrives);
  });

  it('resolves the default exactly once when the clock expires', () => {
    const session = atStrangerSession();
    openGate(session);
    expect(session.result.current.timedDecision?.remainingSeconds).toBe(12);

    session.advance(12000);
    expect(session.playing().currentSceneId).toBe(CHAPTER1_SCENE.silence);
    expect(engine.getTakenChoiceIds(session.playing()).at(-1)).toBe('stay-silent');

    session.advance(120000);
    expect(session.playing().currentSceneId).toBe(CHAPTER1_SCENE.silence);
    expect(engine.getTakenChoiceIds(session.playing())).toHaveLength(3);
  });

  it('lets a manual choice cancel the countdown', () => {
    const session = atStrangerSession();
    openGate(session);

    session.advance(5000);
    session.step('ask-who-he-is');
    expect(session.playing().currentSceneId).toBe(CHAPTER1_SCENE.strangerWho);
    expect(session.result.current.timedDecision).toBeNull();

    // The abandoned deadline passes: nothing may fire.
    session.advance(120000);
    expect(session.playing().currentSceneId).toBe(CHAPTER1_SCENE.strangerWho);
    expect(session.result.current.lastError).toBeNull();
  });

  it('starts no timer for an untimed scene', () => {
    const session = sessionWith();
    openGate(session);
    expect(session.result.current.timedDecision).toBeNull();

    session.advance(120000);
    expect(session.playing().currentSceneId).toBe(CHAPTER1_SCENE.cellDawn);
    expect(session.result.current.flow.phase).toBe('choices_available');
  });

  it('refuses a choice while the gate is still closed', () => {
    const session = atStrangerSession();
    expect(session.result.current.flow.phase).toBe('scene_narration');

    // A programmatic/stale caller cannot bypass the reading stages.
    act(() => { session.result.current.choose('stay-silent'); });
    expect(session.playing().currentSceneId).toBe(CHAPTER1_SCENE.strangerArrives);
    expect(session.result.current.lastError).toBeNull();

    openGate(session);
    act(() => { session.result.current.choose('stay-silent'); });
    expect(session.playing().currentSceneId).toBe(CHAPTER1_SCENE.silence);
  });
});

describe('save and load honour the flow', () => {
  it('does not expose choices when a save is made before the narration ends', () => {
    const storage = fakeStorage();
    const session = sessionWith(storage);

    // Save while the first scene is still being narrated.
    expect(session.result.current.flow.phase).toBe('scene_narration');
    act(() => { session.result.current.save(); });
    expect(storage.raw()).not.toBeNull();

    act(() => { session.result.current.load(); });
    expect(session.result.current.flow.phase).toBe('scene_narration');
    expect(session.result.current.timedDecision).toBeNull();

    openGate(session);
    expect(session.result.current.flow.phase).toBe('choices_available');
  });

  it('restarts the full decision duration after a load, only when choices show', () => {
    const storage = fakeStorage();
    const session = sessionWith(storage);
    for (const choiceId of TO_STRANGER) {
      session.step(choiceId);
    }
    openGate(session);
    act(() => { session.result.current.save(); });
    session.advance(10000);
    expect(session.result.current.timedDecision?.remainingSeconds).toBe(2);

    act(() => { session.result.current.load(); });
    // Narration first: no countdown may exist yet.
    expect(session.result.current.timedDecision).toBeNull();
    expect(session.result.current.flow.phase).toBe('scene_narration');

    session.advance(sceneNarrationMs);
    expect(session.result.current.timedDecision).toBeNull();
    session.advance(choiceAnnouncementMs);

    // Now, and only now, a complete countdown starts.
    expect(session.result.current.timedDecision?.remainingSeconds).toBe(12);
  });

  it('leaves the current run intact when a load fails', () => {
    const storage = fakeStorage();
    const session = sessionWith(storage);
    session.step('test-the-bar');
    const before = session.playing();

    storage.setRaw('{ not json');
    expect(() => {
      act(() => {
        session.result.current.load();
      });
    }).not.toThrow();

    expect(session.result.current.saveFeedback?.kind).toBe('error');
    expect(session.playing()).toBe(before);
    expect(session.result.current.flow.phase).toBe('scene_narration');
  });

  it('keeps recovery flowing from the checkpoint through the narration gate', () => {
    render(<App storyKey="chapter1" storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));
    // Walk to a declared failure through the office route.
    for (const choiceId of [
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
      'take-the-loose-page',
    ]) {
      openChoices();
      fireEvent.click(screen.getByRole('button', { name: labelOf(choiceId) }));
    }

    expect(screen.getByRole('heading', { name: /دفتر بازرسی‌شده/ })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /بازگشت به آخرین نقطهٔ امن/ }));

    // Recovery replays to the checkpoint scene, which starts its narration again.
    expect(currentPhase()).toBe('scene_narration');
    expect(choicesVisible()).toBe(false);
    openChoices();
    expect(choicesVisible()).toBe(true);
  });
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

function currentSceneId(): string | null {
  return document.querySelector('.scene-backdrop')?.getAttribute('data-scene-id') ?? null;
}
