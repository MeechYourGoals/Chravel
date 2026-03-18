import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PendingActionCard } from './PendingActionCard';

const baseAction = {
  id: 'pending-1',
  trip_id: 'trip-1',
  user_id: 'user-1',
  tool_name: 'createPoll',
  tool_call_id: 'tool-1',
  payload: {
    question: 'Where should we eat?',
    options: [{ text: 'Sushi' }, { text: 'Tacos' }],
  },
  status: 'pending' as const,
  source_type: 'ai_concierge',
  created_at: '2026-03-18T00:00:00.000Z',
  resolved_at: null,
  resolved_by: null,
};

describe('PendingActionCard', () => {
  it('renders a readable summary and dispatches confirm/reject actions', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onReject = vi.fn();

    render(
      <PendingActionCard
        action={baseAction}
        onConfirm={onConfirm}
        onReject={onReject}
        isConfirming={false}
        isRejecting={false}
      />,
    );

    expect(screen.getByText('AI wants to create a Poll')).toBeInTheDocument();
    expect(screen.getByText('Where should we eat?')).toBeInTheDocument();
    expect(screen.getByText('Sushi, Tacos')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(onConfirm).toHaveBeenCalledWith('pending-1');
    expect(onReject).toHaveBeenCalledWith('pending-1');
  });

  it('disables both actions while a confirmation is pending', () => {
    render(
      <PendingActionCard
        action={baseAction}
        onConfirm={vi.fn()}
        onReject={vi.fn()}
        isConfirming={true}
        isRejecting={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeDisabled();
  });
});
