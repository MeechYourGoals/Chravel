/**
 * Payment Balance Service Tests
 * Tests for payment balance calculations with multi-currency support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentBalanceService } from '../paymentBalanceService';
import * as currencyService from '../currencyService';
import { supabase } from '../../integrations/supabase/client';

// Mock Supabase
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}));

// Mock currency service
vi.mock('../currencyService', () => ({
  normalizeToBaseCurrency: vi.fn(),
  convertCurrency: vi.fn()
}));

describe('paymentBalanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock: authenticated user with trip membership
    (supabase.auth.getUser as any).mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    });
    
    // Default mock: user is a trip member
    const mockMembershipCheck = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'membership-1' }, error: null })
          })
        })
      })
    });
    
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'trip_members') {
        return mockMembershipCheck();
      }
      // For other tables, return the original mock
      return {
        select: vi.fn()
      };
    });
  });

  describe('getBalanceSummary', () => {
    it('should return empty summary when no payments exist', async () => {
      // Mock trip_members check (membership validation)
      const mockMembershipSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'membership-1' }, error: null })
          })
        })
      });

      // Mock trip_payment_messages query
      const mockPaymentSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null })
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'trip_members') {
          return { select: mockMembershipSelect };
        }
        if (table === 'trip_payment_messages') {
          return { select: mockPaymentSelect };
        }
        return { select: vi.fn() };
      });

      const result = await paymentBalanceService.getBalanceSummary('trip-1', 'user-1');

      expect(result).toEqual({
        totalOwed: 0,
        totalOwedToYou: 0,
        netBalance: 0,
        baseCurrency: 'USD',
        balances: []
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
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockSplits = [
        {
          id: 'split-1',
          payment_message_id: 'payment-1',
          debtor_user_id: 'user-2',
          amount_owed: 50,
          is_settled: false,
          confirmation_status: 'none'
        }
      ];

      const mockProfiles = [
        { user_id: 'user-1', display_name: 'User 1', avatar_url: null },
        { user_id: 'user-2', display_name: 'User 2', avatar_url: null }
      ];

      const mockPaymentMethods: any[] = [];

      // Mock Supabase calls - need to handle trip_members check first
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'trip_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'membership-1' }, error: null })
                })
              })
            })
          };
        }
        
        // For other tables, use chained mocks
        const mockSelect = vi.fn()
          .mockReturnValueOnce({
            eq: vi.fn().mockResolvedValue({ data: mockPayments, error: null })
          })
          .mockReturnValueOnce({
            in: vi.fn().mockResolvedValue({ data: mockSplits, error: null })
          })
          .mockReturnValueOnce({
            in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null })
          })
          .mockReturnValueOnce({
            in: vi.fn().mockResolvedValue({ data: mockPaymentMethods, error: null })
          });
        
        return { select: mockSelect };
      });

      // Mock currency conversion (same currency, no conversion needed)
      vi.mocked(currencyService.normalizeToBaseCurrency).mockResolvedValue([
        { amount: 100, currency: 'USD', originalAmount: 100, originalCurrency: 'USD' }
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
      const mockPayments = [
        {
          id: 'payment-1',
          trip_id: 'trip-1',
          amount: 100,
          currency: 'USD',
          description: 'Dinner',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'payment-2',
          trip_id: 'trip-1',
          amount: 50,
          currency: 'EUR',
          description: 'Taxi',
          created_by: 'user-2',
          created_at: '2024-01-02T00:00:00Z'
        }
      ];

      const mockSplits = [
        {
          id: 'split-1',
          payment_message_id: 'payment-1',
          debtor_user_id: 'user-2',
          amount_owed: 50,
          is_settled: false,
          confirmation_status: 'none'
        },
        {
          id: 'split-2',
          payment_message_id: 'payment-2',
          debtor_user_id: 'user-1',
          amount_owed: 25,
          is_settled: false,
          confirmation_status: 'none'
        }
      ];

      const mockProfiles = [
        { user_id: 'user-1', display_name: 'User 1', avatar_url: null },
        { user_id: 'user-2', display_name: 'User 2', avatar_url: null }
      ];

      const mockPaymentMethods: any[] = [];

      // Mock Supabase calls
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          eq: vi.fn().mockResolvedValue({ data: mockPayments, error: null })
        })
        .mockReturnValueOnce({
          in: vi.fn().mockResolvedValue({ data: mockSplits, error: null })
        })
        .mockReturnValueOnce({
          in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null })
        })
        .mockReturnValueOnce({
          in: vi.fn().mockResolvedValue({ data: mockPaymentMethods, error: null })
        });

      (supabase.from as any).mockReturnValue({
        select: mockSelect
      });

      // Mock currency conversion
      // USD payment: 100 USD -> 100 USD (no conversion)
      // EUR payment: 50 EUR -> ~54.5 USD (assuming 1 EUR = 1.09 USD)
      vi.mocked(currencyService.normalizeToBaseCurrency).mockResolvedValue([
        { amount: 100, currency: 'USD', originalAmount: 100, originalCurrency: 'USD' },
        { amount: 54.5, currency: 'USD', originalAmount: 50, originalCurrency: 'EUR' }
      ]);

      // Mock split conversions
      // Split 1: 50 USD -> 50 USD (no conversion)
      // Split 2: 25 EUR -> ~27.25 USD
      vi.mocked(currencyService.convertCurrency)
        .mockResolvedValueOnce(50) // USD split, no conversion
        .mockResolvedValueOnce(27.25); // EUR split converted to USD

      const result = await paymentBalanceService.getBalanceSummary('trip-1', 'user-1', 'USD');

      expect(result.baseCurrency).toBe('USD');
      expect(result.balances).toHaveLength(1);
      
      // User 1 paid 50 USD (owed by user-2)
      // User 1 owes 27.25 USD (to user-2)
      // Net: user-2 owes user-1 22.75 USD
      expect(result.balances[0].amountOwed).toBeCloseTo(22.75, 2);
      expect(result.totalOwedToYou).toBeCloseTo(22.75, 2);
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
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockSplits = [
        {
          id: 'split-1',
          payment_message_id: 'payment-1',
          debtor_user_id: 'user-2',
          amount_owed: 50,
          is_settled: true, // Settled
          confirmation_status: 'confirmed'
        },
        {
          id: 'split-2',
          payment_message_id: 'payment-1',
          debtor_user_id: 'user-3',
          amount_owed: 50,
          is_settled: false, // Not settled
          confirmation_status: 'none'
        }
      ];

      const mockProfiles = [
        { user_id: 'user-1', display_name: 'User 1', avatar_url: null },
        { user_id: 'user-2', display_name: 'User 2', avatar_url: null },
        { user_id: 'user-3', display_name: 'User 3', avatar_url: null }
      ];

      const mockPaymentMethods: any[] = [];

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          eq: vi.fn().mockResolvedValue({ data: mockPayments, error: null })
        })
        .mockReturnValueOnce({
          in: vi.fn().mockResolvedValue({ data: mockSplits, error: null })
        })
        .mockReturnValueOnce({
          in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null })
        })
        .mockReturnValueOnce({
          in: vi.fn().mockResolvedValue({ data: mockPaymentMethods, error: null })
        });

      (supabase.from as any).mockReturnValue({
        select: mockSelect
      });

      vi.mocked(currencyService.normalizeToBaseCurrency).mockResolvedValue([
        { amount: 100, currency: 'USD', originalAmount: 100, originalCurrency: 'USD' }
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
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockSplits = [
        {
          id: 'split-1',
          payment_message_id: 'payment-1',
          debtor_user_id: 'user-2',
          amount_owed: 50,
          is_settled: false,
          confirmation_status: 'none'
        }
      ];

      const mockProfiles = [
        { user_id: 'user-1', display_name: 'User 1', avatar_url: null },
        { user_id: 'user-2', display_name: 'User 2', avatar_url: null }
      ];

      const mockPaymentMethods = [
        {
          id: 'method-1',
          user_id: 'user-2',
          method_type: 'venmo',
          identifier: '@user2',
          display_name: 'Venmo',
          is_preferred: true,
          is_visible: true
        },
        {
          id: 'method-2',
          user_id: 'user-2',
          method_type: 'zelle',
          identifier: 'user2@email.com',
          display_name: 'Zelle',
          is_preferred: false,
          is_visible: true
        }
      ];

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          eq: vi.fn().mockResolvedValue({ data: mockPayments, error: null })
        })
        .mockReturnValueOnce({
          in: vi.fn().mockResolvedValue({ data: mockSplits, error: null })
        })
        .mockReturnValueOnce({
          in: vi.fn().mockResolvedValue({ data: mockProfiles, error: null })
        })
        .mockReturnValueOnce({
          in: vi.fn().mockResolvedValue({ data: mockPaymentMethods, error: null })
        });

      (supabase.from as any).mockReturnValue({
        select: mockSelect
      });

      vi.mocked(currencyService.normalizeToBaseCurrency).mockResolvedValue([
        { amount: 100, currency: 'USD', originalAmount: 100, originalCurrency: 'USD' }
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
        error: { message: 'Not authenticated' }
      });

      await expect(
        paymentBalanceService.getBalanceSummary('trip-1', 'user-1')
      ).rejects.toThrow('Unauthorized: Authentication required');
    });

    it('should throw error when user is not a trip member', async () => {
      (supabase.auth.getUser as any).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'trip_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
                })
              })
            })
          };
        }
        return { select: vi.fn() };
      });

      await expect(
        paymentBalanceService.getBalanceSummary('trip-1', 'user-1')
      ).rejects.toThrow('Unauthorized: Not a trip member');
    });

    it('should handle errors gracefully', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Database error' } 
        })
      });

      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'trip_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'membership-1' }, error: null })
                })
              })
            })
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
        balances: []
      });
    });
  });
});
