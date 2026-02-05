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
      eq: vi.fn().mockReturnThis(),
    }),
  },
}));

// Mock toast
vi.mock('../../components/ui/use-toast', () => ({
  toast: vi.fn(),
}));

// Mock haptics
vi.mock('@/native/haptics', () => ({
  success: vi.fn().mockResolvedValue(undefined),
}));

import { ConfirmPaymentDialog } from '../ConfirmPaymentDialog';

const mockBalance = {
  userId: 'other-user-1',
  userName: 'Jane Doe',
  avatar: 'https://avatar.com/jane.png',
  amountOwed: -50.0,
  amountOwedCurrency: 'USD',
  preferredPaymentMethod: null,
  unsettledPayments: [],
};

describe('ConfirmPaymentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dialog with payment details when open', () => {
    render(
      <ConfirmPaymentDialog
        open={true}
        onOpenChange={vi.fn()}
        balance={mockBalance}
        tripId="trip-1"
      />,
    );

    expect(screen.getByText('Confirm Payment Received')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('$50.00')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <ConfirmPaymentDialog
        open={false}
        onOpenChange={vi.fn()}
        balance={mockBalance}
        tripId="trip-1"
      />,
    );

    expect(screen.queryByText('Confirm Payment Received')).not.toBeInTheDocument();
  });

  it('should call onOpenChange when Leave Pending is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <ConfirmPaymentDialog
        open={true}
        onOpenChange={onOpenChange}
        balance={mockBalance}
        tripId="trip-1"
      />,
    );

    const leavePendingButton = screen.getByText('Leave Pending');
    await user.click(leavePendingButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('should show preferred payment method when available', () => {
    const balanceWithMethod = {
      ...mockBalance,
      preferredPaymentMethod: { type: 'venmo' as const, details: '@janedoe' },
    };

    render(
      <ConfirmPaymentDialog
        open={true}
        onOpenChange={vi.fn()}
        balance={balanceWithMethod}
        tripId="trip-1"
      />,
    );

    // The component uses CSS capitalize on the type string
    expect(screen.getByText('venmo')).toBeInTheDocument();
  });

  it('should have Confirm Received button', () => {
    render(
      <ConfirmPaymentDialog
        open={true}
        onOpenChange={vi.fn()}
        balance={mockBalance}
        tripId="trip-1"
      />,
    );

    expect(screen.getByText('Confirm Received')).toBeInTheDocument();
  });
});
