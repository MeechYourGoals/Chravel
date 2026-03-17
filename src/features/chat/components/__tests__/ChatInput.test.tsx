import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from '../ChatInput';

vi.mock('@/hooks/useShareAsset', () => ({
  useShareAsset: () => ({
    shareLink: vi.fn(),
    shareMultipleFiles: vi.fn(),
    isUploading: false,
    uploadProgress: {},
    parsedContent: null,
    clearParsedContent: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWebSpeechVoice', () => ({
  useWebSpeechVoice: () => ({
    voiceState: 'idle',
    toggleVoice: vi.fn(),
  }),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuItem: ({ children, onClick }: { children: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogHeader: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogTitle: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/payments/PaymentInput', () => ({
  PaymentInput: () => null,
}));

vi.mock('../ParsedContentSuggestions', () => ({
  ParsedContentSuggestions: () => null,
}));

vi.mock('../MentionPicker', () => ({
  MentionPicker: () => null,
}));

vi.mock('../VoiceButton', () => ({
  VoiceButton: () => null,
}));

describe('ChatInput send behavior', () => {
  const baseProps = {
    inputMessage: '',
    onInputChange: vi.fn(),
    onSendMessage: vi.fn(),
    onKeyPress: vi.fn(),
    apiKey: '',
    isTyping: false,
    tripId: 'trip-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends on Enter for URL messages', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();
    const onInputChange = vi.fn();

    render(
      <ChatInput
        {...baseProps}
        inputMessage="https://example.com"
        onSendMessage={onSendMessage}
        onInputChange={onInputChange}
      />,
    );

    const textbox = screen.getByPlaceholderText('Type @ to mention someone…');
    await user.type(textbox, '{enter}');

    expect(onSendMessage).toHaveBeenCalledTimes(1);
  });

  it('send button triggers the same send path', async () => {
    const user = userEvent.setup();
    const onSendMessage = vi.fn();

    render(<ChatInput {...baseProps} inputMessage="hello team" onSendMessage={onSendMessage} />);

    const textbox = screen.getByPlaceholderText('Type @ to mention someone…');
    const composer = textbox.parentElement;
    const sendButton = composer?.querySelector('button:last-of-type');

    expect(sendButton).toBeTruthy();
    await user.click(sendButton as HTMLButtonElement);

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledTimes(1);
    });
  });
});
