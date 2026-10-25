// @vitest-environment jsdom
/**
 * Save/load at session level: how the hook, the checkpoint rebuild and the UI
 * behave together. Storage is faked, so no test depends on a real browser store.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { App } from '../src/app/App';
import { useStorySession } from '../src/app/useStorySession';
import type { SaveStorage } from '../src/persistence';
import { SAVE_NONE_MESSAGE, SAVE_SUCCESS_MESSAGE } from '../src/ui/messages';
import { CHAPTER1_SCENE } from '../src/story/content/chapter1';

interface FakeStorage extends SaveStorage {
  readonly raw: () => string | null;
  readonly setRaw: (value: string | null) => void;
  readonly writes: () => number;
}

function fakeStorage(initial: string | null = null): FakeStorage {
  let value = initial;
  let writes = 0;
  return {
    read: () => value,
    write: (next: string) => {
      writes += 1;
      value = next;
    },
    clear: () => {
      value = null;
    },
    raw: () => value,
    setRaw: (next: string | null) => {
      value = next;
    },
    writes: () => writes,
  };
}

const TO_STRANGER = ['test-the-bar', 'leave-it'] as const;
const TO_FAILURE = [
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
  'press-the-pick',
] as const;
const TO_ENDING = [
  'test-the-bar',
  'leave-it',
  'stay-silent',
  'wait-for-the-steps-to-fade',
  'slip-out-now',
  'take-the-service-way',
  'cross-to-the-service-door',
  'head-straight-to-the-door',
  'straight-to-the-door',
  'force-the-door',
  'freeze-and-observe',
  'take-the-hatch',
  'keep-moving',
  'go-with-the-plan',
  'step-into-the-yard',
] as const;

function sessionWith(storage: SaveStorage | null) {
  const clock = { value: 0 };
  const hook = renderHook(() =>
    useStorySession('chapter1', { storage, now: () => clock.value }),
  );
  const step = (choiceId: string): void => {
    act(() => {
      hook.result.current.choose(choiceId);
    });
  };
  const advance = (ms: number): void => {
    act(() => {
      clock.value += ms;
      if (vi.isFakeTimers()) {
        vi.advanceTimersByTime(ms);
      }
    });
  };
  const playing = () => {
    const current = hook.result.current.session;
    if (current.phase !== 'playing') {
      throw new Error('session is not playing');
    }
    return current.state;
  };
  return { ...hook, clock, step, advance, playing };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('saving and restoring a session', () => {
  it('restores the exact run that was saved', () => {
    const storage = fakeStorage();
    const session = sessionWith(storage);

    act(() => session.result.current.start());
    session.step('test-the-bar');
    session.step('leave-it');
    session.step('stay-silent');
    session.step('wait-for-the-steps-to-fade');
    session.step('search-the-cell-first');
    session.step('pull-the-note');

    const before = session.playing();
    act(() => session.result.current.save());
    expect(session.result.current.saveFeedback).toEqual({
      kind: 'success',
      message: SAVE_SUCCESS_MESSAGE,
    });

    // A fresh session in the same browser: the title screen offers a resume.
    act(() => session.result.current.restart());
    expect(session.result.current.saveAvailability.status).toBe('valid');

    act(() => session.result.current.load());
    const after = session.playing();

    expect(after.currentSceneId).toBe(before.currentSceneId);
    expect(after.discoveredClueIds).toEqual(before.discoveredClueIds);
    expect(after.discoveredClueIds.length).toBeGreaterThan(0);
    expect(after.variables).toEqual(before.variables);
    expect(after.history).toEqual(before.history);
  });

  it('rebuilds checkpoints so a restored failure can still be recovered', () => {
    const storage = fakeStorage();
    const session = sessionWith(storage);

    act(() => session.result.current.start());
    for (const choiceId of TO_FAILURE) {
      session.step(choiceId);
    }
    expect(session.playing().progress.status).toBe('failed');

    act(() => session.result.current.save());
    act(() => session.result.current.restart());
    act(() => session.result.current.load());

    // The failure survived the round trip…
    expect(session.playing().progress.status).toBe('failed');
    // …and the checkpoint behind it was rebuilt by replaying the history.
    expect(session.result.current.checkpoints.length).toBeGreaterThan(0);

    act(() => session.result.current.recover());
    expect(session.playing().progress.status).toBe('playing');
    expect(session.playing().currentSceneId).toBe(CHAPTER1_SCENE.corridorMid);
  });

  it('restores an ending as an ending', () => {
    const storage = fakeStorage();
    const session = sessionWith(storage);

    act(() => session.result.current.start());
    for (const choiceId of TO_ENDING) {
      session.step(choiceId);
    }
    expect(session.playing().progress.status).toBe('ended');

    act(() => session.result.current.save());
    act(() => session.result.current.restart());
    act(() => session.result.current.load());

    const restored = session.playing();
    expect(restored.progress.status).toBe('ended');
    expect(session.result.current.timedDecision).toBeNull();

    // The restored ending accepts no further choices; the run does not move.
    const endingState = session.playing();
    session.step('step-into-the-yard');
    expect(session.playing()).toBe(endingState);
    expect(session.playing().progress.status).toBe('ended');
  });
});

describe('failures never damage a working session', () => {
  it('keeps the current run when the stored save is corrupt', () => {
    const storage = fakeStorage();
    const session = sessionWith(storage);

    act(() => session.result.current.start());
    session.step('test-the-bar');
    const before = session.playing();

    storage.setRaw('{ this is not a save');
    act(() => session.result.current.load());

    expect(session.result.current.saveFeedback?.kind).toBe('error');
    expect(session.playing()).toBe(before);
    expect(session.result.current.session.phase).toBe('playing');
  });

  it('reports a save that belongs to another story without changing the run', () => {
    const storage = fakeStorage();
    // A save written for the dev fixture key.
    const other = sessionWith(storage);
    act(() => other.result.current.start());
    other.step('test-the-bar');
    act(() => other.result.current.save());
    other.unmount();

    const session = sessionWith(storage);
    act(() => session.result.current.start());
    session.step('test-the-bar');
    const before = session.playing();

    // Same story here, so prove the wrong-story path with a hand-written key.
    const raw = storage.raw() ?? '{}';
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    storage.setRaw(JSON.stringify({ ...parsed, storyKey: 'demo' }));

    act(() => session.result.current.load());
    expect(session.result.current.saveFeedback?.kind).toBe('error');
    expect(session.playing()).toBe(before);
    expect(session.result.current.saveAvailability).toEqual({
      status: 'invalid',
      error: 'WRONG_STORY',
    });
  });

  it('does nothing destructive when storage is unavailable', () => {
    const session = sessionWith(null);
    act(() => session.result.current.start());
    session.step('test-the-bar');

    expect(session.result.current.storageAvailable).toBe(false);
    act(() => session.result.current.save());
    expect(session.result.current.saveFeedback?.kind).toBe('error');
    act(() => session.result.current.load());
    expect(session.result.current.saveFeedback?.kind).toBe('error');
    // The in-memory run is untouched and still playable.
    expect(session.playing().currentSceneId).toBe(CHAPTER1_SCENE.cellBar);
    session.step('leave-it');
    expect(session.playing().currentSceneId).toBe(CHAPTER1_SCENE.strangerArrives);
  });
});

describe('timers and loading', () => {
  it('gives a restored timed decision the full duration', () => {
    const storage = fakeStorage();
    const session = sessionWith(storage);

    act(() => session.result.current.start());
    for (const choiceId of TO_STRANGER) {
      session.step(choiceId);
    }
    act(() => session.result.current.save());

    session.advance(10000);
    expect(session.result.current.timedDecision?.remainingSeconds).toBe(2);

    act(() => session.result.current.load());
    expect(session.result.current.timedDecision?.remainingSeconds).toBe(12);
  });

  it('does not leave a stale timeout pointing at the old run', () => {
    const storage = fakeStorage();
    const session = sessionWith(storage);

    // Save a run standing in the first, untimed cell.
    act(() => session.result.current.start());
    act(() => session.result.current.save());

    // Walk into the timed decision and let its countdown run.
    session.step('test-the-bar');
    session.step('leave-it');
    expect(session.result.current.timedDecision).not.toBeNull();
    session.advance(9000);

    // Loading replaces the run with the untimed one.
    act(() => session.result.current.load());
    expect(session.playing().currentSceneId).toBe(CHAPTER1_SCENE.cellDawn);
    expect(session.result.current.timedDecision).toBeNull();

    // The old countdown's deadline passes: nothing may happen.
    session.advance(60000);
    expect(session.playing().currentSceneId).toBe(CHAPTER1_SCENE.cellDawn);
    expect(session.result.current.lastError).toBeNull();
  });
});

describe('save and resume in the interface', () => {
  it('disables resume when there is no save and enables it after saving', () => {
    const storage = fakeStorage();
    render(<App storyKey="chapter1" storage={storage} />);

    const resume = screen.getByRole('button', { name: /ادامه از ذخیرهٔ محلی/ });
    expect(resume.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(SAVE_NONE_MESSAGE)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));
    fireEvent.click(screen.getByRole('button', { name: /میلهٔ دریچهٔ هوا را دوباره/ }));

    fireEvent.click(screen.getByRole('button', { name: /ذخیرهٔ بازی در همین مرورگر/ }));
    expect(screen.getByText(SAVE_SUCCESS_MESSAGE)).not.toBeNull();

    // Back to the title: the save now exists and resumes into the same scene.
    fireEvent.click(screen.getByRole('button', { name: 'بازگشت به آغاز' }));
    const enabled = screen.getByRole('button', { name: /ادامه از ذخیرهٔ محلی/ });
    expect(enabled.hasAttribute('disabled')).toBe(false);

    fireEvent.click(enabled);
    expect(screen.getByRole('heading', { name: /میله‌ای که باید ساکت بماند/ })).not.toBeNull();
  });

  it('asks before overwriting an existing save', () => {
    const storage = fakeStorage();
    render(<App storyKey="chapter1" storage={storage} />);

    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));
    fireEvent.click(screen.getByRole('button', { name: /میلهٔ دریچهٔ هوا را دوباره/ }));

    fireEvent.click(screen.getByRole('button', { name: /ذخیرهٔ بازی در همین مرورگر/ }));
    const firstSave = storage.raw();

    // Second save: confirmation instead of an immediate overwrite.
    fireEvent.click(screen.getByRole('button', { name: /ذخیرهٔ بازی در همین مرورگر/ }));
    expect(screen.getByText('ذخیرهٔ قبلی رونویسی شود؟')).not.toBeNull();
    expect(storage.raw()).toBe(firstSave);

    fireEvent.click(screen.getByRole('button', { name: 'انصراف' }));
    expect(screen.queryByText('ذخیرهٔ قبلی رونویسی شود؟')).toBeNull();
    expect(storage.raw()).toBe(firstSave);

    const writesBefore = storage.writes();
    fireEvent.click(screen.getByRole('button', { name: /ذخیرهٔ بازی در همین مرورگر/ }));
    expect(screen.getByText('ذخیرهٔ قبلی رونویسی شود؟')).not.toBeNull();
    // Opening the confirmation must not write anything by itself.
    expect(storage.writes()).toBe(writesBefore);

    fireEvent.click(screen.getByRole('button', { name: 'بله، ذخیره کن' }));
    expect(storage.writes()).toBe(writesBefore + 1);
    expect(screen.queryByText('ذخیرهٔ قبلی رونویسی شود؟')).toBeNull();
    expect(storage.raw()).not.toBeNull();
  });

  it('explains an unusable save on the title screen instead of offering it', () => {
    const storage = fakeStorage('{broken');
    render(<App storyKey="chapter1" storage={storage} />);

    const resume = screen.getByRole('button', { name: /ادامه از ذخیرهٔ محلی/ });
    expect(resume.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('ذخیرهٔ موجود قابل استفاده نیست.')).not.toBeNull();
  });

  it('disables the save control when the browser has no local storage', () => {
    render(<App storyKey="chapter1" storage={null} />);
    expect(screen.getByText('ذخیره‌سازی محلی در این مرورگر در دسترس نیست.')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));
    const save = screen.getByRole('button', { name: /ذخیرهٔ بازی در همین مرورگر/ });
    expect(save.hasAttribute('disabled')).toBe(true);
  });
});
