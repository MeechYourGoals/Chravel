import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { VoiceButton } from '../VoiceButton';

describe('VoiceButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts dictation on tap when idle', () => {
    const onToggle = vi.fn();
    const onLongPress = vi.fn();

    render(
      <VoiceButton
        voiceState="idle"
        isEligible={true}
        onToggle={onToggle}
        onLongPress={onLongPress}
      />,
    );

    const button = screen.getByRole('button');

    // Simulate a quick tap: mousedown then immediate mouseup (< 500ms)
    fireEvent.mouseDown(button);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.mouseUp(button);

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('activates Gemini Live on long-press', () => {
    const onToggle = vi.fn();
    const onLongPress = vi.fn();

    render(
      <VoiceButton
        voiceState="idle"
        isEligible={true}
        onToggle={onToggle}
        onLongPress={onLongPress}
      />,
    );

    const button = screen.getByRole('button');

    // Simulate long-press: mousedown, wait 500ms (timer fires), then mouseup
    fireEvent.mouseDown(button);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    fireEvent.mouseUp(button);

    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('shows upgrade path when voice is unavailable', async () => {
    vi.useRealTimers();
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

    const button = screen.getByRole('button', { name: /voice — upgrade to use/i });

    // Simulate quick tap via mousedown+mouseup
    fireEvent.mouseDown(button);
    fireEvent.mouseUp(button);

    expect(onUpgrade).toHaveBeenCalledTimes(1);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('shows emerald style when Gemini Live is active', () => {
    render(
      <VoiceButton
        voiceState="listening"
        isEligible={true}
        onToggle={vi.fn()}
        isLiveActive={true}
      />,
    );

    const button = screen.getByRole('button');
    expect(button.className).toContain('emerald');
  });

  it('cancels long-press when pointer leaves button', () => {
    const onToggle = vi.fn();
    const onLongPress = vi.fn();

    render(
      <VoiceButton
        voiceState="idle"
        isEligible={true}
        onToggle={onToggle}
        onLongPress={onLongPress}
      />,
    );

    const button = screen.getByRole('button');

    fireEvent.mouseDown(button);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    // Pointer leaves before 500ms
    fireEvent.mouseLeave(button);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onLongPress).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
  });
});
