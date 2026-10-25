// @vitest-environment jsdom
/**
 * UI smoke test: the React layer only renders what the engine returns.
 * It drives the real App through the demo story end to end.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../src/app/App';

describe('<App />', () => {
  it('shows the title screen and starts the demo story', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: 'آخرین سلول' })).not.toBeNull();

    await user.click(screen.getByRole('button', { name: /آغاز نمونهٔ توسعه/ }));

    expect(screen.getByRole('heading', { name: 'سلول ۱۴' })).not.toBeNull();
    expect(screen.getByRole('button', { name: /حرف می‌زنم/ })).not.toBeNull();
  });

  it('transitions through a choice and reaches an ending, then restarts', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /آغاز نمونهٔ توسعه/ }));
    await user.click(screen.getByRole('button', { name: /حرف می‌زنم/ }));

    // Engine sent us to the interrogation scene.
    expect(screen.getByRole('heading', { name: 'روی صندلی' })).not.toBeNull();
    expect(screen.getByText(/شب بیست‌ویکم کجا بودی/)).not.toBeNull();

    await user.click(screen.getByRole('button', { name: /دروغ می‌گویم/ }));

    // Ending screen comes from engine.getEnding(state), not from a UI rule.
    expect(screen.getByRole('heading', { name: /روایت شکسته/ })).not.toBeNull();
    expect(screen.getByRole('button', { name: /بازگشت به آغاز/ })).not.toBeNull();

    await user.click(screen.getByRole('button', { name: /بازگشت به آغاز/ }));
    expect(screen.getByRole('heading', { name: 'آخرین سلول' })).not.toBeNull();
  });

  it('does not render the conditional choice before the engine makes it available', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /آغاز نمونهٔ توسعه/ }));
    // Taking the silent branch never raises suspicion, so the lawyer option is
    // absent from the whole path.
    await user.click(screen.getByRole('button', { name: /سکوت می‌کنم/ }));
    expect(screen.queryByRole('button', { name: /وکیل می‌خواهم/ })).toBeNull();
  });
});
