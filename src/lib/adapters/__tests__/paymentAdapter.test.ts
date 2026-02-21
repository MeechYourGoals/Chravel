import { describe, it, expect } from 'vitest';
import { toAppPayment, toDbPaymentInsert } from '../paymentAdapter';
import type { Database } from '../../../integrations/supabase/types';

type PaymentRow = Database['public']['Tables']['trip_payment_messages']['Row'];

const baseRow: PaymentRow = {
  id: 'pay-1',
  trip_id: 'trip-1',
  message_id: 'msg-1',
  amount: 150.5,
  currency: 'USD',
  description: 'Dinner split',
  split_count: 3,
  split_participants: ['user-a', 'user-b', 'user-c'],
  payment_methods: ['venmo', 'cash'],
  created_by: 'user-a',
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  is_settled: false,
  version: 1,
};

describe('paymentAdapter', () => {
  describe('toAppPayment', () => {
    it('maps snake_case DB fields to camelCase app fields', () => {
      const result = toAppPayment(baseRow);

      expect(result.id).toBe('pay-1');
      expect(result.tripId).toBe('trip-1');
      expect(result.messageId).toBe('msg-1');
      expect(result.amount).toBe(150.5);
      expect(result.currency).toBe('USD');
      expect(result.description).toBe('Dinner split');
      expect(result.splitCount).toBe(3);
      expect(result.createdBy).toBe('user-a');
      expect(result.createdAt).toBe('2026-01-15T10:00:00Z');
    });

    it('converts Json split_participants to string[]', () => {
      const result = toAppPayment(baseRow);
      expect(result.splitParticipants).toEqual(['user-a', 'user-b', 'user-c']);
    });

    it('converts Json payment_methods to string[]', () => {
      const result = toAppPayment(baseRow);
      expect(result.paymentMethods).toEqual(['venmo', 'cash']);
    });

    it('defaults non-array Json fields to empty array', () => {
      const row: PaymentRow = {
        ...baseRow,
        split_participants: 'not-an-array' as any,
        payment_methods: null as any,
      };
      const result = toAppPayment(row);
      expect(result.splitParticipants).toEqual([]);
      expect(result.paymentMethods).toEqual([]);
    });

    it('coerces null is_settled to false', () => {
      const row: PaymentRow = { ...baseRow, is_settled: null };
      const result = toAppPayment(row);
      expect(result.isSettled).toBe(false);
    });

    it('preserves boolean is_settled values', () => {
      expect(toAppPayment({ ...baseRow, is_settled: true }).isSettled).toBe(true);
      expect(toAppPayment({ ...baseRow, is_settled: false }).isSettled).toBe(false);
    });

    it('handles null message_id', () => {
      const row: PaymentRow = { ...baseRow, message_id: null };
      const result = toAppPayment(row);
      expect(result.messageId).toBeNull();
    });
  });

  describe('toDbPaymentInsert', () => {
    it('maps camelCase app data to snake_case DB fields', () => {
      const result = toDbPaymentInsert('trip-1', 'user-a', {
        amount: 100,
        description: 'Uber ride',
        splitCount: 2,
        splitParticipants: ['user-a', 'user-b'],
        paymentMethods: ['venmo'],
      });

      expect(result.trip_id).toBe('trip-1');
      expect(result.created_by).toBe('user-a');
      expect(result.amount).toBe(100);
      expect(result.description).toBe('Uber ride');
      expect(result.split_count).toBe(2);
    });

    it('defaults currency to USD', () => {
      const result = toDbPaymentInsert('trip-1', 'user-a', {
        amount: 50,
        description: 'Coffee',
        splitCount: 1,
      });
      expect(result.currency).toBe('USD');
    });

    it('defaults optional arrays to empty', () => {
      const result = toDbPaymentInsert('trip-1', 'user-a', {
        amount: 50,
        description: 'Coffee',
        splitCount: 1,
      });
      expect(result.split_participants).toEqual([]);
      expect(result.payment_methods).toEqual([]);
    });
  });
});
