import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';

vi.mock('../MessageReactionBar', () => ({
  MessageReactionBar: () => <div data-testid="reaction-bar">reaction bar</div>,
  REACTION_EMOJI_MAP: {},
}));

vi.mock('../MessageActions', () => ({
  MessageActions: () => null,
}));

vi.mock('../GoogleMapsWidget', () => ({
  GoogleMapsWidget: () => null,
}));

vi.mock('../GroundingCitationCard', () => ({
  GroundingCitationCard: () => null,
}));

vi.mock('../ImageLightbox', () => ({
  ImageLightbox: () => null,
}));

vi.mock('../ReadReceipts', () => ({
  ReadReceipts: () => null,
}));

vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <>{children}</>,
}));

vi.mock('@/hooks/useMobilePortrait', () => ({
  useMobilePortrait: () => false,
}));

vi.mock('@/hooks/useLongPress', () => ({
  useLongPress: () => ({
    onTouchStart: vi.fn(),
    onTouchMove: vi.fn(),
    onTouchEnd: vi.fn(),
    onMouseDown: vi.fn(),
    onMouseMove: vi.fn(),
    onMouseUp: vi.fn(),
    onMouseLeave: vi.fn(),
  }),
}));

vi.mock('@/hooks/useResolvedTripMediaUrl', () => ({
  useResolvedTripMediaUrl: () => null,
}));

vi.mock('@/services/hapticService', () => ({
  hapticService: {
    light: vi.fn(),
    medium: vi.fn(),
  },
}));

describe('MessageBubble desktop hover reactions', () => {
  it('shows the reaction bar when a message row is hovered', () => {
    render(
      <MessageBubble
        id="m-1"
        text="Hello team"
        senderName="Alex"
        timestamp={new Date().toISOString()}
        onReaction={vi.fn()}
        currentUserId="user-1"
      />,
    );

    expect(screen.queryByTestId('reaction-bar')).not.toBeInTheDocument();

    const messageRow = screen.getByText('Hello team').closest('div.group');
    expect(messageRow).not.toBeNull();

    fireEvent.mouseEnter(messageRow as HTMLDivElement);

    expect(screen.getByTestId('reaction-bar')).toBeInTheDocument();
  });
});
