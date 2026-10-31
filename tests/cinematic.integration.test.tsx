// @vitest-environment jsdom
/**
 * Cinematic presentation integrated with the real app.
 *
 * The point of these tests is negative: the visuals must never change story
 * progression, timed decisions, save/load or the non-game screens. Everything
 * below drives the actual `<App />` with real content.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/app/App';
import type { SaveStorage } from '../src/persistence';
import { CHAPTER1_SCENE } from '../src/story/content/chapter1';
import { openChoices } from './helpers/flow';

function fakeStorage(initial: string | null = null): SaveStorage & {
  readonly raw: () => string | null;
} {
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
  };
}

const start = (): void => {
  fireEvent.click(screen.getByRole('button', { name: /شروع فصل اول/ }));
};

/**
 * Picks a choice. Since Phase 6 every scene opens with its narration stage, so
 * the gate is opened first — which is exactly what a player does.
 */
const click = (pattern: RegExp): void => {
  openChoices();
  fireEvent.click(screen.getByRole('button', { name: pattern }));
};

const backdrop = (): HTMLElement => {
  const element = document.querySelector('.scene-backdrop');
  if (element === null) {
    throw new Error('no backdrop rendered');
  }
  return element as HTMLElement;
};

const stepText = (): string =>
  document.querySelector('.game-topbar__step')?.textContent?.trim() ?? '';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('presentation on the real screen', () => {
  it('paints a backdrop for the first scene while narration and choices stay usable', () => {
    render(<App storyKey="chapter1" storage={null} />);
    start();

    expect(backdrop().getAttribute('data-scene-id')).toBe(CHAPTER1_SCENE.cellDawn);
    // Narration first: the backdrop and the narration are already there, the
    // choices are not (Phase 6 gate).
    expect(document.querySelector('.narration-gate')?.getAttribute('data-flow-phase')).toBe(
      'scene_narration',
    );
    expect(screen.queryByRole('button', { name: /میلهٔ دریچهٔ هوا را دوباره/ })).toBeNull();
    openChoices();
    // Fallback artwork only — no final art has been supplied.
    expect(backdrop().getAttribute('data-image-status')).toBe('idle');
    expect(document.querySelector('.scene-layer--gradient')).not.toBeNull();
    expect(document.querySelector('.scene-layer--image')).toBeNull();

    expect(screen.getByRole('heading', { name: /سلول ۱۴ — پیش از چهار و نیم/ })).not.toBeNull();
    expect(screen.getByRole('button', { name: /میلهٔ دریچهٔ هوا را دوباره/ })).not.toBeNull();
  });

  it('changes backdrop and motion preset when the scene changes', () => {
    render(<App storyKey="chapter1" storage={null} />);
    start();
    expect(backdrop().getAttribute('data-camera')).toBe('slow-zoom-in');

    click(/میلهٔ دریچهٔ هوا را دوباره/);
    expect(backdrop().getAttribute('data-scene-id')).toBe(CHAPTER1_SCENE.cellBar);

    click(/دست نمی‌زنم؛ میله/);
    // The stranger scene overrides the cell look: still frame, cold light.
    expect(backdrop().getAttribute('data-scene-id')).toBe(CHAPTER1_SCENE.strangerArrives);
    expect(backdrop().getAttribute('data-camera')).toBe('none');
    expect(document.querySelector('.scene-overlay')?.className).toContain('scene-overlay--cold');
  });

  it('does not advance the story while the camera runs', () => {
    render(<App storyKey="chapter1" storage={null} />);
    start();
    click(/میلهٔ دریچهٔ هوا را دوباره/);

    const before = stepText();
    act(() => {
      // Well past every camera animation duration.
      vi.advanceTimersByTime(60000);
    });

    expect(stepText()).toBe(before);
    expect(backdrop().getAttribute('data-scene-id')).toBe(CHAPTER1_SCENE.cellBar);
    expect(screen.getByRole('heading', { name: /میله‌ای که باید ساکت بماند/ })).not.toBeNull();
  });

  it('a single click produces exactly one transition, even mid-fade', () => {
    render(<App storyKey="chapter1" storage={null} />);
    start();
    const before = stepText();

    click(/میلهٔ دریچهٔ هوا را دوباره/);
    act(() => {
      vi.advanceTimersByTime(50); // fade still running
    });
    click(/دست نمی‌زنم؛ میله/);
    act(() => {
      vi.advanceTimersByTime(600);
    });

    // Two clicks, two scenes — no duplicated transitions from the transitions.
    expect(screen.getByRole('heading', { name: /کسی که نام واقعی‌ات را می‌داند/ })).not.toBeNull();
    expect(before).not.toBe(stepText());
    // Position on the path counts transitions, not history entries (the engine
    // stores two entries per scene), so the second scene reads as «صحنهٔ ۳».
    expect(screen.getByText(/صحنهٔ ۳/)).not.toBeNull();
  });

  it('keeps the timed decision working with presentation enabled (default fires once)', () => {
    render(<App storyKey="chapter1" storage={null} />);
    start();
    click(/میلهٔ دریچهٔ هوا را دوباره/);
    click(/دست نمی‌زنم؛ میله/);
    // The stranger scene is new: its narration and announcement come first.
    openChoices();

    // The stranger scene declares a 12-second decision: the full countdown
    // appears only now that the choices are on screen.
    expect(screen.getByText(/زمان تصمیم: ۱۲ ثانیه/)).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(12000);
    });

    expect(screen.getByRole('heading', { name: /سکوت، و سکوت/ })).not.toBeNull();
    expect(backdrop().getAttribute('data-scene-id')).toBe(CHAPTER1_SCENE.silence);

    // A further minute must not replay the default.
    act(() => {
      vi.advanceTimersByTime(60000);
    });
    expect(screen.getByRole('heading', { name: /سکوت، و سکوت/ })).not.toBeNull();
  });

  it('keyboard activation still works over the backdrop and overlays', async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    render(<App storyKey="chapter1" storage={null} />);
    start();

    openChoices();
    await user.tab();
    // Walk to a choice button, then activate it from the keyboard.
    let guard = 0;
    while (guard < 12) {
      const active = document.activeElement;
      if (active instanceof HTMLElement && active.className.includes('choice-button')) {
        break;
      }
      await user.tab();
      guard += 1;
    }

    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: /میله‌ای که باید ساکت بماند/ })).not.toBeNull();
  });

  it('save and resume still work with the cinematic layer present', () => {
    const storage = fakeStorage();
    render(<App storyKey="chapter1" storage={storage} />);
    start();
    click(/میلهٔ دریچهٔ هوا را دوباره/);

    click(/ذخیرهٔ بازی در همین مرورگر/);
    expect(storage.raw()).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'بازگشت به آغاز' }));
    fireEvent.click(screen.getByRole('button', { name: /ادامه از ذخیرهٔ محلی/ }));

    expect(screen.getByRole('heading', { name: /میله‌ای که باید ساکت بماند/ })).not.toBeNull();
    expect(backdrop().getAttribute('data-scene-id')).toBe(CHAPTER1_SCENE.cellBar);
  });

  it('leaves the title, failure and ending screens alone', () => {
    render(<App storyKey="chapter1" storage={null} />);
    // Title screen: no cinematic backdrop is rendered there.
    expect(document.querySelector('.scene-backdrop')).toBeNull();

    start();
    click(/میلهٔ دریچهٔ هوا را دوباره/);
    click(/دست نمی‌زنم؛ میله/);
    click(/سکوت می‌کنم و هیچ نشانه/);
    click(/صبر می‌کنم تا صدای قدم‌ها/);
    click(/یک بار دیگر گوشه‌های سلول/);
    click(/برگه را بیرون می‌کشم/);
    click(/تا می‌کنم و در آستینم/);
    click(/سمت چپ؛ به سمت دفتر نگهبانی/);
    click(/بی‌صدا از کنار در می‌گذرم/);
    click(/دفتر انتقال را ورق/);
    // Taking the loose page springs the office alarm.
    click(/برگهٔ داخل پوشه را برمی‌دارم/);

    expect(screen.getByRole('heading', { name: /دفتر بازرسی‌شده/ })).not.toBeNull();
    expect(document.querySelector('.scene-backdrop')).toBeNull();
    expect(screen.getByRole('button', { name: /بازگشت به آخرین نقطهٔ امن/ })).not.toBeNull();
  });
});

describe('reduced motion at the app level', () => {
  it('renders motion-free scenes when the preference is set', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }));

    render(<App storyKey="chapter1" storage={null} />);
    start();

    expect(backdrop().getAttribute('data-motion')).toBe('reduced');
    expect(backdrop().getAttribute('data-camera')).toBe('none');
    expect(document.querySelector('.scene-camera')?.className ?? '').not.toMatch(/scene-camera--/);
  });
});
