import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AiChatInput } from '../AiChatInput';

describe('AiChatInput Simple', () => {
  it('renders correctly', () => {
    const onSendMessage = vi.fn();
    render(<AiChatInput
      inputMessage='test'
      onInputChange={vi.fn()}
      onSendMessage={onSendMessage}
      onKeyPress={vi.fn()}
      isTyping={false}
    />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
