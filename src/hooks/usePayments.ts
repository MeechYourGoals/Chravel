import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../services/paymentService';
import { PaymentMethod, PaymentMessage } from '../types/payments';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';
import { supabase } from '@/integrations/supabase/client';
import { demoModeService } from '../services/demoModeService';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';
import { isDemoTrip as checkDemoTrip } from '@/utils/demoUtils';
import {
  optimisticallyAddPayment,
  optimisticallyRemovePayment,
  optimisticallyUpdatePayment,
  replaceOptimisticPaymentId,
  buildPaymentMessage,
} from '@/lib/paymentCacheUtils';

class CreatePaymentMutationError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = 'CreatePaymentMutationError';
    this.code = code;
  }
}

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

  const makeOptimisticPaymentId = useCallback((): string => {
    try {
      return `optimistic-payment-${crypto.randomUUID()}`;
    } catch {
      return `optimistic-payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  }, []);

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData: {
      amount: number;
      currency: string;
      description: string;
      splitCount: number;
      splitParticipants: string[];
      paymentMethods: string[];
    }): Promise<{ paymentId: string }> => {
      if (!tripId) {
        throw new CreatePaymentMutationError('VALIDATION_FAILED', 'Trip ID is missing.');
      }

      if (demoActive) {
        const paymentId = demoModeService.addSessionPayment(tripId, paymentData);
        if (!paymentId) {
          throw new CreatePaymentMutationError('DEMO_ERROR', 'Failed to create demo payment.');
        }
        return { paymentId };
      }

      if (!userId) {
        throw new CreatePaymentMutationError(
          'VALIDATION_FAILED',
          'User ID is missing. Please sign in.',
        );
      }

      const result = await paymentService.createPaymentMessage(tripId, userId, paymentData);
      if (!result.success || !result.paymentId) {
        throw new CreatePaymentMutationError(
          result.error?.code || 'UNKNOWN',
          result.error?.message || 'Failed to create payment.',
        );
      }

      return { paymentId: result.paymentId };
    },
    onMutate: async paymentData => {
      if (!tripId) return undefined;

      await queryClient.cancelQueries({ queryKey: tripKeys.payments(tripId) });

      const previousPayments = queryClient.getQueryData(tripKeys.payments(tripId));
      const optimisticId = makeOptimisticPaymentId();
      // Demo-mode payments persist with a fixed author id (`demo-user`) even if a real user is signed in.
      // Keep optimistic rows consistent to avoid creator-only UI flicker.
      const optimisticUserId = demoActive ? 'demo-user' : userId || 'demo-user';
      const optimisticPayment = buildPaymentMessage(
        optimisticId,
        tripId,
        optimisticUserId,
        paymentData,
      );

      optimisticallyAddPayment(queryClient, tripId, optimisticPayment);

      return { previousPayments, optimisticId };
    },
    onError: (_err, _vars, context) => {
      if (!tripId || !context) return;
      queryClient.setQueryData(tripKeys.payments(tripId), context.previousPayments);
    },
    onSuccess: (data, _vars, context) => {
      if (!tripId || !context) return;
      replaceOptimisticPaymentId(queryClient, tripId, context.optimisticId, data.paymentId);
    },
    onSettled: () => {
      if (!tripId) return;
      // Always reconcile server truth in the background (balances, settle state, etc.)
      queryClient.invalidateQueries({ queryKey: tripKeys.payments(tripId) });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: tripKeys.paymentBalances(tripId, userId) });
      }
    },
  });

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
    try {
      const { paymentId } = await createPaymentMutation.mutateAsync(paymentData);
      return { success: true, paymentId };
    } catch (error) {
      if (error instanceof CreatePaymentMutationError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        };
      }
      return {
        success: false,
        error: {
          code: 'UNKNOWN',
          message: error instanceof Error ? error.message : 'Failed to create payment.',
        },
      };
    }
  };

  const updatePaymentMessage = useCallback(
    async (
      paymentId: string,
      updates: { amount?: number; description?: string },
    ): Promise<boolean> => {
      if (!tripId) return false;

      const previousPayments = queryClient.getQueryData(tripKeys.payments(tripId));

      // Optimistically update cache for instant UI response
      optimisticallyUpdatePayment(queryClient, tripId, paymentId, {
        ...(updates.amount !== undefined ? { amount: updates.amount } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
      });

      try {
        if (demoActive) {
          const ok = demoModeService.updateSessionPayment(tripId, paymentId, updates);
          if (!ok) {
            queryClient.setQueryData(tripKeys.payments(tripId), previousPayments);
          }
          return ok;
        }

        const ok = await paymentService.updatePaymentMessage(paymentId, updates);
        if (!ok) {
          queryClient.setQueryData(tripKeys.payments(tripId), previousPayments);
          return false;
        }

        queryClient.invalidateQueries({ queryKey: tripKeys.payments(tripId) });
        if (userId) {
          queryClient.invalidateQueries({ queryKey: tripKeys.paymentBalances(tripId, userId) });
        }
        return true;
      } catch {
        queryClient.setQueryData(tripKeys.payments(tripId), previousPayments);
        return false;
      }
    },
    [tripId, queryClient, demoActive, userId],
  );

  const deletePaymentMessage = useCallback(
    async (paymentId: string): Promise<boolean> => {
      if (!tripId) return false;

      const previousPayments = queryClient.getQueryData(tripKeys.payments(tripId));
      optimisticallyRemovePayment(queryClient, tripId, paymentId);

      try {
        if (demoActive) {
          const ok = demoModeService.deleteSessionPayment(tripId, paymentId);
          if (!ok) {
            queryClient.setQueryData(tripKeys.payments(tripId), previousPayments);
          }
          return ok;
        }

        const ok = await paymentService.deletePaymentMessage(paymentId);
        if (!ok) {
          queryClient.setQueryData(tripKeys.payments(tripId), previousPayments);
          return false;
        }

        queryClient.invalidateQueries({ queryKey: tripKeys.payments(tripId) });
        if (userId) {
          queryClient.invalidateQueries({ queryKey: tripKeys.paymentBalances(tripId, userId) });
        }
        return true;
      } catch {
        queryClient.setQueryData(tripKeys.payments(tripId), previousPayments);
        return false;
      }
    },
    [tripId, queryClient, demoActive, userId],
  );

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
    updatePaymentMessage,
    deletePaymentMessage,
    settlePayment,
    unsettlePayment,
    getTripPaymentSummary,
  };
};
