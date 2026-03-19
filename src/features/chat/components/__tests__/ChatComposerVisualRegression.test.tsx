import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatInput } from '../ChatInput';
import { MessageBubble } from '../MessageBubble';

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

vi.mock('../VoiceButton', () => ({
  VoiceButton: () => <button type="button">voice</button>,
}));

vi.mock('../ParsedContentSuggestions', () => ({
  ParsedContentSuggestions: () => null,
}));

vi.mock('@/services/ogMetadataService', () => ({
  fetchOGMetadata: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/native/haptics', () => ({
  light: vi.fn(),
}));

vi.mock('@/hooks/useMobilePortrait', () => ({
  useMobilePortrait: () => false,
}));

vi.mock('@/hooks/useLongPress', () => ({
  useLongPress: () => ({
    onMouseDown: vi.fn(),
    onMouseMove: vi.fn(),
    onMouseUp: vi.fn(),
    onMouseLeave: vi.fn(),
    onTouchStart: vi.fn(),
    onTouchMove: vi.fn(),
    onTouchEnd: vi.fn(),
  }),
}));

vi.mock('./MessageReactionBar', () => ({
  MessageReactionBar: () => null,
  REACTION_EMOJI_MAP: {},
}));

vi.mock('./MessageActions', () => ({
  MessageActions: () => null,
}));

vi.mock('./GoogleMapsWidget', () => ({
  GoogleMapsWidget: () => null,
}));

vi.mock('./GroundingCitationCard', () => ({
  GroundingCitationCard: () => null,
}));

vi.mock('./ImageLightbox', () => ({
  ImageLightbox: () => null,
}));

vi.mock('./ReadReceipts', () => ({
  ReadReceipts: () => null,
}));

describe('Chat composer UI regressions', () => {
  const baseChatInputProps = {
    inputMessage: 'Hello world',
    onInputChange: vi.fn(),
    onSendMessage: vi.fn(),
    onKeyPress: vi.fn(),
    isTyping: false,
    apiKey: 'test-key',
    tripId: 'trip-123',
  };

  it('keeps + and send buttons at primary 44px size', () => {
    const { container } = render(<ChatInput {...baseChatInputProps} />);

    const plusButton = screen.getByRole('button', { name: 'Message options' });
    expect(plusButton.className).toContain('size-11');
    expect(plusButton.className).toContain('min-w-[44px]');

    const goldRimButtons = Array.from(container.querySelectorAll('button')).filter(button =>
      button.className.includes('cta-gold-ring'),
    );

    expect(goldRimButtons.length).toBeGreaterThanOrEqual(2);

    const sendButton = goldRimButtons.find(button => !button.getAttribute('aria-label'));
    expect(sendButton).toBeDefined();
    expect(sendButton?.className).toContain('size-11');
    expect(sendButton?.className).toContain('min-w-[44px]');
  });

  it('keeps broadcast-mode send button at 44px size', () => {
    const { container } = render(<ChatInput {...baseChatInputProps} />);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Message options' }));
    fireEvent.click(screen.getByText('Broadcast'));

    const sendButton = Array.from(container.querySelectorAll('button')).find(
      button =>
        button.className.includes('bg-gradient-to-r from-[#B91C1C] to-[#991B1B]') &&
        !button.getAttribute('aria-label'),
    );

    expect(sendButton).toBeDefined();
    expect(sendButton?.className).toContain('size-11');
    expect(sendButton?.className).toContain('min-w-[44px]');
  });
});

describe('@mention readability', () => {
  it('renders mention pills with high-contrast text/background', () => {
    render(
      <MessageBubble
        id="m-1"
        text="@Alex please review this"
        senderName="Jordan"
        timestamp={new Date().toISOString()}
        onReaction={vi.fn()}
        currentUserId="user-1"
      />,
    );

    const mentionPill = screen.getByText((content, element) => {
      return (
        !!element &&
        element.tagName.toLowerCase() === 'span' &&
        element.className.includes('text-black') &&
        element.className.includes('bg-white/90') &&
        content.startsWith('@Alex')
      );
    });
    expect(mentionPill).toHaveClass('text-black');
    expect(mentionPill).toHaveClass('bg-white/90');
    expect(mentionPill).toHaveClass('font-semibold');
  });
});
