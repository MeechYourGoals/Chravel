import { useState, useEffect } from 'react';
import { paymentService } from '../services/paymentService';
import { PaymentMethod, PaymentMessage } from '../types/payments';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';
import { supabase } from '@/integrations/supabase/client';

export const usePayments = (tripId?: string) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [tripPayments, setTripPayments] = useState<PaymentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();

  const userId = user?.id;

  // Load user payment methods
  useEffect(() => {
    if (!userId) return;

    const loadPaymentMethods = async () => {
      setLoading(true);
      try {
        const methods = await paymentService.getUserPaymentMethods(userId);
        setPaymentMethods(methods);
      } catch (error) {
        console.error('Error loading payment methods:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPaymentMethods();
  }, [userId]);

  // Load trip payments
  useEffect(() => {
    if (!tripId) return;

    const loadTripPayments = async () => {
      setLoading(true);
      try {
        const payments = await paymentService.getTripPaymentMessages(tripId);
        setTripPayments(payments);
      } catch (error) {
        console.error('Error loading trip payments:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTripPayments();
  }, [tripId]);

  // Real-time subscription for authenticated mode
  useEffect(() => {
    if (!tripId || isDemoMode) return;

    const channel = supabase
      .channel(`trip_payments:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_payment_messages',
          filter: `trip_id=eq.${tripId}`,
        },
        async (payload) => {
          // Refresh payments on any change
          try {
            const payments = await paymentService.getTripPaymentMessages(tripId);
            setTripPayments(payments);
          } catch (error) {
            console.error('Error refreshing payments after real-time update:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_splits',
        },
        async (payload) => {
          // Refresh payments when splits are updated
          try {
            const payments = await paymentService.getTripPaymentMessages(tripId);
            setTripPayments(payments);
          } catch (error) {
            console.error('Error refreshing payments after split update:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, isDemoMode]);

  const addPaymentMethod = async (method: Omit<PaymentMethod, 'id'>) => {
    if (!userId) return false;

    const success = await paymentService.savePaymentMethod(userId, method);
    if (success) {
      const updatedMethods = await paymentService.getUserPaymentMethods(userId);
      setPaymentMethods(updatedMethods);
    }
    return success;
  };

  const updatePaymentMethod = async (methodId: string, updates: Partial<PaymentMethod>) => {
    const success = await paymentService.updatePaymentMethod(methodId, updates);
    if (success && userId) {
      const updatedMethods = await paymentService.getUserPaymentMethods(userId);
      setPaymentMethods(updatedMethods);
    }
    return success;
  };

  const deletePaymentMethod = async (methodId: string) => {
    const success = await paymentService.deletePaymentMethod(methodId);
    if (success && userId) {
      const updatedMethods = await paymentService.getUserPaymentMethods(userId);
      setPaymentMethods(updatedMethods);
    }
    return success;
  };

  const createPaymentMessage = async (paymentData: {
    amount: number;
    currency: string;
    description: string;
    splitCount: number;
    splitParticipants: string[];
    paymentMethods: string[];
  }) => {
    if (!tripId || !userId) return null;

    const paymentId = await paymentService.createPaymentMessage(tripId, userId, paymentData);
    if (paymentId) {
      // Refresh trip payments
      const updatedPayments = await paymentService.getTripPaymentMessages(tripId);
      setTripPayments(updatedPayments);
    }
    return paymentId;
  };

  const settlePayment = async (splitId: string, settlementMethod: string) => {
    const success = await paymentService.settlePayment(splitId, settlementMethod);
    if (success && tripId) {
      // Refresh trip payments
      const updatedPayments = await paymentService.getTripPaymentMessages(tripId);
      setTripPayments(updatedPayments);
    }
    return success;
  };

  const getTripPaymentSummary = async () => {
    if (!tripId) return null;
    return await paymentService.getTripPaymentSummary(tripId);
  };

  return {
    paymentMethods,
    tripPayments,
    loading,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    createPaymentMessage,
    settlePayment,
    getTripPaymentSummary
  };
};