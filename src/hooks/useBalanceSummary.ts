import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { paymentBalanceService, BalanceSummary } from '../services/paymentBalanceService';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';
import { supabase } from '@/integrations/supabase/client';
import { demoModeService } from '../services/demoModeService';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';
import { isDemoTrip } from '@/utils/demoUtils';

const EMPTY_BALANCE: BalanceSummary = {
  totalOwed: 0,
  totalOwedToYou: 0,
  netBalance: 0,
  baseCurrency: 'USD',
  balances: [],
};

/**
 * TanStack Query hook for payment balance summary.
 *
 * Previously this data was fetched via useState/useEffect in PaymentsTab,
 * which meant every tab switch re-fetched 4 sequential DB round-trips.
 * Now it benefits from caching, stale-while-revalidate, and prefetching.
 */
export const useBalanceSummary = (tripId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isDemoMode, isLoading: demoLoading } = useDemoMode();
  const demoActive = isDemoMode && isDemoTrip(tripId);

  const userId = user?.id;

  const {
    data: balanceSummary,
    isLoading: balanceLoading,
    error,
  } = useQuery({
    queryKey: tripKeys.paymentBalances(tripId || '', userId || ''),
    queryFn: async (): Promise<BalanceSummary> => {
      if (!tripId) return EMPTY_BALANCE;

      if (demoActive) {
        const mockPayments = demoModeService.getMockPayments(tripId, false);
        const sessionPayments = demoModeService.getSessionPayments(tripId);
        const allPayments = [...mockPayments, ...sessionPayments];
        const mockMembers = demoModeService.getMockMembers(tripId);

        const totalAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);
        const avgPerPerson = totalAmount / Math.max(mockMembers.length, 1);

        return {
          totalOwed: avgPerPerson * 0.6,
          totalOwedToYou: avgPerPerson * 0.4,
          netBalance: avgPerPerson * 0.2,
          baseCurrency: 'USD',
          balances: mockMembers.slice(0, 3).map((m, i) => ({
            userId: m.user_id,
            userName: m.display_name,
            avatar: m.avatar_url,
            amountOwed:
              (i === 0 ? avgPerPerson * 0.5 : avgPerPerson * 0.3) * (i % 2 === 0 ? 1 : -1),
            amountOwedCurrency: 'USD',
            preferredPaymentMethod: null,
            unsettledPayments: [],
          })),
        };
      }

      if (!userId) return EMPTY_BALANCE;

      return await paymentBalanceService.getBalanceSummary(tripId, userId);
    },
    enabled: !!tripId && !demoLoading && (demoActive || !!userId),
    staleTime: QUERY_CACHE_CONFIG.paymentBalances.staleTime,
    gcTime: QUERY_CACHE_CONFIG.paymentBalances.gcTime,
    refetchOnWindowFocus: QUERY_CACHE_CONFIG.paymentBalances.refetchOnWindowFocus,
  });

  // Invalidate balance cache when payment data changes via hub
  useEffect(() => {
    if (!tripId || demoActive || !userId) return;

    const hub = (window as any).__tripRealtimeHubs?.get(tripId);
    if (!hub) {
      const channel = supabase
        .channel(`balance_payments:${tripId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'trip_payment_messages',
            filter: `trip_id=eq.${tripId}`,
          },
          () =>
            queryClient.invalidateQueries({ queryKey: tripKeys.paymentBalances(tripId, userId) }),
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }

    return hub.subscribe('trip_payment_messages', '*', () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.paymentBalances(tripId, userId) });
    });
  }, [tripId, demoActive, userId, queryClient]);

  const refreshBalanceSummary = async () => {
    if (!tripId) return;
    // Invalidate using the same key shape the query was created with.
    // In demo mode userId may be undefined (anonymous user), so we pass ''
    // to match the query key constructed on line 41.
    await queryClient.invalidateQueries({
      queryKey: tripKeys.paymentBalances(tripId, userId || ''),
    });
  };

  return {
    balanceSummary: balanceSummary ?? EMPTY_BALANCE,
    balanceLoading,
    balanceError: error,
    refreshBalanceSummary,
    demoActive,
  };
};
