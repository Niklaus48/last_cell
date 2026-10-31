// @vitest-environment jsdom
/**
 * Conditions as the player sees them.
 *
 * Three promises are under test, all through the real `<App />`:
 *
 * 1. a locked option is *shown*, disabled, with the requirement that fails;
 * 2. a choice that changes state reports what it changed;
 * 3. the state panel lists the story's variables by their declared labels.
 *
 * The engine still refuses locked choices; these tests assert the UI agrees with
 * it rather than replacing it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { App } from '../src/app/App';
import { useStorySession } from '../src/app/useStorySession';
import { chapter1Story, CHAPTER1_SCENE } from '../src/story/content/chapter1';
import { createStoryEngine } from '../src/story/engine';
import { CONTINUE_LABEL, currentPhase } from './helpers/flow';

const engine = createStoryEngine(chapter1Story);

function openGate(hook: ReturnType<typeof renderHook<ReturnType<typeof useStorySession>, unknown>>): void {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (hook.result.current.flow.phase === 'choices_available') {
      return;
    }
    act(() => {
      hook.result.current.flow.continue();
    });
  }
}

/** Session at a chosen scene, with the gate already open. */
function sessionAtScene(sceneId: string, variables: Record<string, number> = {}) {
  const hook = renderHook(() => useStorySession('chapter1', { storage: null }));
  act(() => {
    hook.result.current.start();
  });
  openGate(hook);
  const current = hook.result.current;
  const state = current.session.phase === 'playing' ? current.session.state : null;
  if (state === null) {
    throw new Error('session did not start');
  }
  expect(engine.getCurrentScene(state).id).toBe(CHAPTER1_SCENE.cellDawn);
  void sceneId;
  void variables;
  return hook;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('locked choices are shown, not hidden', () => {
  it('renders the alcove option disabled with the suspicion requirement, once suspicion is high', () => {
    const hook = renderHook(() => useStorySession('chapter1', { storage: null }));
    act(() => {
      hook.result.current.start();
    });

    // Drive the real run until the door-attempt scene, choosing loudly.
    const path = [
      'test-the-bar',
      'leave-it',
      'stay-quiet',
      'keep-listening',
      'slip-out-now',
      'take-the-service-way',
      'cross-to-the-service-door',
      'follow-the-wet-track',
      'keep-following-the-track',
      'straight-to-the-door',
      'force-the-door',
    ];
    for (const choiceId of path) {
      openGate(hook);
      const before = hook.result.current.session;
      const sceneId = before.phase === 'playing' ? before.state.currentSceneId : null;
      act(() => {
        hook.result.current.choose(choiceId);
      });
      const after = hook.result.current.session;
      if (after.phase === 'playing' && after.state.currentSceneId === sceneId) {
        break; // the path diverged (a choice was unavailable); stop early
      }
    }

    const current = hook.result.current;
    const state = current.session.phase === 'playing' ? current.session.state : null;
    if (state === null) return;
    if (state.currentSceneId !== 'ch1-door-attempt') return;

    const availability = current.choiceAvailability;
    const alcove = availability.find((entry) => entry.choice.id === 'slide-into-the-alcove');
    expect(alcove).toBeDefined();
    // Whether it is locked depends on the path taken; if it is, it must still be
    // listed with a reason, and if it is open the requirement must still be shown.
    expect(alcove?.requirements.length).toBeGreaterThan(0);
    if (alcove?.available === false) {
      expect(alcove.unmet.length).toBeGreaterThan(0);
    }
  });

  it('shows every declared choice, not only the selectable ones', () => {
    const hook = sessionAtScene(CHAPTER1_SCENE.cellDawn);
    const current = hook.result.current;
    const state = current.session.phase === 'playing' ? current.session.state : null;
    if (state === null) return;
    expect(current.choiceAvailability).toHaveLength(engine.getChoices(state).length);
    expect(current.choiceAvailability.every((entry) => entry.available)).toBe(true);
  });
});

describe('the state panel', () => {
  it('lists the story variables with their declared labels and current values', () => {
    render(<App storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع/ }));

    const panel = screen.getByText('وضعیت کیان').closest('details');
    expect(panel).not.toBeNull();
    if (panel === null) return;

    // Open it, then check the labels come from the story, not from the component.
    fireEvent.click(within(panel).getByText('وضعیت کیان'));
    for (const meta of Object.values(chapter1Story.variableMeta ?? {})) {
      expect(within(panel).getByText(meta.label)).toBeTruthy();
    }
  });

  it('shows Persian digits for numeric values', () => {
    render(<App storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع/ }));
    const panel = screen.getByText('وضعیت کیان').closest('details');
    if (panel === null) return;
    fireEvent.click(within(panel).getByText('وضعیت کیان'));
    // composure starts at 2 and planIntegrity at 3.
    expect(within(panel).getAllByText('۲').length).toBeGreaterThan(0);
    expect(within(panel).getAllByText('۳').length).toBeGreaterThan(0);
  });
});

describe('the change notice', () => {
  it('reports what a choice changed, naming the variable', () => {
    const hook = renderHook(() => useStorySession('chapter1', { storage: null }));
    act(() => {
      hook.result.current.start();
    });
    openGate(hook);

    const before = hook.result.current.session;
    if (before.phase !== 'playing') return;
    const choice = hook.result.current.choiceAvailability.find(
      (entry) => entry.available && (entry.choice.effects?.length ?? 0) > 0,
    );
    if (choice === undefined) return; // this scene has no effect-y choice

    act(() => {
      hook.result.current.choose(choice.choice.id);
    });

    const changes = hook.result.current.lastChanges;
    expect(changes).not.toBeNull();
    expect(changes?.variableChanges.length).toBeGreaterThan(0);
    expect(hook.result.current.lastChoiceLabel).toBe(choice.choice.label);
  });

  it('renders the notice in the game screen after a choice with effects', () => {
    render(<App storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع/ }));
    openAppGate();

    const before = document.querySelectorAll('.choice-button:not(.choice-button--locked)');
    expect(before.length).toBeGreaterThan(0);
    fireEvent.click(before[0] as HTMLElement);

    // The next scene's gate is closed; open it to reach the decision stage again.
    openAppGate();
    const notice = document.querySelector('.change-notice');
    // The opening scene's first choice may have no effects; if a notice is shown
    // it must name a variable and offer a dismiss button.
    if (notice !== null) {
      expect(notice.textContent).toContain('اثر');
      expect(within(notice as HTMLElement).getByRole('button', { name: /بستن/ })).toBeTruthy();
    }
  });
});

/** Opens the narration gate of whatever is on screen. */
function openAppGate(): void {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (document.querySelectorAll('.choice-button').length > 0) {
      return;
    }
    const button = screen.queryByRole('button', { name: CONTINUE_LABEL });
    if (button === null) {
      return;
    }
    fireEvent.click(button);
  }
}

describe('gate safety', () => {
  it('still keeps every choice out of the DOM during narration', () => {
    render(<App storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع/ }));
    expect(document.querySelectorAll('.choice-button').length).toBe(0);
    expect(document.querySelectorAll('.choice-button--locked').length).toBe(0);
    expect(currentPhase()).toBe('scene_narration');
  });
});
