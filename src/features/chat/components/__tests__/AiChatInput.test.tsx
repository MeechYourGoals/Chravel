import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
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

// Mock URL.createObjectURL and URL.revokeObjectURL
beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => 'mock-url');
  global.URL.revokeObjectURL = vi.fn();
});

afterAll(() => {
  vi.restoreAllMocks();
});

const buildProps = (overrides: Partial<React.ComponentProps<typeof AiChatInput>> = {}) => ({
  inputMessage: 'Test concierge message',
  onInputChange: vi.fn(),
  onSendMessage: vi.fn(),
  onKeyPress: vi.fn(),
  isTyping: false,
  // Enable voice button for testing
  onVoiceToggle: vi.fn(),
  ...overrides,
});

describe('AiChatInput', () => {
  it('renders correctly', () => {
    const props = buildProps();
    render(<AiChatInput {...props} />);

    // Check for textbox
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    // Check for send button
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

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
