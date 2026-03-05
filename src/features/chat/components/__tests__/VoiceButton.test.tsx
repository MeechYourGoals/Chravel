import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { VoiceButton } from '../VoiceButton';

describe('VoiceButton', () => {
  it('starts dictation on tap when idle', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(<VoiceButton voiceState="idle" isEligible={true} onToggle={onToggle} />);

    await user.click(screen.getByRole('button', { name: /tap to dictate/i }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows upgrade path when voice is unavailable', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const onUpgrade = vi.fn();

    render(
      <VoiceButton
        voiceState="idle"
        isEligible={false}
        onToggle={onToggle}
        onUpgrade={onUpgrade}
      />,
    );

    await user.click(screen.getByRole('button', { name: /voice — upgrade to use/i }));

    expect(onUpgrade).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
