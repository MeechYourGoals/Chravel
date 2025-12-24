import { supabase } from '../integrations/supabase/client';
import { PaymentMethod } from '../types/payments';
import { normalizeToBaseCurrency, convertCurrency } from './currencyService';

export interface PersonalBalance {
  userId: string;
  userName: string;
  avatar?: string;
  amountOwed: number; // negative = you owe them, positive = they owe you
  amountOwedCurrency: string; // Base currency (normalized)
  preferredPaymentMethod: PaymentMethod | null;
  unsettledPayments: Array<{
    paymentId: string;
    description: string;
    amount: number;
    amountCurrency: string;
    date: string;
  }>;
  confirmationStatus?: 'none' | 'pending' | 'confirmed';
}

export interface BalanceSummary {
  totalOwed: number;
  totalOwedToYou: number;
  netBalance: number;
  baseCurrency: string; // Currency all amounts are normalized to
  balances: PersonalBalance[];
}

export const paymentBalanceService = {
  /**
   * Calculate personal balance summary for a user in a trip
   * Returns who owes what to whom with their preferred payment methods
   * Supports multi-currency by normalizing all amounts to USD
   */
  async getBalanceSummary(
    tripId: string, 
    userId: string, 
    baseCurrency: string = 'USD'
  ): Promise<BalanceSummary> {
    try {
      // Security: Verify current user is a trip member before accessing payment data
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error('Unauthorized: Authentication required');
      }

      const { data: membership, error: membershipError } = await supabase
        .from('trip_members')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (membershipError) {
        throw new Error(`Failed to verify trip membership: ${membershipError.message}`);
      }

      if (!membership) {
        throw new Error('Unauthorized: Not a trip member');
      }

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
          baseCurrency,
          balances: []
        };
      }

      // Fetch all payment splits for these payments
      const { data: paymentSplits, error: splitsError } = await supabase
        .from('payment_splits')
        .select('*, confirmation_status, confirmed_by, confirmed_at')
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
        .select('id, user_id, method_type, identifier, display_name, is_preferred, is_visible')
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

      // Normalize all payment amounts to base currency
      const amountsToNormalize = paymentMessages.map(payment => ({
        amount: parseFloat(payment.amount.toString()),
        currency: payment.currency || 'USD'
      }));

      const normalizedAmounts = await normalizeToBaseCurrency(amountsToNormalize, baseCurrency);
      const normalizedMap = new Map<string, number>();
      
      paymentMessages.forEach((payment, index) => {
        normalizedMap.set(payment.id, normalizedAmounts[index].amount);
      });

      // Build ledger: Map<userId, netAmount>
      const ledger = new Map<string, {
        netAmount: number;
        payments: Array<{ 
          paymentId: string; 
          description: string; 
          amount: number; 
          amountCurrency: string;
          date: string;
        }>;
        confirmationStatus: 'none' | 'pending' | 'confirmed';
      }>();

      // Initialize current user in ledger
      ledger.set(userId, { netAmount: 0, payments: [], confirmationStatus: 'none' });

      // Collect all conversions needed
      const conversionsNeeded: Array<{
        splitId: string;
        amount: number;
        currency: string;
        paymentId: string;
        debtorId: string;
        payerId: string;
        isDebtor: boolean;
      }> = [];

      // Add amounts for payments current user made (positive - they are owed)
      paymentMessages?.forEach(payment => {
        if (payment.created_by === userId) {
          const relevantSplits = paymentSplits?.filter(
            s => s.payment_message_id === payment.id && s.debtor_user_id !== userId
          ) || [];

          relevantSplits.forEach(split => {
            if (!split.is_settled) {
              conversionsNeeded.push({
                splitId: split.id,
                amount: parseFloat(split.amount_owed.toString()),
                currency: payment.currency || 'USD',
                paymentId: payment.id,
                debtorId: split.debtor_user_id,
                payerId: userId,
                isDebtor: false
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
            conversionsNeeded.push({
              splitId: split.id,
              amount: parseFloat(split.amount_owed.toString()),
              currency: payment.currency || 'USD',
              paymentId: payment.id,
              debtorId: userId,
              payerId: payment.created_by,
              isDebtor: true
            });
          }
        }
      });

      // Perform all conversions in parallel
      const conversionResults = await Promise.all(
        conversionsNeeded.map(async (conv) => {
          const normalizedAmount = conv.currency === baseCurrency
            ? conv.amount
            : await convertCurrency(conv.amount, conv.currency, baseCurrency);
          return { ...conv, normalizedAmount };
        })
      );

      // Process conversion results
      conversionResults.forEach(({ splitId, normalizedAmount, paymentId, debtorId, payerId, isDebtor }) => {
        const payment = paymentMessages?.find(m => m.id === paymentId);
        const split = paymentSplits?.find(s => s.id === splitId);
        if (!payment || !split) return;

        const confirmStatus = (split.confirmation_status as 'none' | 'pending' | 'confirmed') || 'none';
        const targetUserId = isDebtor ? payerId : debtorId;

        if (!ledger.has(targetUserId)) {
          ledger.set(targetUserId, { netAmount: 0, payments: [], confirmationStatus: confirmStatus });
        }
        const entry = ledger.get(targetUserId)!;
        
        if (isDebtor) {
          entry.netAmount -= normalizedAmount; // You owe them
        } else {
          entry.netAmount += normalizedAmount; // They owe you
        }
        
        entry.confirmationStatus = confirmStatus;
        entry.payments.push({
          paymentId: payment.id,
          description: payment.description,
          amount: isDebtor ? -normalizedAmount : normalizedAmount,
          amountCurrency: baseCurrency,
          date: payment.created_at
        });
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
          amountOwedCurrency: baseCurrency,
          preferredPaymentMethod: primaryMethod ? {
            id: primaryMethod.id,
            type: primaryMethod.method_type as PaymentMethod['type'],
            identifier: primaryMethod.identifier,
            displayName: primaryMethod.display_name || undefined,
            isPreferred: primaryMethod.is_preferred || false
          } : null,
          unsettledPayments: entry.payments,
          confirmationStatus: entry.confirmationStatus
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
        baseCurrency,
        balances: balances.filter(b => b.amountOwed !== 0) // Only show non-zero balances
      };
    } catch (error) {
      // Re-throw authorization errors - they should be handled by the caller
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        throw error;
      }
      
      console.error('Error calculating balance summary:', error);
      return {
        totalOwed: 0,
        totalOwedToYou: 0,
        netBalance: 0,
        baseCurrency,
        balances: []
      };
    }
  }
};
