import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 0,
        },
      },
    });
    vi.clearAllMocks();
  });

  it('should render the component with a tripId', async () => {
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MobileTripPayments tripId="test-trip-id" />
      </QueryClientProvider>
    );
    expect(container).toBeTruthy();
    // Use findByText to handle potential async loading
    expect(await screen.findByText(/payments/i)).toBeInTheDocument();
  });

  it('should display loading text or content', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MobileTripPayments tripId="test-trip-id" />
      </QueryClientProvider>
    );

    // It will either be "Loading payments..." or "No payments yet" depending on how fast mocks resolve
    const loadingOrContent = await screen.findByText(/payments/i);
    expect(loadingOrContent).toBeInTheDocument();
  });
});
