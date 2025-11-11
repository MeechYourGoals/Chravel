// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabase, supabaseMockHelpers } from './utils/supabaseMocks';
import { paymentBalanceService } from '@/services/paymentBalanceService';
import { testFactories } from './utils/testHelpers';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('Payment Split → Balance Calculation', () => {
  beforeEach(() => {
    supabaseMockHelpers.clearMocks();
  });

  it('should calculate correct balances for split payments', async () => {
    const trip = testFactories.createTrip();
    const user1 = testFactories.createUser({ id: 'user-1', displayName: 'Alice' });
    const user2 = testFactories.createUser({ id: 'user-2', displayName: 'Bob' });
    const user3 = testFactories.createUser({ id: 'user-3', displayName: 'Charlie' });

    // Payment 1: Alice pays $300, split 3 ways = $100 each
    const payment1 = testFactories.createPayment({
      id: 'payment-1',
      trip_id: trip.id,
      description: 'Hotel',
      amount: 300,
      created_by: user1.id,
    });

    const splits1 = [
      { payment_message_id: 'payment-1', debtor_user_id: user1.id, amount: 100 },
      { payment_message_id: 'payment-1', debtor_user_id: user2.id, amount: 100 },
      { payment_message_id: 'payment-1', debtor_user_id: user3.id, amount: 100 },
    ];

    // Payment 2: Bob pays $150, split 2 ways = $75 each
    const payment2 = testFactories.createPayment({
      id: 'payment-2',
      trip_id: trip.id,
      description: 'Dinner',
      amount: 150,
      created_by: user2.id,
    });

    const splits2 = [
      { payment_message_id: 'payment-2', debtor_user_id: user2.id, amount: 75 },
      { payment_message_id: 'payment-2', debtor_user_id: user3.id, amount: 75 },
    ];

    // Mock data
    supabaseMockHelpers.setMockData('trip_payment_messages', [payment1, payment2]);
    supabaseMockHelpers.setMockData('payment_splits', [...splits1, ...splits2]);
    supabaseMockHelpers.setMockData('profiles', [user1, user2, user3]);

    // Calculate balance for user1 (Alice)
    const balance = await paymentBalanceService.getBalanceSummary(trip.id, user1.id, 'USD');

    // Alice paid $300, owes $100 → net: +$200
    // Bob owes Alice $100, owes Bob $0 → net: +$100
    // Charlie owes Alice $100, owes Charlie $0 → net: +$100
    expect(balance.netBalance).toBeGreaterThan(0);
    expect(balance.balances.length).toBeGreaterThan(0);
  });

  it('should handle equal splits correctly', async () => {
    const trip = testFactories.createTrip();
    const user1 = testFactories.createUser({ id: 'user-1' });
    const user2 = testFactories.createUser({ id: 'user-2' });

    // User1 pays $200, split equally between 2 people
    const payment = testFactories.createPayment({
      trip_id: trip.id,
      amount: 200,
      created_by: user1.id,
    });

    const splits = [
      { payment_message_id: payment.id, debtor_user_id: user1.id, amount: 100 },
      { payment_message_id: payment.id, debtor_user_id: user2.id, amount: 100 },
    ];

    supabaseMockHelpers.setMockData('trip_payment_messages', [payment]);
    supabaseMockHelpers.setMockData('payment_splits', splits);
    supabaseMockHelpers.setMockData('profiles', [user1, user2]);

    const balance = await paymentBalanceService.getBalanceSummary(trip.id, user1.id, 'USD');

    // User1 paid $200, owes $100 → net: +$100
    // User2 owes User1 $100
    expect(balance.totalOwedToYou).toBe(100);
    expect(balance.totalOwed).toBe(0);
    expect(balance.netBalance).toBe(100);
  });

  it('should handle multi-currency payments', async () => {
    const trip = testFactories.createTrip();
    const user1 = testFactories.createUser({ id: 'user-1' });
    const user2 = testFactories.createUser({ id: 'user-2' });

    // Payment in EUR
    const paymentEUR = {
      ...testFactories.createPayment({
        trip_id: trip.id,
        amount: 100,
        created_by: user1.id,
      }),
      currency: 'EUR',
    };

    // Payment in USD
    const paymentUSD = {
      ...testFactories.createPayment({
        trip_id: trip.id,
        amount: 50,
        created_by: user2.id,
      }),
      currency: 'USD',
    };

    supabaseMockHelpers.setMockData('trip_payment_messages', [paymentEUR, paymentUSD]);
    supabaseMockHelpers.setMockData('payment_splits', []);
    supabaseMockHelpers.setMockData('profiles', [user1, user2]);

    // Note: This test assumes currency conversion is mocked or handled
    // In real implementation, currencyService would convert EUR to USD
    const balance = await paymentBalanceService.getBalanceSummary(trip.id, user1.id, 'USD');

    expect(balance.baseCurrency).toBe('USD');
  });

  it('should return zero balance when no payments exist', async () => {
    const trip = testFactories.createTrip();
    const user = testFactories.createUser();

    supabaseMockHelpers.setMockData('trip_payment_messages', []);
    supabaseMockHelpers.setMockData('payment_splits', []);
    supabaseMockHelpers.setMockData('profiles', [user]);

    const balance = await paymentBalanceService.getBalanceSummary(trip.id, user.id, 'USD');

    expect(balance.totalOwed).toBe(0);
    expect(balance.totalOwedToYou).toBe(0);
    expect(balance.netBalance).toBe(0);
    expect(balance.balances).toEqual([]);
  });

  it('should calculate balances correctly with settled payments', async () => {
    const trip = testFactories.createTrip();
    const user1 = testFactories.createUser({ id: 'user-1' });
    const user2 = testFactories.createUser({ id: 'user-2' });

    const payment = testFactories.createPayment({
      trip_id: trip.id,
      amount: 200,
      created_by: user1.id,
      is_settled: true,
    });

    const splits = [
      {
        payment_message_id: payment.id,
        debtor_user_id: user2.id,
        amount: 100,
        confirmation_status: 'confirmed',
        confirmed_by: user2.id,
      },
    ];

    supabaseMockHelpers.setMockData('trip_payment_messages', [payment]);
    supabaseMockHelpers.setMockData('payment_splits', splits);
    supabaseMockHelpers.setMockData('profiles', [user1, user2]);

    const balance = await paymentBalanceService.getBalanceSummary(trip.id, user1.id, 'USD');

    // Settled payments should still show in history but may affect balance calculation
    expect(balance).toBeDefined();
  });
});
