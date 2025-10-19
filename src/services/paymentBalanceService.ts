import { supabase } from '../integrations/supabase/client';
import { PaymentMethod } from '../types/payments';

export interface PersonalBalance {
  userId: string;
  userName: string;
  avatar?: string;
  amountOwed: number; // negative = you owe them, positive = they owe you
  preferredPaymentMethod: PaymentMethod | null;
  unsettledPayments: Array<{
    paymentId: string;
    description: string;
    amount: number;
    date: string;
  }>;
}

export interface BalanceSummary {
  totalOwed: number;
  totalOwedToYou: number;
  netBalance: number;
  balances: PersonalBalance[];
}

export const paymentBalanceService = {
  /**
   * Calculate personal balance summary for a user in a trip
   * Returns who owes what to whom with their preferred payment methods
   */
  async getBalanceSummary(tripId: string, userId: string): Promise<BalanceSummary> {
    try {
      // Fetch all payment messages for this trip
      const { data: paymentMessages, error: messagesError } = await supabase
        .from('trip_payment_messages')
        .select('*')
        .eq('trip_id', tripId);

      if (messagesError) throw messagesError;

      // Early return if no payments
      if (!paymentMessages || paymentMessages.length === 0) {
        return {
          totalOwed: 0,
          totalOwedToYou: 0,
          netBalance: 0,
          balances: []
        };
      }

      // Fetch all payment splits for these payments
      const { data: paymentSplits, error: splitsError } = await supabase
        .from('payment_splits')
        .select('*')
        .in('payment_message_id', paymentMessages?.map(m => m.id) || []);

      if (splitsError) throw splitsError;

      // Fetch user profiles for all involved users
      const allUserIds = new Set<string>();
      paymentMessages?.forEach(m => allUserIds.add(m.created_by));
      paymentSplits?.forEach(s => allUserIds.add(s.debtor_user_id));

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', Array.from(allUserIds));

      if (profilesError) throw profilesError;

      // Fetch all payment methods for all users
      const { data: paymentMethods, error: methodsError } = await supabase
        .from('user_payment_methods')
        .select('*')
        .in('user_id', Array.from(allUserIds));

      if (methodsError) throw methodsError;

      // Helper to get primary payment method
      const getPrimaryMethod = (methods: PaymentMethod[]) => {
        if (!methods || methods.length === 0) return null;
        
        // First check for preferred
        const preferred = methods.find(m => m.is_preferred);
        if (preferred) return preferred;
        
        // Then by priority order
        const priority = ['venmo', 'cashapp', 'zelle', 'paypal', 'applecash', 'cash', 'other'];
        const sorted = [...methods].sort((a, b) => {
          const aIdx = priority.indexOf(a.method_type);
          const bIdx = priority.indexOf(b.method_type);
          return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
        });
        
        return sorted[0];
      };

      // Build ledger: Map<userId, netAmount>
      const ledger = new Map<string, {
        netAmount: number;
        payments: Array<{ paymentId: string; description: string; amount: number; date: string }>;
      }>();

      // Initialize current user in ledger
      ledger.set(userId, { netAmount: 0, payments: [] });

      // Add amounts for payments current user made (positive - they are owed)
      paymentMessages?.forEach(payment => {
        if (payment.created_by === userId) {
          // For each split participant (excluding payer), they owe the current user
          const relevantSplits = paymentSplits?.filter(
            s => s.payment_message_id === payment.id && s.debtor_user_id !== userId
          ) || [];

          relevantSplits.forEach(split => {
            if (!split.is_settled) {
              const debtorId = split.debtor_user_id;
              if (!ledger.has(debtorId)) {
                ledger.set(debtorId, { netAmount: 0, payments: [] });
              }
              const entry = ledger.get(debtorId)!;
              entry.netAmount += split.amount_owed; // They owe you
              entry.payments.push({
                paymentId: payment.id,
                description: payment.description,
                amount: split.amount_owed,
                date: payment.created_at
              });
            }
          });
        }
      });

      // Subtract amounts current user owes (negative - they owe others)
      paymentSplits?.forEach(split => {
        if (split.debtor_user_id === userId && !split.is_settled) {
          const payment = paymentMessages?.find(m => m.id === split.payment_message_id);
          if (payment) {
            const payerId = payment.created_by;
            if (!ledger.has(payerId)) {
              ledger.set(payerId, { netAmount: 0, payments: [] });
            }
            const entry = ledger.get(payerId)!;
            entry.netAmount -= split.amount_owed; // You owe them
            entry.payments.push({
              paymentId: payment.id,
              description: payment.description,
              amount: -split.amount_owed,
              date: payment.created_at
            });
          }
        }
      });

      // Build PersonalBalance array
      const balances: PersonalBalance[] = [];
      let totalOwed = 0;
      let totalOwedToYou = 0;

      ledger.forEach((entry, personUserId) => {
        if (personUserId === userId) return; // Skip self

        const profile = profiles?.find(p => p.user_id === personUserId);
        const userMethods = paymentMethods?.filter(m => m.user_id === personUserId) || [];
        const primaryMethod = getPrimaryMethod(userMethods.map(m => ({
          ...m,
          type: m.method_type as PaymentMethod['type']
        })));

        balances.push({
          userId: personUserId,
          userName: profile?.display_name || 'Unknown User',
          avatar: profile?.avatar_url,
          amountOwed: entry.netAmount,
          preferredPaymentMethod: primaryMethod ? {
            id: primaryMethod.id,
            type: primaryMethod.method_type as PaymentMethod['type'],
            identifier: primaryMethod.identifier,
            displayName: primaryMethod.display_name || undefined,
            isPreferred: primaryMethod.is_preferred || false
          } : null,
          unsettledPayments: entry.payments
        });

        // Calculate totals
        if (entry.netAmount < 0) {
          totalOwed += Math.abs(entry.netAmount);
        } else if (entry.netAmount > 0) {
          totalOwedToYou += entry.netAmount;
        }
      });

      // Sort by amount owed (descending)
      balances.sort((a, b) => a.amountOwed - b.amountOwed);

      return {
        totalOwed,
        totalOwedToYou,
        netBalance: totalOwedToYou - totalOwed,
        balances: balances.filter(b => b.amountOwed !== 0) // Only show non-zero balances
      };
    } catch (error) {
      console.error('Error calculating balance summary:', error);
      return {
        totalOwed: 0,
        totalOwedToYou: 0,
        netBalance: 0,
        balances: []
      };
    }
  }
};
