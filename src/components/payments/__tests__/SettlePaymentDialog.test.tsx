import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock safeReload
vi.mock('@/utils/safeReload', () => ({
  safeReload: vi.fn().mockResolvedValue(undefined),
}));

// Mock supabase client
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

// Mock toast
vi.mock('../../components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { SettlePaymentDialog } from '../SettlePaymentDialog';

const mockBalance = {
  userId: 'other-user-1',
  userName: 'John Smith',
  avatar: 'https://avatar.com/john.png',
  amountOwed: -75.0, // You owe them
  amountOwedCurrency: 'USD',
  preferredPaymentMethod: null,
  unsettledPayments: [
    {
      paymentId: 'pay-1',
      amount: 50.0,
      description: 'Dinner',
      amountCurrency: 'USD',
      date: '2025-01-15',
    },
    {
      paymentId: 'pay-2',
      amount: 25.0,
      description: 'Taxi',
      amountCurrency: 'USD',
      date: '2025-01-16',
    },
  ],
};

describe('SettlePaymentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog with payment details when open', () => {
    render(
      <SettlePaymentDialog
        open={true}
        onOpenChange={vi.fn()}
        balance={mockBalance}
        tripId="trip-1"
      />,
    );

    expect(screen.getByText('Settle Payment')).toBeInTheDocument();
    expect(screen.getByText('$75.00')).toBeInTheDocument();
    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <SettlePaymentDialog
        open={false}
        onOpenChange={vi.fn()}
        balance={mockBalance}
        tripId="trip-1"
      />,
    );

    expect(screen.queryByText('Settle Payment')).not.toBeInTheDocument();
  });

  it('should show "Paying to" when you owe them (negative balance)', () => {
    render(
      <SettlePaymentDialog
        open={true}
        onOpenChange={vi.fn()}
        balance={mockBalance}
        tripId="trip-1"
      />,
    );

    expect(screen.getByText('Paying to:')).toBeInTheDocument();
  });

  it('should show "Receiving from" when they owe you (positive balance)', () => {
    const positiveBalance = { ...mockBalance, amountOwed: 75.0 };
    render(
      <SettlePaymentDialog
        open={true}
        onOpenChange={vi.fn()}
        balance={positiveBalance}
        tripId="trip-1"
      />,
    );

    expect(screen.getByText('Receiving from:')).toBeInTheDocument();
  });

  it('should show preferred payment method when available', () => {
    const balanceWithMethod = {
      ...mockBalance,
      preferredPaymentMethod: { id: 'pm-1', type: 'cashapp' as const, identifier: '$johnsmith' },
    };

    render(
      <SettlePaymentDialog
        open={true}
        onOpenChange={vi.fn()}
        balance={balanceWithMethod}
        tripId="trip-1"
      />,
    );

    expect(screen.getByText('Cashapp')).toBeInTheDocument();
  });

  it('should call onOpenChange when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <SettlePaymentDialog
        open={true}
        onOpenChange={onOpenChange}
        balance={mockBalance}
        tripId="trip-1"
      />,
    );

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should have Confirm Settlement button', () => {
    render(
      <SettlePaymentDialog
        open={true}
        onOpenChange={vi.fn()}
        balance={mockBalance}
        tripId="trip-1"
      />,
    );

    expect(screen.getByText('Confirm Settlement')).toBeInTheDocument();
  });

  it('should show warning about irreversible action', () => {
    render(
      <SettlePaymentDialog
        open={true}
        onOpenChange={vi.fn()}
        balance={mockBalance}
        tripId="trip-1"
      />,
    );

    expect(
      screen.getByText(/This will mark all associated payments as settled/),
    ).toBeInTheDocument();
  });
});
