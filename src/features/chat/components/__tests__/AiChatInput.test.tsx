
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiChatInput } from '../AiChatInput';

// Safe mocks returning null or simple strings (no JSX in factory if possible)
vi.mock('lucide-react', () => ({
  Send: () => null,
  Sparkles: () => null,
  X: () => null,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: () => null,
}));

vi.mock('../VoiceButton', () => ({
  VoiceButton: () => null,
}));

vi.mock('@/hooks/useWebSpeechVoice', () => ({
  useWebSpeechVoice: () => ({
    voiceState: 'idle',
    toggleVoice: vi.fn(),
    errorMessage: null,
  }),
}));

global.URL.createObjectURL = vi.fn(() => 'blob:test');
global.URL.revokeObjectURL = vi.fn();

const buildProps = (overrides: Partial<React.ComponentProps<typeof AiChatInput>> = {}) => ({
  inputMessage: 'Test concierge message',
  onInputChange: vi.fn(),
  onSendMessage: vi.fn(),
  onKeyPress: vi.fn(),
  isTyping: false,
  ...overrides,
});

describe('AiChatInput', () => {
  it('renders and handles send click', () => {
    const onSendMessage = vi.fn();
    const props = buildProps({ onSendMessage });

    render(<AiChatInput {...props} />);

    // Find button by aria-label instead of role/name combo to be robust
    const button = screen.getByLabelText('Send message');
    fireEvent.click(button);

    expect(onSendMessage).toHaveBeenCalledTimes(1);
  });
});
