import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../services/paymentService';
import { PaymentMethod, PaymentMessage } from '../types/payments';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';
import { supabase } from '@/integrations/supabase/client';
import { demoModeService } from '../services/demoModeService';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';
import { isDemoTrip as checkDemoTrip } from '@/utils/demoUtils';
import { optimisticallyAddPayment, buildPaymentMessage } from '@/lib/paymentCacheUtils';

export const usePayments = (tripId?: string) => {
  const queryClient = useQueryClient();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(false);
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();

  const userId = user?.id;
  const demoActive = isDemoMode && checkDemoTrip(tripId);

  // ⚡ Trip payments via TanStack Query — enables prefetch cache + stale-while-revalidate
  const { data: tripPayments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: tripKeys.payments(tripId || ''),
    queryFn: async (): Promise<PaymentMessage[]> => {
      if (!tripId) return [];

      if (demoActive) {
        const mockPayments = demoModeService.getMockPayments(tripId, false);
        const sessionPayments = demoModeService.getSessionPayments(tripId);

        return [...mockPayments, ...sessionPayments].map(p => ({
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
      }

      return await paymentService.getTripPaymentMessages(tripId);
    },
    enabled: !!tripId,
    staleTime: QUERY_CACHE_CONFIG.payments.staleTime,
    gcTime: QUERY_CACHE_CONFIG.payments.gcTime,
    refetchOnWindowFocus: QUERY_CACHE_CONFIG.payments.refetchOnWindowFocus,
  });

  // Load user payment methods (user-level, kept as useState)
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

  // Real-time subscription via hub — invalidates TanStack Query cache
  useEffect(() => {
    if (!tripId || demoActive) return;

    const hub = (window as any).__tripRealtimeHubs?.get(tripId);
    if (!hub) {
      // Fallback: direct channel if hub not yet mounted
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
          () => queryClient.invalidateQueries({ queryKey: tripKeys.payments(tripId) }),
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }

    return hub.subscribe('trip_payment_messages', '*', () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.payments(tripId) });
    });
  }, [tripId, demoActive, queryClient]);

  // Refresh: refetch and await so UI has fresh data before we consider the operation complete
  const refreshPayments = useCallback(async () => {
    if (tripId) {
      await queryClient.refetchQueries({ queryKey: tripKeys.payments(tripId) });
    }
  }, [tripId, queryClient]);

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
  }): Promise<{
    success: boolean;
    paymentId?: string;
    error?: { code: string; message: string };
  }> => {
    if (!tripId) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Trip ID is missing.',
        },
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
        error: { code: 'DEMO_ERROR', message: 'Failed to create demo payment.' },
      };
    }

    // Authenticated mode: use database
    if (!userId) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'User ID is missing. Please sign in.',
        },
      };
    }

    const result = await paymentService.createPaymentMessage(tripId, userId, paymentData);
    if (result.success && result.paymentId && userId) {
      // Optimistic update: show payment immediately without waiting for refetch
      const newPayment = buildPaymentMessage(result.paymentId, tripId, userId, paymentData);
      optimisticallyAddPayment(queryClient, tripId, newPayment);
      // Refetch to ensure server truth (balance, etc.) — runs in background
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
    getTripPaymentSummary,
  };
};
