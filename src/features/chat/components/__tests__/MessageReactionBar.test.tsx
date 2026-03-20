import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageReactionBar, getReactionTooltipText } from '../MessageReactionBar';

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../EmojiMartPicker', () => ({
  EmojiMartPicker: ({ onEmojiSelect }: { onEmojiSelect: (emoji: { native?: string }) => void }) => (
    <button onClick={() => onEmojiSelect({ native: '🎯' })}>pick custom emoji</button>
  ),
}));

describe('getReactionTooltipText', () => {
  it('returns joined display names for reaction users', () => {
    const tooltip = getReactionTooltipText(['u1', 'u2'], {
      u1: 'Alex',
      u2: 'Jordan',
    });

    expect(tooltip).toBe('Alex, Jordan');
  });

  it('falls back safely for unknown users', () => {
    const tooltip = getReactionTooltipText(['u1'], {});

    expect(tooltip).toBe('Someone');
  });
});

describe('MessageReactionBar', () => {
  it('renders exactly five quick reactions plus the picker trigger', () => {
    render(<MessageReactionBar messageId="m1" onReaction={vi.fn()} />);

    expect(screen.getByTitle('Like')).toBeInTheDocument();
    expect(screen.getByTitle('Love')).toBeInTheDocument();
    expect(screen.getByTitle('Haha')).toBeInTheDocument();
    expect(screen.getByTitle('Wow')).toBeInTheDocument();
    expect(screen.getByTitle('Sad')).toBeInTheDocument();
    expect(screen.queryByTitle('Angry')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Open full emoji picker')).toBeInTheDocument();
  });

  it('routes full picker emoji selections to message reactions', async () => {
    const user = userEvent.setup();
    const onReaction = vi.fn();

    render(<MessageReactionBar messageId="m1" onReaction={onReaction} />);

    await user.click(screen.getByText('pick custom emoji'));

    expect(onReaction).toHaveBeenCalledWith('m1', '🎯');
  });
});
