import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { tripService } from '@/services/tripService';
import { calendarService } from '@/services/calendarService';
import { supabase } from '@/integrations/supabase/client';
import { paymentService } from '@/services/paymentService';
import { getTripLinks } from '@/services/tripLinksService';
import { useDemoMode } from './useDemoMode';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';

/**
 * Enhanced hook for prefetching trip data on hover/focus
 *
 * ⚡ Optimized: All imports are static (no dynamic import latency).
 * Prefetches ALL common tab data for near-instant tab switching.
 */
export const usePrefetchTrip = () => {
  const queryClient = useQueryClient();
  const { isDemoMode } = useDemoMode();

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

  const prefetchExtended = useCallback(
    (tripId: string) => {
      if (isDemoMode) return;
      prefetch(tripId);
    },
    [isDemoMode, prefetch],
  );

  /**
   * ⚡ Prefetch specific tab data — static imports for zero module-load latency
   */
  const prefetchTab = useCallback(
    (tripId: string, tabId: string) => {
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
            queryKey: tripKeys.polls(tripId),
            queryFn: async () => {
              const { data } = await supabase
                .from('trip_polls')
                .select('*')
                .eq('trip_id', tripId)
                .order('created_at', { ascending: false });
              return data || [];
            },
            staleTime: QUERY_CACHE_CONFIG.polls.staleTime,
          });
          break;

        case 'media':
          queryClient.prefetchQuery({
            queryKey: tripKeys.media(tripId),
            queryFn: async () => {
              const { data } = await supabase
                .from('trip_media_index')
                .select('*')
                .eq('trip_id', tripId)
                .order('created_at', { ascending: false })
                .limit(20);
              return data || [];
            },
            staleTime: QUERY_CACHE_CONFIG.media.staleTime,
          });
          break;

        case 'payments':
          queryClient.prefetchQuery({
            queryKey: tripKeys.payments(tripId),
            queryFn: () => paymentService.getTripPaymentMessages(tripId),
            staleTime: QUERY_CACHE_CONFIG.payments.staleTime,
          });
          break;

        case 'places':
          // ⚡ NEW: Prefetch trip links for instant Places > Links sub-tab
          queryClient.prefetchQuery({
            queryKey: ['tripLinks', tripId],
            queryFn: () => getTripLinks(tripId, false),
            staleTime: QUERY_CACHE_CONFIG.places.staleTime,
          });
          break;

        case 'concierge':
          // AI Concierge is stateless, no prefetch needed
          break;
      }
    },
    [isDemoMode, queryClient],
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
   * NOTE: Payments is intentionally excluded from priority prefetch.
   * It requires auth verification + 4 rounds of DB calls, which competes
   * with other tabs (especially Media) for network bandwidth.
   * Payments is still prefetched on hover/adjacent-tab navigation.
   */
  const prefetchPriorityTabs = useCallback(
    (tripId: string) => {
      if (isDemoMode) return;

      // Immediate: Chat (default tab)
      prefetchTab(tripId, 'chat');

      // After 200ms: Calendar (second most used)
      setTimeout(() => prefetchTab(tripId, 'calendar'), 200);

      // After 500ms: Tasks (lightweight)
      setTimeout(() => {
        prefetchTab(tripId, 'tasks');
      }, 500);
    },
    [isDemoMode, prefetchTab],
  );

  return {
    prefetch,
    prefetchExtended,
    prefetchTab,
    prefetchAdjacentTabs,
    prefetchPriorityTabs,
  };
};
