import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AiChatInput } from '../AiChatInput';

// Mock useWebSpeechVoice to ensure predictable state for UI tests and prevent timeouts
vi.mock('@/hooks/useWebSpeechVoice', () => ({
  useWebSpeechVoice: () => ({
    voiceState: 'idle',
    toggleVoice: vi.fn(),
    errorMessage: null,
  }),
}));

// Mock despia-native to prevent issues in test environment
vi.mock('despia-native', () => ({
  default: vi.fn(),
}));

const buildProps = (overrides: Partial<React.ComponentProps<typeof AiChatInput>> = {}) => ({
  inputMessage: 'Test concierge message',
  onInputChange: vi.fn(),
  onSendMessage: vi.fn(),
  onKeyPress: vi.fn(),
  isTyping: false,
  ...overrides,
});

describe('AiChatInput', () => {
  it('invokes onSendMessage without passing click event args', () => {
    const onSendMessage = vi.fn();
    const props = buildProps({ onSendMessage });

    render(<AiChatInput {...props} />);

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(onSendMessage.mock.calls[0]).toEqual([]);
  });

  it('does not submit parent forms when clicking send', () => {
    const onSendMessage = vi.fn();
    const onSubmit = vi.fn();
    const props = buildProps({ onSendMessage });

    render(
      <form
        onSubmit={event => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <AiChatInput {...props} />
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: /send message/i }));

    expect(onSendMessage).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
