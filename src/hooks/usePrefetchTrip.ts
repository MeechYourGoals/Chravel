import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { tripService } from '@/services/tripService';
import { calendarService } from '@/services/calendarService';
import { supabase } from '@/integrations/supabase/client';
import { paymentService } from '@/services/paymentService';
import { paymentBalanceService } from '@/services/paymentBalanceService';
import { fetchTripMediaItemsPaginated } from '@/services/tripMediaService';
import { fetchTripPlaces } from '@/services/tripPlacesService';
import { useDemoMode } from './useDemoMode';
import { useAuth } from './useAuth';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';
import { preloadTabChunk, preloadTabChunks } from '@/lib/tabChunkPreloader';

/**
 * Enhanced hook for prefetching trip data on hover/focus
 *
 * ⚡ Optimized: All imports are static (no dynamic import latency).
 * Prefetches ALL common tab data for near-instant tab switching.
 */
export const usePrefetchTrip = () => {
  const queryClient = useQueryClient();
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();

  const prefetch = useCallback(
    (tripId: string) => {
      if (isDemoMode) return;

      // ⚡ PRIORITY 1: Core trip data (needed for UI rendering)
      queryClient.prefetchQuery({
        queryKey: tripKeys.detail(tripId),
        queryFn: () => tripService.getTripById(tripId),
        staleTime: QUERY_CACHE_CONFIG.trip.staleTime,
      });

      // ⚡ PRIORITY 1: Trip members (needed for UI rendering)
      queryClient.prefetchQuery({
        queryKey: tripKeys.members(tripId),
        queryFn: () => tripService.getTripMembers(tripId),
        staleTime: QUERY_CACHE_CONFIG.members.staleTime,
      });

      // ⚡ PRIORITY 2: Calendar events (frequently accessed tab)
      queryClient.prefetchQuery({
        queryKey: tripKeys.calendar(tripId),
        queryFn: () => calendarService.getTripEvents(tripId),
        staleTime: QUERY_CACHE_CONFIG.calendar.staleTime,
      });
    },
    [isDemoMode, queryClient],
  );

  /**
   * ⚡ Prefetch specific tab data AND preload its JS chunk.
   * The chunk preload eliminates the Suspense skeleton on first visit.
   */
  const prefetchTab = useCallback(
    (tripId: string, tabId: string) => {
      // Always preload the JS chunk — even in demo mode the component needs
      // to be downloaded before it can render demo/mock data.
      preloadTabChunk(tabId);

      if (isDemoMode) return;

      switch (tabId) {
        case 'calendar':
          queryClient.prefetchQuery({
            queryKey: tripKeys.calendar(tripId),
            queryFn: () => calendarService.getTripEvents(tripId),
            staleTime: QUERY_CACHE_CONFIG.calendar.staleTime,
          });
          break;

        case 'chat':
          queryClient.prefetchQuery({
            queryKey: tripKeys.chat(tripId),
            queryFn: async () => {
              const { data } = await supabase
                .from('trip_chat_messages')
                .select('*')
                .eq('trip_id', tripId)
                .eq('is_deleted', false)
                .order('created_at', { ascending: false })
                .limit(15);
              return (data || []).reverse();
            },
            staleTime: QUERY_CACHE_CONFIG.chat.staleTime,
          });
          break;

        case 'tasks':
          queryClient.prefetchQuery({
            queryKey: tripKeys.tasks(tripId, false),
            queryFn: async () => {
              const { data } = await supabase
                .from('trip_tasks')
                .select('*, task_status(*), creator:creator_id(id, display_name, avatar_url)')
                .eq('trip_id', tripId)
                .order('created_at', { ascending: false })
                .limit(50);
              return data || [];
            },
            staleTime: QUERY_CACHE_CONFIG.tasks.staleTime,
          });
          break;

        case 'polls':
          queryClient.prefetchQuery({
            queryKey: tripKeys.polls(tripId, isDemoMode),
            queryFn: async () => {
              const { data, error } = await supabase
                .from('trip_polls')
                .select('*')
                .eq('trip_id', tripId)
                .order('created_at', { ascending: false });

              if (error) throw error;
              return data || [];
            },
            staleTime: QUERY_CACHE_CONFIG.polls.staleTime,
          });
          break;

        case 'media':
          // Match useMediaManagement key so prefetch populates the same cache
          queryClient.prefetchInfiniteQuery({
            queryKey: [...tripKeys.media(tripId, isDemoMode), 'paginated'],
            queryFn: ({ pageParam }: { pageParam?: string }) =>
              fetchTripMediaItemsPaginated(tripId, pageParam),
            initialPageParam: undefined as string | undefined,
            getNextPageParam: (lastPage: { hasMore: boolean; nextCursor: string | null }) =>
              lastPage.hasMore && lastPage.nextCursor ? lastPage.nextCursor : undefined,
            staleTime: QUERY_CACHE_CONFIG.media.staleTime,
          });
          break;

        case 'payments':
          // ⚡ Only prefetch payments when authenticated — unauthenticated fetches
          // cache an empty [] under the shared key, causing a temporary "no payments"
          // flash if the user signs in before staleness expires.
          if (user?.id) {
            queryClient.prefetchQuery({
              queryKey: tripKeys.payments(tripId),
              queryFn: () => paymentService.getTripPaymentMessages(tripId),
              staleTime: QUERY_CACHE_CONFIG.payments.staleTime,
            });
            queryClient.prefetchQuery({
              queryKey: tripKeys.paymentBalances(tripId, user.id),
              queryFn: () => paymentBalanceService.getBalanceSummary(tripId, user.id),
              staleTime: QUERY_CACHE_CONFIG.paymentBalances.staleTime,
            });
          }
          break;

        case 'places':
          // ⚡ NEW: Prefetch trip links for instant Places > Links sub-tab
          queryClient.prefetchQuery({
            queryKey: tripKeys.places(tripId, isDemoMode),
            queryFn: () => fetchTripPlaces(tripId, isDemoMode),
            staleTime: QUERY_CACHE_CONFIG.places.staleTime,
          });
          break;

        case 'concierge':
          // AI Concierge is stateless, no prefetch needed
          break;
      }
    },
    [isDemoMode, queryClient, user?.id],
  );

  /**
   * ⚡ MOBILE OPTIMIZATION: Prefetch adjacent tabs when user visits a tab
   */
  const prefetchAdjacentTabs = useCallback(
    (tripId: string, currentTabId: string, allTabIds: string[]) => {
      if (isDemoMode) return;

      const currentIndex = allTabIds.indexOf(currentTabId);
      if (currentIndex === -1) return;

      const adjacentTabs: string[] = [];
      if (currentIndex > 0) adjacentTabs.push(allTabIds[currentIndex - 1]);
      if (currentIndex < allTabIds.length - 1) adjacentTabs.push(allTabIds[currentIndex + 1]);

      setTimeout(() => {
        adjacentTabs.forEach(tabId => {
          prefetchTab(tripId, tabId);
        });
      }, 150);
    },
    [isDemoMode, prefetchTab],
  );

  /**
   * ⚡ MOBILE/PWA: Prefetch high-priority tabs on trip load
   *
   * Two-phase strategy:
   *  1. Immediately preload ALL JS chunks so Suspense skeletons never show.
   *  2. Stagger DATA prefetches to avoid saturating the network.
   *
   * Payments messages are prefetched at 400ms (lightweight query).
   * Balance summary is prefetched via prefetchTab when hovering or
   * visiting adjacent tabs, since it involves multiple DB round-trips.
   */
  const prefetchPriorityTabs = useCallback(
    (tripId: string) => {
      // Phase 1: Preload ALL tab JS chunks immediately.
      // import() requests are low-priority and don't block the main thread.
      preloadTabChunks([
        'chat',
        'calendar',
        'tasks',
        'polls',
        'media',
        'places',
        'payments',
        'concierge',
      ]);

      if (isDemoMode) return;

      // Phase 2: Stagger data prefetches (tighter timing than before).
      // Immediate: Chat (default tab)
      prefetchTab(tripId, 'chat');

      // After 100ms: Calendar (second most used)
      setTimeout(() => prefetchTab(tripId, 'calendar'), 100);

      // After 250ms: Tasks (lightweight)
      setTimeout(() => prefetchTab(tripId, 'tasks'), 250);

      // After 400ms: Payments
      setTimeout(() => prefetchTab(tripId, 'payments'), 400);

      // After 600ms: Polls + Places + Media
      setTimeout(() => {
        prefetchTab(tripId, 'polls');
        prefetchTab(tripId, 'places');
        prefetchTab(tripId, 'media');
      }, 600);
    },
    [isDemoMode, prefetchTab],
  );

  return {
    prefetch,
    prefetchTab,
    prefetchAdjacentTabs,
    prefetchPriorityTabs,
  };
};
