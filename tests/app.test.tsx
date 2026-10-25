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

describe('<App /> failure and recovery', () => {
  it('shows the checkpoint hint and recovers to it after a failure', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /آغاز نمونهٔ توسعه/ }));
    await user.click(screen.getByRole('button', { name: /سکوت می‌کنم/ }));

    // The corridor scene declares a checkpoint, so the UI reports it.
    expect(screen.getByText(/نقطهٔ امن: راهروی بند/)).not.toBeNull();

    await user.click(screen.getByRole('button', { name: /به تای پوشه نگاه می‌کنم/ }));
    expect(screen.getByRole('heading', { name: 'روی صندلی' })).not.toBeNull();

    await user.click(screen.getByRole('button', { name: /روی نگهبان فشار می‌آورم/ }));

    // Engine-reported failure, rendered from getFailure/getRecoveryTarget.
    expect(screen.getByRole('heading', { name: /نگهبان خبر می‌شود/ })).not.toBeNull();
    expect(screen.getByText('شکست قابل جبران')).not.toBeNull();

    const recover = screen.getByRole('button', { name: /بازگشت به آخرین نقطهٔ امن/ });
    expect((recover as HTMLButtonElement).disabled).toBe(false);
    await user.click(recover);

    // Back in the corridor scene: the clue found after the checkpoint is gone,
    // so the clue-gated choice is no longer offered.
    expect(screen.getByRole('heading', { name: 'سکوت، اولین پاسخ' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: /برگهٔ جدا‌شده/ })).toBeNull();
  });

  it('explains that no safe point exists when the player never reached one', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /آغاز نمونهٔ توسعه/ }));
    await user.click(screen.getByRole('button', { name: /حرف می‌زنم/ }));
    await user.click(screen.getByRole('button', { name: /روی نگهبان فشار می‌آورم/ }));

    expect(screen.getByRole('heading', { name: /نگهبان خبر می‌شود/ })).not.toBeNull();
    const recover = screen.getByRole('button', { name: /بازگشت به آخرین نقطهٔ امن/ });
    expect((recover as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/نقطهٔ امنی برای بازگشت ثبت نشده است/)).not.toBeNull();
  });
});
