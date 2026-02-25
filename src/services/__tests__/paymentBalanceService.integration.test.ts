/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentBalanceService } from '../paymentBalanceService';
import { createMockSupabaseClient, createQueryBuilderMock } from '@/__tests__/utils/supabaseMocks';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

vi.mock('../currencyService', () => ({
  normalizeToBaseCurrency: vi.fn((amount: number) => amount),
  convertCurrency: vi.fn((amount: number) => amount),
}));

describe('paymentBalanceService - Integration Tests', () => {
  const tripId = 'trip-123';
  const userId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: authenticated user with trip membership
    const mockSupabase = vi.mocked(supabase);
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
  });

  describe('getBalanceSummary', () => {
    it('should calculate balances correctly for split payments', async () => {
      const mockSupabase = vi.mocked(supabase);

      // Mock payment messages
      const paymentMessages = [
        {
          id: 'payment-1',
          trip_id: tripId,
          description: 'Hotel booking',
          amount: 300,
          amount_currency: 'USD',
          created_by: 'user-123',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          id: 'payment-2',
          trip_id: tripId,
          description: 'Restaurant',
          amount: 100,
          amount_currency: 'USD',
          created_by: 'user-456',
          created_at: '2024-01-01T12:00:00Z',
        },
      ];

      // Mock payment splits
      const paymentSplits = [
        {
          id: 'split-1',
          payment_message_id: 'payment-1',
          debtor_user_id: 'user-123',
          amount: 150,
          amount_currency: 'USD',
          confirmation_status: 'none',
          confirmed_by: null,
          confirmed_at: null,
        },
        {
          id: 'split-2',
          payment_message_id: 'payment-1',
          debtor_user_id: 'user-456',
          amount: 150,
          amount_currency: 'USD',
          confirmation_status: 'none',
          confirmed_by: null,
          confirmed_at: null,
        },
        {
          id: 'split-3',
          payment_message_id: 'payment-2',
          debtor_user_id: 'user-123',
          amount: 50,
          amount_currency: 'USD',
          confirmation_status: 'none',
          confirmed_by: null,
          confirmed_at: null,
        },
        {
          id: 'split-4',
          payment_message_id: 'payment-2',
          debtor_user_id: 'user-456',
          amount: 50,
          amount_currency: 'USD',
          confirmation_status: 'none',
          confirmed_by: null,
          confirmed_at: null,
        },
      ];

      // Mock profiles
      const profiles = [
        {
          user_id: 'user-123',
          display_name: 'User 1',
          avatar_url: null,
        },
        {
          user_id: 'user-456',
          display_name: 'User 2',
          avatar_url: null,
        },
      ];

      // Mock payment methods
      const paymentMethods: any[] = [];

      // Setup mocks
      mockSupabase.from = vi.fn((table: string) => {
        const builder = createQueryBuilderMock();
        if (table === 'trip_members') {
          // Mock membership check
          builder.select.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'membership-1' }, error: null }),
            }),
          });
        } else if (table === 'trip_payment_messages') {
          builder.selectReturn.mockResolvedValue({ data: paymentMessages, error: null });
        } else if (table === 'payment_splits') {
          builder.in.mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: paymentSplits, error: null }),
          } as any);
        } else if (table === 'profiles') {
          builder.in.mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: profiles, error: null }),
          } as any);
        } else if (table === 'user_payment_methods') {
          builder.in.mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: paymentMethods, error: null }),
          } as any);
        }
        return builder as any;
      });

      const result = await paymentBalanceService.getBalanceSummary(tripId, userId);

      // User 123 paid $300 (hotel $300), owes $200 (hotel $150 + restaurant $50)
      // Net: $300 - $200 = $100 owed to user 123
      // User 456 paid $100 (restaurant), owes $150 (hotel)
      // Net: $100 - $150 = -$50 (user 456 owes user 123 $50)

      expect(result.baseCurrency).toBe('USD');
      expect(result.balances).toHaveLength(1); // Only user-456 in balances (user-123 is the viewer)
      expect(result.balances[0].userId).toBe('user-456');
      expect(result.balances[0].amountOwed).toBeLessThan(0); // User 456 owes money
    });

    it('should return empty balances when no payments exist', async () => {
      const mockSupabase = vi.mocked(supabase);

      mockSupabase.from = vi.fn((table: string) => {
        const builder = createQueryBuilderMock();
        if (table === 'trip_members') {
          builder.select.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'membership-1' }, error: null }),
            }),
          });
        } else if (table === 'trip_payment_messages') {
          builder.selectReturn.mockResolvedValue({ data: [], error: null });
        }
        return builder as any;
      });

      const result = await paymentBalanceService.getBalanceSummary(tripId, userId);

      expect(result.totalOwed).toBe(0);
      expect(result.totalOwedToYou).toBe(0);
      expect(result.netBalance).toBe(0);
      expect(result.balances).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      const mockSupabase = vi.mocked(supabase);
      const error = new Error('Database error');

      mockSupabase.from = vi.fn((table: string) => {
        const builder = createQueryBuilderMock();
        if (table === 'trip_members') {
          builder.select.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'membership-1' }, error: null }),
            }),
          });
        } else if (table === 'trip_payment_messages') {
          builder.selectReturn.mockResolvedValue({ data: null, error });
        }
        return builder as any;
      });

      await expect(paymentBalanceService.getBalanceSummary(tripId, userId)).rejects.toThrow(
        'Database error',
      );
    });
  });
});
