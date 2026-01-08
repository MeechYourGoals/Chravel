import { useState, useEffect, useCallback } from 'react';
import { paymentService } from '../services/paymentService';
import { PaymentMethod, PaymentMessage } from '../types/payments';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';
import { supabase } from '@/integrations/supabase/client';
import { demoModeService } from '../services/demoModeService';

export const usePayments = (tripId?: string) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [tripPayments, setTripPayments] = useState<PaymentMessage[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();

  const userId = user?.id;

  // Check if this is a demo trip
  const isNumericOnly = tripId ? /^\d+$/.test(tripId) : false;
  const tripIdNum = tripId ? parseInt(tripId, 10) : NaN;
  const isDemoTrip = isNumericOnly && !isNaN(tripIdNum) && tripIdNum >= 1 && tripIdNum <= 12;
  const demoActive = isDemoMode && isDemoTrip;

  // Load user payment methods
  useEffect(() => {
    if (!userId) return;

    const loadPaymentMethods = async () => {
      setMethodsLoading(true);
      try {
        const methods = await paymentService.getUserPaymentMethods(userId);
        setPaymentMethods(methods);
      } catch (error) {
        console.error('Error loading payment methods:', error);
      } finally {
        setMethodsLoading(false);
      }
    };

    loadPaymentMethods();
  }, [userId]);

  // Load trip payments (handles both demo and authenticated modes)
  const loadTripPayments = useCallback(async () => {
    if (!tripId) return;

    setPaymentsLoading(true);
    try {
      if (demoActive) {
        // Demo mode: combine mock and session payments
        const mockPayments = demoModeService.getMockPayments(tripId, false);
        const sessionPayments = demoModeService.getSessionPayments(tripId);

        // Convert to PaymentMessage format
        const allPayments: PaymentMessage[] = [...mockPayments, ...sessionPayments].map(p => ({
          id: p.id,
          tripId: p.trip_id,
          messageId: null,
          amount: p.amount,
          currency: p.currency || 'USD',
          description: p.description,
          splitCount: p.split_count,
          splitParticipants: p.split_participants || [],
          paymentMethods: p.payment_methods || [],
          createdBy: p.created_by,
          createdAt: p.created_at,
          isSettled: p.is_settled || false,
        }));

        setTripPayments(allPayments);
      } else {
        // Authenticated mode: fetch from Supabase
        const payments = await paymentService.getTripPaymentMessages(tripId);
        setTripPayments(payments);
      }
    } catch (error) {
      console.error('Error loading trip payments:', error);
    } finally {
      setPaymentsLoading(false);
    }
  }, [tripId, demoActive]);

  // Initial load of trip payments
  useEffect(() => {
    loadTripPayments();
  }, [loadTripPayments]);

  // Manual refresh function
  const refreshPayments = useCallback(async () => {
    await loadTripPayments();
  }, [loadTripPayments]);

  // Real-time subscription for authenticated mode
  useEffect(() => {
    if (!tripId || demoActive) return;

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
        () => {
          // Refresh payments on any change
          loadTripPayments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_splits',
        },
        () => {
          // Refresh payments when splits are updated
          loadTripPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, demoActive, loadTripPayments]);

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
  }): Promise<{ success: boolean; paymentId?: string; error?: { code: string; message: string } }> => {
    if (!tripId) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Trip ID is missing.'
        }
      };
    }

    // Demo mode: use session storage
    if (demoActive) {
      const paymentId = demoModeService.addSessionPayment(tripId, paymentData);
      if (paymentId) {
        await refreshPayments();
        return { success: true, paymentId };
      }
      return {
        success: false,
        error: { code: 'DEMO_ERROR', message: 'Failed to create demo payment.' }
      };
    }

    // Authenticated mode: use database
    if (!userId) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'User ID is missing. Please sign in.'
        }
      };
    }

    const result = await paymentService.createPaymentMessage(tripId, userId, paymentData);
    if (result.success && result.paymentId) {
      // Refresh trip payments after creation
      await refreshPayments();
    }
    return result;
  };

  const settlePayment = async (splitId: string, settlementMethod: string) => {
    const success = await paymentService.settlePayment(splitId, settlementMethod);
    if (success) {
      await refreshPayments();
    }
    return success;
  };

  const unsettlePayment = async (splitId: string) => {
    const success = await paymentService.unsettlePayment(splitId);
    if (success) {
      await refreshPayments();
    }
    return success;
  };

  const getTripPaymentSummary = async () => {
    if (!tripId) return null;
    return await paymentService.getTripPaymentSummary(tripId);
  };

  // Derived state: separate settled and unsettled payments
  const outstandingPayments = tripPayments.filter(p => !p.isSettled);
  const completedPayments = tripPayments.filter(p => p.isSettled);

  return {
    // Data
    paymentMethods,
    tripPayments,
    outstandingPayments,
    completedPayments,
    // Loading states
    loading: paymentsLoading || methodsLoading,
    paymentsLoading,
    methodsLoading,
    // Demo mode info
    demoActive,
    // Actions
    refreshPayments,
    addPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    createPaymentMessage,
    settlePayment,
    unsettlePayment,
    getTripPaymentSummary
  };
};