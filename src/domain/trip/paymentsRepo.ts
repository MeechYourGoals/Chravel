import { supabase } from '@/integrations/supabase/client';
import { PaymentMessage } from '@/types/payments';
import { toAppPayment } from '@/lib/adapters/paymentAdapter';
import { Invariants } from '../invariants';
import { membershipRepo } from './membershipRepo';

/**
 * Payments Repository (TDAL)
 *
 * Single Source of Truth for Expenses and Splits.
 */
export const paymentsRepo = {
  /**
   * Get all expenses for a trip.
   */
  async getExpenses(tripId: string): Promise<PaymentMessage[]> {
    const { data, error } = await supabase
      .from('trip_payment_messages')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data.map(toAppPayment);
  },

  /**
   * Create an expense with splits.
   * Enforces Invariants: Valid participants, Amount checksum.
   */
  async createExpense(
    tripId: string,
    userId: string,
    data: {
      amount: number;
      currency: string;
      description: string;
      splitParticipants: string[]; // User IDs
      paymentMethods: string[];
    }
  ): Promise<string> {
    // 1. Fetch Effective Members to validate participants
    const members = await membershipRepo.getEffectiveMembersForPayments(tripId);

    // 2. Enforce Invariants
    Invariants.Payments.assertValidSplitParticipants(data.splitParticipants, members);

    // 3. Call RPC (which handles the transactional insert of message + splits)
    const { data: paymentId, error } = await supabase.rpc('create_payment_with_splits_v2', {
        p_trip_id: tripId,
        p_amount: data.amount,
        p_currency: data.currency,
        p_description: data.description,
        p_split_count: data.splitParticipants.length,
        p_split_participants: data.splitParticipants,
        p_payment_methods: data.paymentMethods,
        p_created_by: userId,
    });

    if (error) throw error;
    return paymentId;
  },

  /**
   * Get settlement status for a specific split.
   */
  async getSplitStatus(splitId: string) {
      const { data, error } = await supabase
        .from('payment_splits')
        .select('is_settled, settled_at')
        .eq('id', splitId)
        .single();

      if (error) throw error;
      return data;
  },

  /**
   * Mark a split as settled.
   */
  async settleSplit(splitId: string, method: string): Promise<void> {
    const { error } = await supabase
      .from('payment_splits')
      .update({
          is_settled: true,
          settled_at: new Date().toISOString(),
          settlement_method: method
      })
      .eq('id', splitId);

    if (error) throw error;
  }
};
