// @vitest-environment jsdom
/**
 * The choice list renders state, not just labels: conditions are visible on the
 * options that have them, and a locked option is present, disabled and explained.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { ChoiceList } from '../src/ui/components/ChoiceList';
import { ChangeNotice } from '../src/ui/components/ChangeNotice';
import type { ChoiceAvailability } from '../src/story/engine';

const labels = {
  guardSuspicion: { label: 'شک نگهبان‌ها' },
  composure: { label: 'خون‌سردی' },
} as const;
const clueLabels = { death_record_contradiction: 'تناقض در دفتر مردگان' };

function entry(overrides: Partial<ChoiceAvailability> & Pick<ChoiceAvailability, 'choice'>): ChoiceAvailability {
  return {
    available: true,
    requirements: [],
    unmet: [],
    ...overrides,
  };
}

const openChoice = entry({
  choice: { id: 'walk-away', label: 'از پاگرد رد شو', outcome: { type: 'transition', targetSceneId: 'next' } },
});

const gatedOpen = entry({
  choice: {
    id: 'alcove',
    label: 'در شکاف دیوار بخز',
    outcome: { type: 'transition', targetSceneId: 'next' },
    condition: { kind: 'compareVariable', variable: 'guardSuspicion', operator: 'lte', value: 1 },
  },
  available: true,
  requirements: [
    { requirement: { kind: 'variable', variable: 'guardSuspicion', operator: 'lte', required: 1, actual: 1 }, met: true },
  ],
});

const gatedLocked = entry({
  choice: {
    id: 'alcove-locked',
    label: 'در شکاف دیوار بخز',
    outcome: { type: 'transition', targetSceneId: 'next' },
    condition: { kind: 'compareVariable', variable: 'guardSuspicion', operator: 'lte', value: 1 },
  },
  available: false,
  requirements: [
    { requirement: { kind: 'variable', variable: 'guardSuspicion', operator: 'lte', required: 1, actual: 3 }, met: false },
  ],
  unmet: [{ kind: 'variable', variable: 'guardSuspicion', operator: 'lte', required: 1, actual: 3 }],
});

function renderList(entries: readonly ChoiceAvailability[], onSelect = vi.fn()) {
  return render(
    <ChoiceList
      choices={entries}
      onSelect={onSelect}
      variableLabels={labels}
      clueLabels={clueLabels}
    />,
  );
}

describe('ChoiceList', () => {
  it('shows a plain choice without any condition text', () => {
    renderList([openChoice]);
    const button = screen.getByRole('button', { name: /از پاگرد رد شو/ });
    expect(button).toHaveProperty('disabled', false);
    expect(document.querySelector('.choice-button__condition')).toBeNull();
  });

  it('shows the condition on an option that is open', () => {
    renderList([gatedOpen]);
    const button = screen.getByRole('button', { name: /در شکاف/ });
    expect(button).toHaveProperty('disabled', false);
    const line = document.querySelector('.choice-button__condition');
    expect(line?.textContent).toContain('✓');
    expect(line?.textContent).toContain('شک نگهبان‌ها');
  });

  it('keeps a locked option visible, disables it and says why', () => {
    const onSelect = vi.fn();
    renderList([openChoice, gatedLocked], onSelect);

    const locked = screen.getByRole('button', { name: /در شکاف/ });
    expect(locked).toHaveProperty('disabled', true);
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    expect(locked.className).toContain('choice-button--locked');

    // The reason is attached to the button itself, for sighted and screen readers.
    const describedBy = locked.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    const reason = describedBy === null ? null : document.getElementById(describedBy);
    expect(reason?.textContent).toContain('✗');
    expect(reason?.textContent).toContain('شک نگهبان‌ها');
    expect(reason?.textContent).toContain('۳');

    // A disabled button cannot be activated, so nothing is selected.
    fireEvent.click(locked);
    expect(onSelect).not.toHaveBeenCalledWith('alcove-locked');
  });

  it('numbers only the options the player can take', () => {
    renderList([openChoice, gatedLocked]);
    const open = screen.getByRole('button', { name: /از پاگرد/ });
    expect(open.textContent).toContain('1');
    const locked = screen.getByRole('button', { name: /در شکاف/ });
    expect(locked.textContent).toContain('×');
  });

  it('lists locked options under their own heading, after the open ones', () => {
    renderList([gatedLocked, openChoice]);
    const heading = screen.getByText('راه‌هایی که اکنون بسته‌اند');
    expect(heading).toBeTruthy();
    const openList = document.querySelector('.choice-list:not(.choice-list--locked)');
    const lockedList = document.querySelector('.choice-list--locked');
    expect(openList?.textContent).toContain('از پاگرد');
    expect(lockedList?.textContent).toContain('در شکاف');
  });

  it('says so when every option is closed instead of showing an empty menu', () => {
    renderList([gatedLocked]);
    expect(screen.getByText('هیچ‌یک از انتخاب‌های این صحنه اکنون ممکن نیست.')).toBeTruthy();
  });

  it('passes the selected id through for an open option', () => {
    const onSelect = vi.fn();
    renderList([openChoice], onSelect);
    fireEvent.click(screen.getByRole('button', { name: /از پاگرد/ }), { detail: 1 });
    expect(onSelect).toHaveBeenCalledWith('walk-away');
  });

  it('numbers the options for the staggered entrance', () => {
    renderList([openChoice, gatedOpen]);

    const list = document.querySelector('.choice-list');
    expect(list?.className).toContain('choice-list--enter');

    const items = [...document.querySelectorAll('.choice-list__item')];
    expect(items).toHaveLength(2);
    // `--order` becomes the animation-delay token in CSS, so it must be the
    // visible order of the options, not their ids or a random key.
    expect(items.map((item) => (item as HTMLElement).style.getPropertyValue('--order'))).toEqual(['0', '1']);
  });

  it('ticks the haptics once per tap when the platform offers it', () => {
    const vibrations: number[][] = [];
    const original = Object.getOwnPropertyDescriptor(navigator, 'vibrate');
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: (pattern: number[]) => {
        vibrations.push(pattern);
        return true;
      },
    });

    try {
      const onSelect = vi.fn();
      renderList([openChoice], onSelect);
      fireEvent.click(screen.getByRole('button', { name: /از پاگرد/ }), { detail: 1 });
      expect(vibrations).toHaveLength(1);
      expect(vibrations[0]).toEqual([8]);
      expect(onSelect).toHaveBeenCalledWith('walk-away');
    } finally {
      if (original) {
        Object.defineProperty(navigator, 'vibrate', original);
      } else {
        Reflect.deleteProperty(navigator, 'vibrate');
      }
    }
  });

  it('still selects when the platform refuses to vibrate', () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'vibrate');
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: () => {
        throw new Error('not allowed');
      },
    });

    try {
      const onSelect = vi.fn();
      renderList([openChoice], onSelect);
      expect(() => fireEvent.click(screen.getByRole('button', { name: /از پاگرد/ }), { detail: 1 })).not.toThrow();
      expect(onSelect).toHaveBeenCalledWith('walk-away');
    } finally {
      if (original) {
        Object.defineProperty(navigator, 'vibrate', original);
      } else {
        Reflect.deleteProperty(navigator, 'vibrate');
      }
    }
  });
});

describe('ChangeNotice', () => {
  it('names the change with the variable label and the new value', () => {
    const onDismiss = vi.fn();
    render(
      <ChangeNotice
        notice={{ choiceLabel: 'در را هل بده', variableLabels: labels, clueLabels }}
        changes={{
          variableChanges: [{ variable: 'guardSuspicion', before: 1, after: 3 }],
          discoveredClueIds: [],
        }}
        meta={labels}
        onDismiss={onDismiss}
      />,
    );

    const notice = document.querySelector('.change-notice') as HTMLElement;
    expect(within(notice).getByText(/اثر «در را هل بده»/)).toBeTruthy();
    expect(notice.textContent).toContain('شک نگهبان‌ها');
    expect(notice.textContent).toContain('+۲');
    expect(notice.textContent).toContain('۳');

    fireEvent.click(within(notice).getByRole('button', { name: /بستن/ }));
    expect(onDismiss).toHaveBeenCalled();
  });

  it('reports a discovered clue by its label', () => {
    render(
      <ChangeNotice
        notice={{ choiceLabel: null, variableLabels: labels, clueLabels }}
        changes={{ variableChanges: [], discoveredClueIds: ['death_record_contradiction'] }}
        meta={labels}
        onDismiss={() => undefined}
      />,
    );
    expect(document.querySelector('.change-notice')?.textContent).toContain('تناقض در دفتر مردگان');
  });

  it('stagers the changed values so they read in order', () => {
    render(
      <ChangeNotice
        notice={{ choiceLabel: 'در را هل بده', variableLabels: labels, clueLabels }}
        changes={{
          variableChanges: [
            { variable: 'guardSuspicion', before: 1, after: 3 },
            { variable: 'composure', before: 2, after: 1 },
          ],
          discoveredClueIds: ['death_record_contradiction'],
        }}
        meta={labels}
        onDismiss={() => undefined}
      />,
    );

    const items = [...document.querySelectorAll('.change-notice__item')];
    expect(items).toHaveLength(3);
    expect(items.map((item) => (item as HTMLElement).style.getPropertyValue('--order'))).toEqual(['0', '1', '2']);
    // The discovery is the last beat, after the deltas.
    expect(items[2]?.className).toContain('change-notice__item--clue');
  });

  it('closes immediately where the platform cannot animate the exit', () => {
    const onDismiss = vi.fn();
    render(
      <ChangeNotice
        notice={{ choiceLabel: 'در را هل بده', variableLabels: labels, clueLabels }}
        changes={{ variableChanges: [{ variable: 'guardSuspicion', before: 1, after: 3 }], discoveredClueIds: [] }}
        meta={labels}
        onDismiss={onDismiss}
      />,
    );

    // jsdom has no Element.animate: the dismissal must not get stuck waiting.
    const notice = document.querySelector('.change-notice') as HTMLElement;
    expect(typeof notice.animate).toBe('undefined');
    fireEvent.click(within(notice).getByRole('button', { name: /بستن/ }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('lets the exit animation finish before reporting the dismissal', async () => {
    const onDismiss = vi.fn();
    let finish: () => void = () => undefined;
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const animate = vi.fn(() => ({ finished }));

    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate');
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    // jsdom ships no `matchMedia`; the exit path only needs "motion is allowed".
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }));

    try {
      render(
        <ChangeNotice
          notice={{ choiceLabel: 'در را هل بده', variableLabels: labels, clueLabels }}
          changes={{ variableChanges: [{ variable: 'guardSuspicion', before: 1, after: 3 }], discoveredClueIds: [] }}
          meta={labels}
          onDismiss={onDismiss}
        />,
      );

      const notice = document.querySelector('.change-notice') as HTMLElement;
      fireEvent.click(within(notice).getByRole('button', { name: /بستن/ }));

      // Presentation must never swallow the event: the card is still on screen
      // while it folds away, and the dismissal lands when the animation ends.
      expect(animate).toHaveBeenCalledTimes(1);
      expect(onDismiss).not.toHaveBeenCalled();

      finish();
      await finished;
      await Promise.resolve();
      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      if (original === undefined) {
        Reflect.deleteProperty(HTMLElement.prototype, 'animate');
      } else {
        Object.defineProperty(HTMLElement.prototype, 'animate', original);
      }
      vi.unstubAllGlobals();
    }
  });

  it('renders nothing when a choice changed nothing', () => {
    render(
      <ChangeNotice
        notice={{ choiceLabel: 'هیچ', variableLabels: labels, clueLabels }}
        changes={{ variableChanges: [{ variable: 'composure', before: 2, after: 2 }], discoveredClueIds: [] }}
        meta={labels}
        onDismiss={() => undefined}
      />,
    );
    expect(document.querySelector('.change-notice')).toBeNull();
  });
});

// jsdom keeps one document per file, so each render must be torn down.
afterEach(() => {
  cleanup();
});
