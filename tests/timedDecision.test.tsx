// @vitest-environment jsdom
/**
 * Timed decisions — hook and session behaviour.
 *
 * Time is fully controlled: fake timers drive the interval, and an injected
 * clock drives the deadline arithmetic. Nothing here waits in real time, and the
 * "background tab" case is modelled by moving the clock without letting the
 * interval run — exactly what a throttled tab does.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { App } from '../src/app/App';
import { useStorySession } from '../src/app/useStorySession';
import { useTimedDecision } from '../src/app/useTimedDecision';
import { createStoryEngine } from '../src/story/engine';
import type { StoryEngine, StoryState } from '../src/story/engine';
import { chapter1Story, CHAPTER1_SCENE } from '../src/story/content/chapter1';
import { openChoices } from './helpers/flow';

const engine = createStoryEngine(chapter1Story);

/** Plays real choices forward from a fresh run and returns the state reached. */
function stateAt(choiceIds: readonly string[]): StoryState {
  let state = engine.start();
  for (const choiceId of choiceIds) {
    const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId });
    if (!result.ok) {
      throw new Error(`${state.currentSceneId} → ${choiceId} rejected: ${result.error.code}`);
    }
    state = result.state;
  }
  return state;
}

/** Choices that lead to the 12-second stranger decision. */
const TO_STRANGER = ['test-the-bar', 'leave-it'] as const;
/** Choices that lead to the 8-second guarded-door decision. */
const TO_DOOR = [
  'test-the-bar',
  'leave-it',
  'stay-silent',
  'wait-for-the-steps-to-fade',
  'slip-out-now',
  'take-the-service-way',
  'cross-to-the-service-door',
  'head-straight-to-the-door',
  'straight-to-the-door',
  'pick-the-bolt',
] as const;

function sessionAt(choiceIds: readonly string[]) {
  const clock = { value: 0 };
  const hook = renderHook(() =>
    useStorySession('chapter1', { storage: null, now: () => clock.value }),
  );

  /**
   * Moves the scene through its reading stages (narration → announcement) the
   * way the Continue action does, so a choice can be picked legally.
   */
  const openGate = (): void => {
    // One `act` per stage: each call must see the freshly rendered phase, and
    // calling continue twice inside one flush is deliberately a no-op.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (hook.result.current.flow.phase === 'choices_available') {
        return;
      }
      act(() => {
        hook.result.current.flow.continue();
      });
    }
  };

  const step = (choiceId: string): void => {
    openGate();
    act(() => {
      hook.result.current.choose(choiceId);
    });
  };

  act(() => {
    hook.result.current.start();
  });
  for (const choiceId of choiceIds) {
    step(choiceId);
  }
  // The last transition opens a new scene: finish its reading stages so the
  // fixture ends at the decision stage, where a countdown is allowed to exist.
  openGate();

  /** Advances the fake interval *and* the clock together (normal foreground). */
  const advance = (ms: number): void => {
    act(() => {
      clock.value += ms;
      vi.advanceTimersByTime(ms);
    });
  };

  /** Moves the clock without letting the interval run (throttled background tab). */
  const jumpClock = (ms: number): void => {
    act(() => {
      clock.value += ms;
    });
  };

  const state = (): StoryState => {
    const current = hook.result.current.session;
    if (current.phase !== 'playing') {
      throw new Error('session is not playing');
    }
    return current.state;
  };

  return { ...hook, clock, step, openGate, advance, jumpClock, state };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('countdown lifecycle', () => {
  it('runs only for scenes that declare a timed decision', () => {
    const session = sessionAt([]);
    expect(session.result.current.timedDecision).toBeNull();

    session.step('test-the-bar');
    expect(session.result.current.timedDecision).toBeNull();
    session.step('leave-it');

    // The new scene starts in its narration stage: the 12-second decision does
    // not exist yet, so no clock can run.
    expect(session.state().currentSceneId).toBe(CHAPTER1_SCENE.strangerArrives);
    expect(session.result.current.flow.phase).toBe('scene_narration');
    expect(session.result.current.timedDecision).toBeNull();

    session.openGate();
    expect(session.result.current.timedDecision).not.toBeNull();
    expect(session.result.current.timedDecision?.durationMs).toBe(12000);
    expect(session.result.current.timedDecision?.remainingSeconds).toBe(12);
  });

  it('counts down from the declared duration and never resets on a tick', () => {
    const session = sessionAt([...TO_STRANGER]);

    session.advance(3000);
    expect(session.result.current.timedDecision?.remainingSeconds).toBe(9);

    session.advance(4000);
    expect(session.result.current.timedDecision?.remainingSeconds).toBe(5);
    // Duration is fixed: a tick updates the remainder, it does not restart it.
    expect(session.result.current.timedDecision?.durationMs).toBe(12000);
  });

  it('does not start on the title screen', () => {
    const session = sessionAt([]);
    act(() => {
      session.result.current.restart();
    });
    session.advance(60000);
    expect(session.result.current.session.phase).toBe('title');
    expect(session.result.current.timedDecision).toBeNull();
  });

  it('stops being exposed once the decision is resolved', () => {
    const session = sessionAt([...TO_STRANGER]);
    session.advance(12000);
    expect(session.state().currentSceneId).toBe(CHAPTER1_SCENE.silence);
    expect(session.result.current.timedDecision).toBeNull();
  });
});

describe('timeout semantics', () => {
  it('resolves the 12s stranger decision to silence', () => {
    const session = sessionAt([...TO_STRANGER]);
    session.advance(11999);
    expect(session.state().currentSceneId).toBe(CHAPTER1_SCENE.strangerArrives);

    session.advance(1);
    expect(session.state().currentSceneId).toBe(CHAPTER1_SCENE.silence);
  });

  it('resolves the 8s guarded-door decision to freeze-and-observe', () => {
    const session = sessionAt([...TO_DOOR]);
    expect(session.state().currentSceneId).toBe(CHAPTER1_SCENE.doorAttempt);
    expect(session.result.current.timedDecision?.durationMs).toBe(8000);

    session.advance(8000);
    // The default is the cautious freeze, which is a *transition* (never a
    // failure); in this chapter it leads into the guard's search scene.
    expect(session.state().currentSceneId).toBe(CHAPTER1_SCENE.guardSearch);
    expect(engine.getTakenChoiceIds(session.state())).toContain('freeze-and-observe');
  });

  it('applies the default through the engine, not around it', () => {
    const session = sessionAt([...TO_STRANGER]);
    const before = session.state().variables['composure'];
    session.advance(12000);

    const after = session.state();
    // History records the choice exactly as a manual pick would…
    expect(after.history.at(-2)?.choiceId).toBe('stay-silent');
    expect(engine.getTakenChoiceIds(after)).toEqual(['test-the-bar', 'leave-it', 'stay-silent']);
    // …and the choice's own effects ran (stay-silent raises composure by 1).
    expect(after.variables['composure']).toBe(Number(before) + 1);
  });

  it('grants no clue to a player who stays silent', () => {
    const session = sessionAt([...TO_STRANGER]);
    session.advance(12000);

    const state = session.state();
    expect(state.currentSceneId).toBe(CHAPTER1_SCENE.silence);
    expect(state.discoveredClueIds).toEqual([]);
    expect(engine.getDiscoveredClues(state)).toEqual([]);
    expect(state.variables['strangerContact']).toBe(0);
    expect(state.variables['strangerKnowledge']).toBe(0);
  });

  it('fires only once even if the clock jumps far past the deadline', () => {
    const session = sessionAt([...TO_STRANGER]);
    session.advance(12000);
    const resolved = session.state();

    session.advance(60000);
    expect(session.state()).toBe(resolved);
    expect(engine.getTakenChoiceIds(session.state())).toHaveLength(3);
  });
});

describe('manual choice versus timeout', () => {
  it('a manual choice before expiry prevents the default', () => {
    const session = sessionAt([...TO_STRANGER]);
    session.advance(4000);
    session.step('ask-who-he-is');

    expect(session.state().currentSceneId).toBe(CHAPTER1_SCENE.strangerWho);

    session.advance(60000);
    // The pending timeout did not drag the run back into the silence branch.
    expect(session.state().currentSceneId).toBe(CHAPTER1_SCENE.strangerWho);
    expect(engine.getTakenChoiceIds(session.state())).toEqual([
      'test-the-bar',
      'leave-it',
      'ask-who-he-is',
    ]);
  });

  it('a timeout racing a manual choice resolves exactly once', () => {
    const session = sessionAt([...TO_STRANGER]);

    // Same tick: the player clicks at the exact moment the deadline passes.
    act(() => {
      session.result.current.choose('threaten-him');
      session.clock.value += 12000;
      vi.advanceTimersByTime(12000);
    });

    const state = session.state();
    expect(state.currentSceneId).toBe(CHAPTER1_SCENE.strangerThreat);
    expect(engine.getTakenChoiceIds(state)).toEqual([
      'test-the-bar',
      'leave-it',
      'threaten-him',
    ]);
    // …and the timeout did not add a fourth step afterwards.
    expect(engine.getTakenChoiceIds(state)).toHaveLength(3);
  });

  it('ignores a second application of the same state (double click)', () => {
    const session = sessionAt([]);
    act(() => {
      session.result.current.choose('test-the-bar');
      session.result.current.choose('test-the-bar');
    });

    const state = session.state();
    expect(state.currentSceneId).toBe(CHAPTER1_SCENE.cellBar);
    expect(engine.getTakenChoiceIds(state)).toEqual(['test-the-bar']);
  });

  it('a stale timer cannot resolve a decision after a scene transition', () => {
    const session = sessionAt([...TO_STRANGER]);
    session.advance(11000);
    session.step('ask-who-he-is');

    // The 12s decision's deadline passes while standing in a different scene.
    session.advance(30000);
    expect(session.state().currentSceneId).toBe(CHAPTER1_SCENE.strangerWho);
    expect(session.result.current.timedDecision).toBeNull();
  });

  it('a restored run gets a fresh, complete countdown', () => {
    const session = sessionAt([...TO_STRANGER]);
    session.advance(9000);
    expect(session.result.current.timedDecision?.remainingSeconds).toBe(3);

    // Reloading the same run is a new decision identity: full duration again.
    act(() => {
      session.result.current.restart();
    });
    act(() => {
      session.result.current.start();
    });
    session.step('test-the-bar');
    session.step('leave-it');
    session.openGate();
    expect(session.result.current.timedDecision?.remainingSeconds).toBe(12);
  });
});

describe('background tabs and cleanup', () => {
  it('an expired decision in a throttled tab resolves once, on return', () => {
    const session = sessionAt([...TO_STRANGER]);
    session.advance(2000);
    expect(session.result.current.timedDecision?.remainingSeconds).toBe(10);

    // Background: the clock keeps moving but the interval never runs.
    session.jumpClock(30000);
    expect(session.state().currentSceneId).toBe(CHAPTER1_SCENE.strangerArrives);

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(session.state().currentSceneId).toBe(CHAPTER1_SCENE.silence);

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(engine.getTakenChoiceIds(session.state())).toHaveLength(3);
  });

  it('returning from a short background continues the same countdown', () => {
    const session = sessionAt([...TO_STRANGER]);
    session.jumpClock(4000);

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Remaining time reflects real elapsed time, not the number of ticks.
    expect(session.result.current.timedDecision?.remainingSeconds).toBe(8);
    expect(session.state().currentSceneId).toBe(CHAPTER1_SCENE.strangerArrives);
  });

  it('cancels the pending callback on unmount', () => {
    const onExpire = vi.fn();
    const state = stateAt(TO_STRANGER);
    const clock = { value: 0 };

    const view = renderHook(() =>
      useTimedDecision({
        engine,
        state,
        active: true,
        onExpire,
        now: () => clock.value,
      }),
    );

    act(() => {
      clock.value += 5000;
      vi.advanceTimersByTime(5000);
    });
    expect(onExpire).not.toHaveBeenCalled();

    view.unmount();
    act(() => {
      clock.value += 60000;
      vi.advanceTimersByTime(60000);
    });
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('does not run while inactive (ending or failure screen)', () => {
    const onExpire = vi.fn();
    const clock = { value: 0 };

    renderHook(() =>
      useTimedDecision({
        engine,
        state: stateAt(TO_STRANGER),
        active: false,
        onExpire,
        now: () => clock.value,
      }),
    );

    act(() => {
      clock.value += 60000;
      vi.advanceTimersByTime(60000);
    });
    expect(onExpire).not.toHaveBeenCalled();
  });

  it('reports the declared default choice id to the caller', () => {
    const onExpire = vi.fn();
    const clock = { value: 0 };

    renderHook(() =>
      useTimedDecision({
        engine,
        state: stateAt(TO_DOOR),
        active: true,
        onExpire,
        now: () => clock.value,
      }),
    );

    act(() => {
      clock.value += 8000;
      vi.advanceTimersByTime(8000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(onExpire).toHaveBeenCalledWith({
      sceneId: CHAPTER1_SCENE.doorAttempt,
      choiceId: 'freeze-and-observe',
    });
  });
});

describe('the running countdown does not disturb the scene', () => {
  it('keeps the narration and the scene in place across ticks', () => {
    render(<App storyKey="chapter1" storage={null} />);

    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));
    openChoices();
    fireEvent.click(screen.getByRole('button', { name: /میلهٔ دریچهٔ هوا را دوباره/ }));
    openChoices();
    fireEvent.click(screen.getByRole('button', { name: /دست نمی‌زنم؛ میله/ }));
    openChoices();

    const heading = screen.getByRole('heading', { name: /کسی که نام واقعی‌ات را می‌داند/ });
    const paragraph = screen.getByText(/صدای قدمی پشت در می‌ایستد/);
    const sceneStep = document.querySelector('.game-topbar__step');
    expect(sceneStep).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    // Same DOM nodes: no remount, no replay, no scene reset.
    expect(screen.getByRole('heading', { name: /کسی که نام واقعی‌ات را می‌داند/ })).toBe(heading);
    expect(screen.getByText(/صدای قدمی پشت در می‌ایستد/)).toBe(paragraph);
    expect(document.querySelector('.game-topbar__step')).toBe(sceneStep);
    expect(screen.getByText(/زمان تصمیم: ۸ ثانیه/)).not.toBeNull();
  });

  it('shows an understandable Persian countdown with a progress bar', () => {
    render(<App storyKey="chapter1" storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));
    openChoices();
    fireEvent.click(screen.getByRole('button', { name: /میلهٔ دریچهٔ هوا را دوباره/ }));
    openChoices();
    fireEvent.click(screen.getByRole('button', { name: /دست نمی‌زنم؛ میله/ }));
    openChoices();

    expect(screen.getByText(/زمان تصمیم: ۱۲ ثانیه/)).not.toBeNull();
    const bar = screen.getByRole('progressbar', { name: 'زمان باقی‌مانده برای تصمیم' });
    expect(bar.getAttribute('aria-valuenow')).toBe('100');

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByText(/زمان تصمیم: ۶ ثانیه/)).not.toBeNull();
    expect(
      screen.getByRole('progressbar', { name: 'زمان باقی‌مانده برای تصمیم' }).getAttribute(
        'aria-valuenow',
      ),
    ).toBe('50');
  });

  it('announces only the urgency change, not every tick', () => {
    render(<App storyKey="chapter1" storage={null} />);
    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));
    openChoices();
    fireEvent.click(screen.getByRole('button', { name: /میلهٔ دریچهٔ هوا را دوباره/ }));
    openChoices();
    fireEvent.click(screen.getByRole('button', { name: /دست نمی‌زنم؛ میله/ }));
    openChoices();

    expect(screen.queryByText('زمان تصمیم رو به پایان است.')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(9500);
    });
    expect(screen.getByText('زمان تصمیم رو به پایان است.')).not.toBeNull();
  });
});

describe('engine validation of timer data', () => {
  const withTimed = (
    timed: StoryEngine['story']['scenes'][number]['timedDecision'],
    choices = [
      { id: 'go', label: 'می‌روم.', outcome: { type: 'transition' as const, targetSceneId: 'b' } },
    ],
  ) => ({
    id: 'timed-test',
    title: 'آزمون',
    initialSceneId: 'a',
    initialVariables: {},
    scenes: [
      {
        id: 'a',
        title: 'الف',
        narration: ['متن.'],
        choices,
        ...(timed === undefined ? {} : { timedDecision: timed }),
      },
      { id: 'b', title: 'ب', narration: ['متن.'], choices: [
        { id: 'end', label: 'پایان.', outcome: { type: 'ending' as const, endingId: 'e' } },
      ] },
    ],
    endings: [{ id: 'e', title: 'پایان', summary: 'خلاصه', tone: 'ambiguous' as const }],
  });

  it('rejects a non-positive or non-finite duration', () => {
    for (const durationMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        createStoryEngine(withTimed({ durationMs, defaultChoiceId: 'go' }) as never),
      ).toThrow(/Timed decision duration must be a positive number/);
    }
  });

  it('rejects a default choice that does not exist in the scene', () => {
    expect(() =>
      createStoryEngine(withTimed({ durationMs: 5000, defaultChoiceId: 'missing' }) as never),
    ).toThrow(/does not exist in scene/);
  });

  it('rejects a default choice that could ever be unavailable', () => {
    const conditional = [
      {
        id: 'go',
        label: 'می‌روم.',
        outcome: { type: 'transition' as const, targetSceneId: 'b' },
        condition: { kind: 'compareVariable' as const, variable: 'x', operator: 'gte' as const, value: 1 },
      },
    ];
    expect(() =>
      createStoryEngine(withTimed({ durationMs: 5000, defaultChoiceId: 'go' }, conditional) as never),
    ).toThrow(/must always be selectable/);
  });
});
