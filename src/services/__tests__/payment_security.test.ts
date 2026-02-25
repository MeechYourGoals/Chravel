
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentBalanceService } from '../paymentBalanceService';
import { paymentService } from '../paymentService';
import * as currencyService from '../currencyService';
import { supabase } from '../../integrations/supabase/client';

// Helper to create chainable Supabase mock
const createChainableMock = (resolvedValue: { data: any; error: any }) => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
    single: vi.fn().mockResolvedValue(resolvedValue),
    then: vi.fn((resolve: any, reject: any) => {
      resolve(resolvedValue);
    }),
  };
  return chain;
};

// Mock Supabase
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
    },
  },
}));

// Mock currency service
vi.mock('../currencyService', () => ({
  normalizeToBaseCurrency: vi.fn(),
  convertCurrency: vi.fn(),
}));

describe('Payment Security Tests', () => {
  const mockUserId = 'user-1';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default auth mock
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: mockUserId } },
      error: null,
    });

    // Default currency mocks
    vi.mocked(currencyService.normalizeToBaseCurrency).mockResolvedValue([]);
    vi.mocked(currencyService.convertCurrency).mockResolvedValue(0);
  });

  describe('Authorization Scenarios', () => {

    it('Scenario 1: User A viewing User B\'s wallet in a shared trip (Success)', async () => {
      // Setup: Shared trip exists, RLS allows access
      const tripId = 'trip-shared';
      const userBId = 'user-2';

      const mockPayments = [{
        id: 'payment-1',
        trip_id: tripId,
        amount: 100,
        currency: 'USD',
        description: 'Shared Dinner',
        created_by: userBId, // User B created it
        created_at: new Date().toISOString(),
      }];

      const mockSplits = [{
        id: 'split-1',
        payment_message_id: 'payment-1',
        debtor_user_id: mockUserId, // User A owes User B
        amount_owed: 50,
        is_settled: false,
      }];

      const mockUserBWallet = [{
        id: 'wallet-1',
        user_id: userBId,
        method_type: 'venmo',
        identifier: '@user-b',
        is_preferred: true
      }];

      // Mock database responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'trip_members') return createChainableMock({ data: { id: 'membership-1' }, error: null });
        if (table === 'trip_payment_messages') return createChainableMock({ data: mockPayments, error: null });
        if (table === 'payment_splits') return createChainableMock({ data: mockSplits, error: null });
        if (table === 'profiles_public') return createChainableMock({ data: [{ user_id: userBId, display_name: 'User B' }], error: null });

        // This is the crucial check: user_payment_methods returns data because RLS allows it
        if (table === 'user_payment_methods') return createChainableMock({ data: mockUserBWallet, error: null });

        return createChainableMock({ data: [], error: null });
      });

      // Mocks for currency
      vi.mocked(currencyService.normalizeToBaseCurrency).mockResolvedValue([
        { amount: 100, currency: 'USD', originalAmount: 100, originalCurrency: 'USD' }
      ]);
      vi.mocked(currencyService.convertCurrency).mockResolvedValue(50);

      const result = await paymentBalanceService.getBalanceSummary(tripId, mockUserId);

      // Verification
      const userBBalance = result.balances.find(b => b.userId === userBId);
      expect(userBBalance).toBeDefined();
      expect(userBBalance?.preferredPaymentMethod).toEqual({
        id: 'wallet-1',
        type: 'venmo',
        identifier: '@user-b',
        displayName: undefined,
        isPreferred: true
      });
    });

    it('Scenario 2: User A viewing User C\'s wallet (No shared trip) (Empty/Error)', async () => {
      // Setup: User C is somehow in the list (maybe from an old payment) but RLS blocks access
      const tripId = 'trip-shared';
      const userCId = 'user-3';

      const mockPayments = [{
        id: 'payment-2',
        trip_id: tripId,
        amount: 100,
        currency: 'USD',
        description: 'Old Debt',
        created_by: userCId,
        created_at: new Date().toISOString(),
      }];

      const mockSplits = [{
        id: 'split-2',
        payment_message_id: 'payment-2',
        debtor_user_id: mockUserId,
        amount_owed: 50,
        is_settled: false,
      }];

      // Mock database responses
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'trip_members') return createChainableMock({ data: { id: 'membership-1' }, error: null });
        if (table === 'trip_payment_messages') return createChainableMock({ data: mockPayments, error: null });
        if (table === 'payment_splits') return createChainableMock({ data: mockSplits, error: null });
        if (table === 'profiles_public') return createChainableMock({ data: [{ user_id: userCId, display_name: 'User C' }], error: null });

        // RLS BLOCKS ACCESS: returns empty array or null
        if (table === 'user_payment_methods') return createChainableMock({ data: [], error: null });

        return createChainableMock({ data: [], error: null });
      });

      vi.mocked(currencyService.normalizeToBaseCurrency).mockResolvedValue([
        { amount: 100, currency: 'USD', originalAmount: 100, originalCurrency: 'USD' }
      ]);
      vi.mocked(currencyService.convertCurrency).mockResolvedValue(50);

      const result = await paymentBalanceService.getBalanceSummary(tripId, mockUserId);

      // Verification
      const userCBalance = result.balances.find(b => b.userId === userCId);
      expect(userCBalance).toBeDefined();
      // Should handle missing wallet gracefully
      expect(userCBalance?.preferredPaymentMethod).toBeNull();
    });

    it('Scenario 3: User A (member) viewing Pro trip payments (Filtered)', async () => {
      // Setup: Pro Trip. User A is member. User B and C have a transaction.
      // User A should NOT see B-C transaction if RLS works.
      const tripId = 'trip-pro';

      // In reality, Supabase returns only what you are allowed to see.
      // So we mock trip_payment_messages returning EMPTY for unauthorized messages.
      const mockPayments: any[] = [];

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'trip_members') return createChainableMock({ data: { id: 'membership-1' }, error: null });

        // RLS filters out payments where User A is not involved
        if (table === 'trip_payment_messages') return createChainableMock({ data: mockPayments, error: null });

        return createChainableMock({ data: [], error: null });
      });

      const result = await paymentBalanceService.getBalanceSummary(tripId, mockUserId);

      expect(result.balances).toHaveLength(0); // Should see nothing
    });

    it('Scenario 4: Rate limit error Handling', async () => {
      // Simulate rate limit error on Insert
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'user_payment_methods') {
          return createChainableMock({
            data: null,
            error: { message: 'Rate limit exceeded for user_payment_methods' }
          });
        }
        return createChainableMock({ data: [], error: null });
      });

      // Attempt to add a payment method
      const method = {
        type: 'venmo',
        identifier: '@test',
        displayName: 'My Venmo',
        isPreferred: true,
        isVisible: true
      };

      // savePaymentMethod returns boolean (false on error)
      const success = await paymentService.savePaymentMethod(mockUserId, method as any);

      expect(success).toBe(false);
    });
  });
});
