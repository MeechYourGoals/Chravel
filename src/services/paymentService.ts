import { supabase } from '@/integrations/supabase/client';
import { PaymentMethod, PaymentMessage, PaymentSplit } from '../types/payments';
import { demoModeService } from './demoModeService';
import { mockPayments } from '@/mockData/payments';
import { recordPaymentSplitPattern } from './chatAnalysisService';

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
        isVisible: method.is_visible
      }));
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      return [];
    }
  },

  async savePaymentMethod(userId: string, method: Omit<PaymentMethod, 'id'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_payment_methods')
        .insert({
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
      const { error } = await supabase
        .from('user_payment_methods')
        .delete()
        .eq('id', methodId);

      return !error;
    } catch (error) {
      console.error('Error deleting payment method:', error);
      return false;
    }
  },

  // Trip Payment Messages
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
    }
  ): Promise<string | null> {
    try {
      // Use enhanced v2 function with audit trail and transaction safety
      const { data: paymentId, error } = await supabase
        .rpc('create_payment_with_splits_v2', {
          p_trip_id: tripId,
          p_amount: paymentData.amount,
          p_currency: paymentData.currency,
          p_description: paymentData.description,
          p_split_count: paymentData.splitCount,
          p_split_participants: paymentData.splitParticipants,
          p_payment_methods: paymentData.paymentMethods,
          p_created_by: userId
        });

      if (error) throw error;

      // Record payment split patterns for ML-based suggestions (non-blocking)
      // This helps improve future participant suggestions
      if (paymentId && paymentData.splitParticipants.length > 0) {
        recordPaymentSplitPattern(tripId, userId, paymentData.splitParticipants)
          .catch(err => {
            // Silently fail - pattern recording is optional and shouldn't block payment creation
            console.debug('[paymentService] Failed to record split pattern:', err);
          });
      }

      return paymentId;
    } catch (error) {
      console.error('Error creating payment message:', error);
      return null;
    }
  },

  async getTripPaymentMessages(tripId: string): Promise<PaymentMessage[]> {
    try {
      // Only use mock data for demo mode trips (1-12) when explicitly in demo mode
      const tripIdNum = parseInt(tripId);
      const isDemoMode = await demoModeService.isDemoModeEnabled();
      const isDemoTrip = !isNaN(tripIdNum) && tripIdNum >= 1 && tripIdNum <= 12;
      
      if (isDemoMode && isDemoTrip) {
        return mockPayments.filter(p => p.trip_id === tripId).map((payment: MockPayment) => ({
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

      const { data, error } = await supabase
        .from('trip_payment_messages')
        .select('*')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(msg => ({
        id: msg.id,
        tripId: msg.trip_id,
        messageId: msg.message_id,
        amount: parseFloat(msg.amount.toString()),
        currency: msg.currency,
        description: msg.description,
        splitCount: msg.split_count,
        splitParticipants: Array.isArray(msg.split_participants) ? msg.split_participants as string[] : [],
        paymentMethods: Array.isArray(msg.payment_methods) ? msg.payment_methods as string[] : [],
        createdBy: msg.created_by,
        createdAt: msg.created_at,
        isSettled: msg.is_settled,
      }));
    } catch (error) {
      console.error('Error fetching payment messages:', error);
      return [];
    }
  },

  // Payment Settlement
  async settlePayment(splitId: string, settlementMethod: string): Promise<boolean> {
    try {
      const { data: currentSplit, error: fetchError } = await supabase
        .from('payment_splits')
        .select('is_settled')
        .eq('id', splitId)
        .single();

      if (fetchError) throw fetchError;
      
      if (currentSplit.is_settled) {
        throw new Error('Payment has already been settled by another user.');
      }

      const { error } = await supabase
        .from('payment_splits')
        .update({
          is_settled: true,
          settled_at: new Date().toISOString(),
          settlement_method: settlementMethod,
        })
        .eq('id', splitId)
        .eq('is_settled', false);

      return !error;
    } catch (error) {
      console.error('Error settling payment:', error);
      return false;
    }
  },

  // Update payment message (creator only)
  async updatePaymentMessage(paymentId: string, updates: { amount?: number; description?: string }): Promise<boolean> {
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
      await supabase
        .from('payment_splits')
        .delete()
        .eq('payment_message_id', paymentId);

      // Delete audit log entries
      await supabase
        .from('payment_audit_log')
        .delete()
        .eq('payment_message_id', paymentId);

      // Delete the payment message
      const { error } = await supabase
        .from('trip_payment_messages')
        .delete()
        .eq('id', paymentId);

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
        .select(`
          *,
          payment_message:trip_payment_messages!inner(trip_id, created_by, amount)
        `)
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
              amount
            });
          }
        });
      });

      return {
        totalExpenses,
        userBalances,
        settlementSuggestions
      };
    } catch (error) {
      console.error('Error getting payment summary:', error);
      return {
        totalExpenses: 0,
        userBalances: {},
        settlementSuggestions: []
      };
    }
  }
};