import { supabase } from '@/integrations/supabase/client';
import { PaymentMethod, PaymentMessage } from '../types/payments';
import { mockPayments } from '@/mockData/payments';
import { recordPaymentSplitPattern } from './chatAnalysisService';
import { isDemoTrip } from '@/utils/demoUtils';
import { toAppPayment } from '@/lib/adapters/paymentAdapter';
import { paymentsRepo } from '@/domain/trip/paymentsRepo';
import { membershipRepo } from '@/domain/trip/membershipRepo';
import { Invariants } from '@/domain/invariants';

interface MockPayment {
  id: string;
  trip_id: string;
  amount: number;
  currency: string;
  description: string;
  split_count: number;
  split_participants: string[];
  payment_methods: string[];
  created_by: string;
  is_settled: boolean;
  created_at: string;
  updated_at: string;
  version: number;
}

export const paymentService = {
  // User Payment Methods
  async getUserPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await supabase
        .from('user_payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(method => ({
        id: method.id,
        type: method.method_type as PaymentMethod['type'],
        identifier: method.identifier,
        displayName: method.display_name,
        isPreferred: method.is_preferred,
        isVisible: method.is_visible,
      }));
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  },

  async savePaymentMethod(userId: string, method: Omit<PaymentMethod, 'id'>): Promise<boolean> {
    try {
      const { error } = await supabase.from('user_payment_methods').insert({
        user_id: userId,
        method_type: method.type,
        identifier: method.identifier,
        display_name: method.displayName,
        is_preferred: method.isPreferred,
        is_visible: method.isVisible,
      });

      return !error;
    } catch (error) {
      console.error('Error saving payment method:', error);
      return false;
    }
  },

  async updatePaymentMethod(methodId: string, updates: Partial<PaymentMethod>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_payment_methods')
        .update({
          method_type: updates.type,
          identifier: updates.identifier,
          display_name: updates.displayName,
          is_preferred: updates.isPreferred,
          is_visible: updates.isVisible,
        })
        .eq('id', methodId);

      return !error;
    } catch (error) {
      console.error('Error updating payment method:', error);
      return false;
    }
  },

  async deletePaymentMethod(methodId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('user_payment_methods').delete().eq('id', methodId);

      return !error;
    } catch (error) {
      console.error('Error deleting payment method:', error);
      return false;
    }
  },

  // Trip Payment Messages - Error result type for better error handling
  async createPaymentMessage(
    tripId: string,
    userId: string,
    paymentData: {
      amount: number;
      currency: string;
      description: string;
      splitCount: number;
      splitParticipants: string[];
      paymentMethods: string[];
    },
  ): Promise<{ success: boolean; paymentId?: string; error?: { code: string; message: string } }> {
    try {
      // Validate session before attempting RPC
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.session) {
        return {
          success: false,
          error: {
            code: 'SESSION_EXPIRED',
            message: 'Your session has expired. Please sign in again.',
          },
        };
      }

      // Validate required fields
      if (!paymentData.amount || paymentData.amount <= 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Amount must be greater than zero.',
          },
        };
      }

      if (!paymentData.description?.trim()) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Description is required.',
          },
        };
      }

      if (!paymentData.splitParticipants || paymentData.splitParticipants.length === 0) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: 'Please select at least one participant.',
          },
        };
      }

      // 🔄 REFACTOR: Use TDAL (paymentsRepo) to create expense
      // This enforces invariants (valid members, amount sums) automatically.
      try {
        const paymentId = await paymentsRepo.createExpense(tripId, userId, {
          amount: paymentData.amount,
          currency: paymentData.currency,
          description: paymentData.description,
          splitParticipants: paymentData.splitParticipants,
          paymentMethods: paymentData.paymentMethods,
        });

        // Record payment split patterns for ML-based suggestions (non-blocking)
        if (paymentData.splitParticipants.length > 0) {
          recordPaymentSplitPattern(tripId, userId, paymentData.splitParticipants).catch(err => {
            console.debug('[paymentService] Failed to record split pattern:', err);
          });
        }

        return { success: true, paymentId };
      } catch (repoError: any) {
        // Handle TDAL/Invariant errors specifically
        console.error('[paymentService] TDAL error:', repoError);

        if (repoError.message?.includes('Invariant Violation')) {
           return {
             success: false,
             error: {
               code: 'INVARIANT_VIOLATION',
               message: repoError.message, // User-facing message from Invariant
             }
           };
        }

        // Map other known errors (RLS, Network)
        if (repoError.message?.includes('row-level security') || repoError.code === '42501') {
          return {
            success: false,
            error: {
              code: 'RLS_VIOLATION',
              message: 'You do not have permission to create payments for this trip.',
            },
          };
        }

        if (repoError.message?.includes('network') || repoError.message?.includes('fetch')) {
          return {
            success: false,
            error: {
              code: 'NETWORK_ERROR',
              message: 'Network error. Please check your connection and try again.',
            },
          };
        }

        throw repoError; // Re-throw unknown to catch block below
      }

    } catch (error) {
      console.error('[paymentService] Unexpected error creating payment:', error);
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'An unexpected error occurred.',
        },
      };
    }
  },

  async getTripPaymentMessages(tripId: string): Promise<PaymentMessage[]> {
    try {
      // Quick synchronous demo check — avoids the async secureStorageService round-trip.
      let isDemoMode = false;
      try {
        isDemoMode = localStorage.getItem('TRIPS_DEMO_VIEW') === 'app-preview';
      } catch {
        // localStorage unavailable (SSR/test) — fall through to DB path
      }

      if (isDemoMode && isDemoTrip(tripId)) {
        return mockPayments
          .filter(p => p.trip_id === tripId)
          .map((payment: MockPayment) => ({
            id: payment.id,
            tripId: payment.trip_id,
            messageId: null,
            amount: payment.amount,
            currency: payment.currency,
            description: payment.description,
            splitCount: payment.split_count,
            splitParticipants: payment.split_participants,
            paymentMethods: payment.payment_methods,
            createdBy: payment.created_by,
            createdAt: payment.created_at,
            isSettled: payment.is_settled,
          }));
      }

      // 🔄 REFACTOR: Use TDAL
      return await paymentsRepo.getExpenses(tripId);
    } catch (error) {
      console.error('Error fetching payment messages:', error);
      return [];
    }
  },

  // Payment Settlement
  async settlePayment(splitId: string, settlementMethod: string): Promise<boolean> {
    try {
      // 🔄 REFACTOR: Use TDAL
      // Check status first via Repo
      const split = await paymentsRepo.getSplitStatus(splitId);
      if (split.is_settled) {
          throw new Error('Payment has already been settled by another user.');
      }

      // Perform settlement via Repo
      await paymentsRepo.settleSplit(splitId, settlementMethod);

      // Legacy side effect: Update parent status (could be moved to Trigger/Edge Function ideally)
      // For now, we keep the service method helper as it handles business logic aggregation
      // but the atomic write is in Repo.
      // We need to fetch the payment_message_id from somewhere or change repo signature.
      // Since repo.settleSplit is atomic, we can just re-read or assume success.
      // To keep existing behavior of updating parent, we query parent ID:
      const { data } = await supabase
        .from('payment_splits')
        .select('payment_message_id')
        .eq('id', splitId)
        .single();

      if (data) {
        await this.updateParentPaymentSettledStatus(data.payment_message_id);
      }

      return true;
    } catch (error) {
      console.error('Error settling payment:', error);
      return false;
    }
  },

  // Unsettle a payment split (toggle back to unpaid)
  async unsettlePayment(splitId: string): Promise<boolean> {
    try {
      const { data: currentSplit, error: fetchError } = await supabase
        .from('payment_splits')
        .select('is_settled, payment_message_id')
        .eq('id', splitId)
        .single();

      if (fetchError) throw fetchError;

      if (!currentSplit.is_settled) {
        return true; // Already unsettled
      }

      // Mark split as unsettled
      const { error } = await supabase
        .from('payment_splits')
        .update({
          is_settled: false,
          settled_at: null,
          settlement_method: null,
        })
        .eq('id', splitId);

      if (error) return false;

      // Update parent payment settled status
      await this.updateParentPaymentSettledStatus(currentSplit.payment_message_id);

      return true;
    } catch (error) {
      console.error('Error unsettling payment:', error);
      return false;
    }
  },

  // Helper: Update parent payment's is_settled based on all splits
  async updateParentPaymentSettledStatus(paymentMessageId: string): Promise<void> {
    try {
      // Get all splits for this payment
      const { data: allSplits, error: splitsError } = await supabase
        .from('payment_splits')
        .select('is_settled')
        .eq('payment_message_id', paymentMessageId);

      if (splitsError || !allSplits) return;

      // Check if ALL splits are settled
      const allSettled = allSplits.length > 0 && allSplits.every(s => s.is_settled);

      // Update parent payment's is_settled flag
      await supabase
        .from('trip_payment_messages')
        .update({ is_settled: allSettled })
        .eq('id', paymentMessageId);
    } catch (error) {
      console.error('Error updating parent payment settled status:', error);
    }
  },

  // Update payment message (creator only)
  async updatePaymentMessage(
    paymentId: string,
    updates: { amount?: number; description?: string },
  ): Promise<boolean> {
    try {
      const updateData: Record<string, any> = {};
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.description !== undefined) updateData.description = updates.description;
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('trip_payment_messages')
        .update(updateData)
        .eq('id', paymentId);

      if (error) throw error;

      // If amount changed, update splits proportionally
      if (updates.amount !== undefined) {
        const { data: payment } = await supabase
          .from('trip_payment_messages')
          .select('split_count')
          .eq('id', paymentId)
          .single();

        if (payment) {
          const newSplitAmount = updates.amount / payment.split_count;
          await supabase
            .from('payment_splits')
            .update({ amount_owed: newSplitAmount })
            .eq('payment_message_id', paymentId);
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating payment message:', error);
      return false;
    }
  },

  // Delete payment message (creator only)
  async deletePaymentMessage(paymentId: string): Promise<boolean> {
    try {
      // First delete related splits
      await supabase.from('payment_splits').delete().eq('payment_message_id', paymentId);

      // Delete audit log entries
      await supabase.from('payment_audit_log').delete().eq('payment_message_id', paymentId);

      // Delete the payment message
      const { error } = await supabase.from('trip_payment_messages').delete().eq('id', paymentId);

      return !error;
    } catch (error) {
      console.error('Error deleting payment message:', error);
      return false;
    }
  },

  async getTripPaymentSummary(tripId: string): Promise<{
    totalExpenses: number;
    userBalances: { [userId: string]: number };
    settlementSuggestions: Array<{
      from: string;
      to: string;
      amount: number;
    }>;
  }> {
    try {
      const paymentMessages = await this.getTripPaymentMessages(tripId);

      const { data: splits, error } = await supabase
        .from('payment_splits')
        .select(
          `
          *,
          payment_message:trip_payment_messages!inner(trip_id, created_by, amount)
        `,
        )
        .eq('payment_message.trip_id', tripId);

      if (error) throw error;

      const userBalances: { [userId: string]: number } = {};
      let totalExpenses = 0;

      paymentMessages.forEach(payment => {
        totalExpenses += payment.amount;

        if (!userBalances[payment.createdBy]) {
          userBalances[payment.createdBy] = 0;
        }
        userBalances[payment.createdBy] += payment.amount;
      });

      splits.forEach((split: any) => {
        if (!userBalances[split.debtor_user_id]) {
          userBalances[split.debtor_user_id] = 0;
        }
        userBalances[split.debtor_user_id] -= parseFloat(split.amount_owed.toString());
      });

      const settlementSuggestions: Array<{ from: string; to: string; amount: number }> = [];
      const debtors = Object.entries(userBalances).filter(([_, balance]) => balance < 0);
      const creditors = Object.entries(userBalances).filter(([_, balance]) => balance > 0);

      debtors.forEach(([debtorId, debtorBalance]) => {
        creditors.forEach(([creditorId, creditorBalance]) => {
          if (Math.abs(debtorBalance) > 0 && creditorBalance > 0) {
            const amount = Math.min(Math.abs(debtorBalance), creditorBalance);
            settlementSuggestions.push({
              from: debtorId,
              to: creditorId,
              amount,
            });
          }
        });
      });

      return {
        totalExpenses,
        userBalances,
        settlementSuggestions,
      };
    } catch (error) {
      console.error('Error getting payment summary:', error);
      return {
        totalExpenses: 0,
        userBalances: {},
        settlementSuggestions: [],
      };
    }
  },
};
