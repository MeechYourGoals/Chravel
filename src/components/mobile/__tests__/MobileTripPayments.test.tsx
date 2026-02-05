import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock all external dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'test@test.com' } }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/hooks/useDemoMode', () => ({
  useDemoMode: () => ({ isDemoMode: false, isLoading: false }),
}));

vi.mock('@/hooks/useConsumerSubscription', () => ({
  useConsumerSubscription: () => ({ tier: 'free', upgradeToTier: vi.fn() }),
}));

vi.mock('@/services/hapticService', () => ({
  hapticService: { medium: vi.fn(), light: vi.fn() },
}));

vi.mock('@/utils/safeReload', () => ({
  safeReload: vi.fn(),
}));

vi.mock('@/services/demoModeService', () => ({
  demoModeService: {
    getMockMembers: vi.fn().mockReturnValue([]),
    getMockPayments: vi.fn().mockReturnValue([]),
    getSessionPayments: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('@/services/paymentService', () => ({
  paymentService: {
    getTripPaymentMessages: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/paymentBalanceService', () => ({
  paymentBalanceService: {
    getBalanceSummary: vi.fn().mockResolvedValue({
      totalOwed: 0,
      totalOwedToYou: 0,
      netBalance: 0,
      baseCurrency: 'USD',
      balances: [],
    }),
  },
}));

vi.mock('@/services/tripService', () => ({
  tripService: {
    getTripMembers: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/data/tripsData', () => ({
  getTripById: vi.fn().mockReturnValue(null),
}));

vi.mock('@/utils/avatarUtils', () => ({
  getConsistentAvatar: vi.fn().mockReturnValue('https://avatar.com/default.png'),
  getInitials: vi.fn().mockReturnValue('??'),
}));

vi.mock('./CreatePaymentModal', () => ({
  CreatePaymentModal: () => <div data-testid="create-payment-modal" />,
}));

import { MobileTripPayments } from '../MobileTripPayments';

describe('MobileTripPayments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(<MobileTripPayments tripId="test-trip-id" />);
    expect(screen.getByText('Loading payments...')).toBeInTheDocument();
  });

  it('should render the component with a tripId', () => {
    const { container } = render(<MobileTripPayments tripId="test-trip-id" />);
    expect(container).toBeTruthy();
  });

  it('should display spinner and loading text during load', () => {
    const { container } = render(<MobileTripPayments tripId="test-trip-id" />);
    // Verify the loading state includes the spinner animation
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
    expect(screen.getByText('Loading payments...')).toBeInTheDocument();
  });
});
