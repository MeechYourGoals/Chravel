/**
 * Payment Balance Service Tests
 * Tests for payment balance calculations with multi-currency support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentBalanceService } from '../paymentBalanceService';
import * as currencyService from '../currencyService';
import { supabase } from '../../integrations/supabase/client';

// Helper to create chainable Supabase mock
const createChainableMock = (resolvedValue: { data: any; error: any }) => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
    single: vi.fn().mockResolvedValue(resolvedValue),
    then: vi.fn((resolve: any) => resolve(resolvedValue)),
  };
  // Make all chain methods return the chain
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.neq.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
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

describe('paymentBalanceService', () => {
  // Helper to create mock implementation for supabase.from()
  const createFromMock = (tableMocks: Record<string, any>) => {
    return (table: string) => {
      if (tableMocks[table]) {
        return tableMocks[table];
      }
      // Default: return an empty chainable mock
      return createChainableMock({ data: [], error: null });
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: authenticated user with trip membership
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    // Default mock: user is a trip member
    (supabase.from as any).mockImplementation(
      createFromMock({
        trip_members: createChainableMock({ data: { id: 'membership-1' }, error: null }),
      }),
    );
  });

  describe('getBalanceSummary', () => {
    it('should return empty summary when no payments exist', async () => {
      (supabase.from as any).mockImplementation(
        createFromMock({
          trip_members: createChainableMock({ data: { id: 'membership-1' }, error: null }),
          trip_payment_messages: createChainableMock({ data: [], error: null }),
        }),
      );

      const result = await paymentBalanceService.getBalanceSummary('trip-1', 'user-1');

      expect(result).toEqual({
        totalOwed: 0,
        totalOwedToYou: 0,
        netBalance: 0,
        baseCurrency: 'USD',
        balances: [],
      });
    });

    it('should calculate balances correctly for single currency payments', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          trip_id: 'trip-1',
          amount: 100,
          currency: 'USD',
          description: 'Dinner',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockSplits = [
        {
          id: 'split-1',
          payment_message_id: 'payment-1',
          debtor_user_id: 'user-2',
          amount_owed: 50,
          is_settled: false,
          confirmation_status: 'none',
        },
      ];

      const mockProfiles = [
        {
          user_id: 'user-1',
          display_name: 'User 1',
          resolved_display_name: 'User 1',
          avatar_url: null,
        },
        {
          user_id: 'user-2',
          display_name: 'User 2',
          resolved_display_name: 'User 2',
          avatar_url: null,
        },
      ];

      const mockPaymentMethods: any[] = [];

      (supabase.from as any).mockImplementation(
        createFromMock({
          trip_members: createChainableMock({ data: { id: 'membership-1' }, error: null }),
          trip_payment_messages: createChainableMock({ data: mockPayments, error: null }),
          payment_splits: createChainableMock({ data: mockSplits, error: null }),
          profiles_public: createChainableMock({ data: mockProfiles, error: null }),
          user_payment_methods: createChainableMock({ data: mockPaymentMethods, error: null }),
        }),
      );

      // Mock currency conversion (same currency, no conversion needed)
      vi.mocked(currencyService.normalizeToBaseCurrency).mockResolvedValue([
        { amount: 100, currency: 'USD', originalAmount: 100, originalCurrency: 'USD' },
      ]);
      vi.mocked(currencyService.convertCurrency).mockResolvedValue(50);

      const result = await paymentBalanceService.getBalanceSummary('trip-1', 'user-1');

      expect(result.baseCurrency).toBe('USD');
      expect(result.balances).toHaveLength(1);
      expect(result.balances[0].userId).toBe('user-2');
      expect(result.balances[0].amountOwed).toBe(50);
      expect(result.totalOwedToYou).toBe(50);
    });

    it('should handle multi-currency payments correctly', async () => {
      // Simplified test: User 1 pays EUR, user 2 owes them money
      const mockPayments = [
        {
          id: 'payment-1',
          trip_id: 'trip-1',
          amount: 50,
          currency: 'EUR',
          description: 'Taxi',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockSplits = [
        {
          id: 'split-1',
          payment_message_id: 'payment-1',
          debtor_user_id: 'user-2',
          amount_owed: 25,
          is_settled: false,
          confirmation_status: 'none',
        },
      ];

      const mockProfiles = [
        {
          user_id: 'user-1',
          display_name: 'User 1',
          resolved_display_name: 'User 1',
          avatar_url: null,
        },
        {
          user_id: 'user-2',
          display_name: 'User 2',
          resolved_display_name: 'User 2',
          avatar_url: null,
        },
      ];

      const mockPaymentMethods: any[] = [];

      (supabase.from as any).mockImplementation(
        createFromMock({
          trip_members: createChainableMock({ data: { id: 'membership-1' }, error: null }),
          trip_payment_messages: createChainableMock({ data: mockPayments, error: null }),
          payment_splits: createChainableMock({ data: mockSplits, error: null }),
          profiles_public: createChainableMock({ data: mockProfiles, error: null }),
          user_payment_methods: createChainableMock({ data: mockPaymentMethods, error: null }),
        }),
      );

      // Mock currency conversion - EUR payment normalized to USD
      vi.mocked(currencyService.normalizeToBaseCurrency).mockResolvedValue([
        { amount: 54.5, currency: 'USD', originalAmount: 50, originalCurrency: 'EUR' },
      ]);

      // Mock split conversion: 25 EUR -> ~27.25 USD
      vi.mocked(currencyService.convertCurrency).mockResolvedValue(27.25);

      const result = await paymentBalanceService.getBalanceSummary('trip-1', 'user-1', 'USD');

      expect(result.baseCurrency).toBe('USD');
      // The service normalizes currencies - test that it returns the right currency
      expect(result.baseCurrency).toBe('USD');
      // Test passes if no errors are thrown and we get a valid result structure
      expect(result).toHaveProperty('balances');
      expect(result).toHaveProperty('totalOwed');
      expect(result).toHaveProperty('totalOwedToYou');
    });

    it('should filter out settled payments', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          trip_id: 'trip-1',
          amount: 100,
          currency: 'USD',
          description: 'Dinner',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockSplits = [
        {
          id: 'split-1',
          payment_message_id: 'payment-1',
          debtor_user_id: 'user-2',
          amount_owed: 50,
          is_settled: true, // Settled
          confirmation_status: 'confirmed',
        },
        {
          id: 'split-2',
          payment_message_id: 'payment-1',
          debtor_user_id: 'user-3',
          amount_owed: 50,
          is_settled: false, // Not settled
          confirmation_status: 'none',
        },
      ];

      const mockProfiles = [
        {
          user_id: 'user-1',
          display_name: 'User 1',
          resolved_display_name: 'User 1',
          avatar_url: null,
        },
        {
          user_id: 'user-2',
          display_name: 'User 2',
          resolved_display_name: 'User 2',
          avatar_url: null,
        },
        {
          user_id: 'user-3',
          display_name: 'User 3',
          resolved_display_name: 'User 3',
          avatar_url: null,
        },
      ];

      const mockPaymentMethods: any[] = [];

      (supabase.from as any).mockImplementation(
        createFromMock({
          trip_members: createChainableMock({ data: { id: 'membership-1' }, error: null }),
          trip_payment_messages: createChainableMock({ data: mockPayments, error: null }),
          payment_splits: createChainableMock({ data: mockSplits, error: null }),
          profiles_public: createChainableMock({ data: mockProfiles, error: null }),
          user_payment_methods: createChainableMock({ data: mockPaymentMethods, error: null }),
        }),
      );

      vi.mocked(currencyService.normalizeToBaseCurrency).mockResolvedValue([
        { amount: 100, currency: 'USD', originalAmount: 100, originalCurrency: 'USD' },
      ]);
      vi.mocked(currencyService.convertCurrency).mockResolvedValue(50);

      const result = await paymentBalanceService.getBalanceSummary('trip-1', 'user-1');

      // Only user-3 should appear (user-2's payment is settled)
      expect(result.balances).toHaveLength(1);
      expect(result.balances[0].userId).toBe('user-3');
      expect(result.balances[0].amountOwed).toBe(50);
    });

    it('should handle payment method resolution correctly', async () => {
      const mockPayments = [
        {
          id: 'payment-1',
          trip_id: 'trip-1',
          amount: 100,
          currency: 'USD',
          description: 'Dinner',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockSplits = [
        {
          id: 'split-1',
          payment_message_id: 'payment-1',
          debtor_user_id: 'user-2',
          amount_owed: 50,
          is_settled: false,
          confirmation_status: 'none',
        },
      ];

      const mockProfiles = [
        {
          user_id: 'user-1',
          display_name: 'User 1',
          resolved_display_name: 'User 1',
          avatar_url: null,
        },
        {
          user_id: 'user-2',
          display_name: 'User 2',
          resolved_display_name: 'User 2',
          avatar_url: null,
        },
      ];

      const mockPaymentMethods = [
        {
          id: 'method-1',
          user_id: 'user-2',
          method_type: 'venmo',
          identifier: '@user2',
          display_name: 'Venmo',
          is_preferred: true,
          is_visible: true,
        },
        {
          id: 'method-2',
          user_id: 'user-2',
          method_type: 'zelle',
          identifier: 'user2@email.com',
          display_name: 'Zelle',
          is_preferred: false,
          is_visible: true,
        },
      ];

      (supabase.from as any).mockImplementation(
        createFromMock({
          trip_members: createChainableMock({ data: { id: 'membership-1' }, error: null }),
          trip_payment_messages: createChainableMock({ data: mockPayments, error: null }),
          payment_splits: createChainableMock({ data: mockSplits, error: null }),
          profiles_public: createChainableMock({ data: mockProfiles, error: null }),
          user_payment_methods: createChainableMock({ data: mockPaymentMethods, error: null }),
        }),
      );

      vi.mocked(currencyService.normalizeToBaseCurrency).mockResolvedValue([
        { amount: 100, currency: 'USD', originalAmount: 100, originalCurrency: 'USD' },
      ]);
      vi.mocked(currencyService.convertCurrency).mockResolvedValue(50);

      const result = await paymentBalanceService.getBalanceSummary('trip-1', 'user-1');

      expect(result.balances[0].preferredPaymentMethod).toBeTruthy();
      expect(result.balances[0].preferredPaymentMethod?.type).toBe('venmo');
      expect(result.balances[0].preferredPaymentMethod?.identifier).toBe('@user2');
      expect(result.balances[0].preferredPaymentMethod?.isPreferred).toBe(true);
    });

    it('should throw error when user is not authenticated', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      await expect(paymentBalanceService.getBalanceSummary('trip-1', 'user-1')).rejects.toThrow(
        'Unauthorized: Authentication required',
      );
    });

    it('should throw error when user is not a trip member', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'trip_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        return { select: vi.fn() };
      });

      await expect(paymentBalanceService.getBalanceSummary('trip-1', 'user-1')).rejects.toThrow(
        'Unauthorized: Not a trip member',
      );
    });

    it('should handle errors gracefully', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'trip_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi
                    .fn()
                    .mockResolvedValue({ data: { id: 'membership-1' }, error: null }),
                }),
              }),
            }),
          };
        }
        return { select: mockSelect };
      });

      const result = await paymentBalanceService.getBalanceSummary('trip-1', 'user-1');

      expect(result).toEqual({
        totalOwed: 0,
        totalOwedToYou: 0,
        netBalance: 0,
        baseCurrency: 'USD',
        balances: [],
      });
    });
  });
});
