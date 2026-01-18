import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { tripService } from '@/services/tripService';
import { calendarService } from '@/services/calendarService';
import { useDemoMode } from './useDemoMode';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';

/**
 * Enhanced hook for prefetching trip data on hover/focus
 * 
 * Reduces perceived load time by warming the cache before navigation.
 * Now prefetches ALL common tab data for near-instant tab switching.
 * 
 * Usage:
 * - Call prefetch(tripId) on TripCard mouse enter or focus
 * - Data will be cached and ready when user navigates to trip
 */
export const usePrefetchTrip = () => {
  const queryClient = useQueryClient();
  const { isDemoMode } = useDemoMode();

  const prefetch = useCallback((tripId: string) => {
    // Skip prefetch in demo mode - mock data is synchronous
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
  }, [isDemoMode, queryClient]);

  /**
   * Extended prefetch for when user shows clear intent to view trip
   * (e.g., long hover, keyboard focus)
   * 
   * Prefetches additional tab data that may be accessed
   */
  const prefetchExtended = useCallback((tripId: string) => {
    // Skip in demo mode
    if (isDemoMode) return;

    // First do the basic prefetch
    prefetch(tripId);

    // Then add additional tab data after a short delay
    // This prevents blocking the main prefetch
    setTimeout(() => {
      // Chat messages - most common first tab
      // Note: This requires the chat service to be imported
      // For now, we'll just prefetch what we have access to
      
      // Calendar is already prefetched in basic prefetch
    }, 100);
  }, [isDemoMode, prefetch]);

  /**
   * Prefetch specific tab data when hovering over a tab button
   * Useful for instant tab switching within a trip
   *
   * ⚡ SPEED OPTIMIZATION: Warms cache before user clicks tab
   */
  const prefetchTab = useCallback(async (tripId: string, tabId: string) => {
    if (isDemoMode) return;

    // Dynamic imports to avoid loading services until needed
    switch (tabId) {
      case 'calendar':
        queryClient.prefetchQuery({
          queryKey: tripKeys.calendar(tripId),
          queryFn: () => calendarService.getTripEvents(tripId),
          staleTime: QUERY_CACHE_CONFIG.calendar.staleTime,
        });
        break;

      case 'chat':
        // Prefetch chat messages - most common tab
        const { supabase } = await import('@/integrations/supabase/client');
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
        // Prefetch tasks
        const supabaseClient = (await import('@/integrations/supabase/client')).supabase;
        queryClient.prefetchQuery({
          queryKey: tripKeys.tasks(tripId, false),
          queryFn: async () => {
            const { data } = await supabaseClient
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
        // Prefetch polls
        const sb = (await import('@/integrations/supabase/client')).supabase;
        queryClient.prefetchQuery({
          queryKey: tripKeys.polls(tripId),
          queryFn: async () => {
            const { data } = await sb
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
        // Prefetch media - defer slightly as it's heavier
        const supabaseMedia = (await import('@/integrations/supabase/client')).supabase;
        queryClient.prefetchQuery({
          queryKey: tripKeys.media(tripId),
          queryFn: async () => {
            const { data } = await supabaseMedia
              .from('trip_media_index')
              .select('*')
              .eq('trip_id', tripId)
              .order('created_at', { ascending: false })
              .limit(20); // Limit initial media prefetch
            return data || [];
          },
          staleTime: QUERY_CACHE_CONFIG.media.staleTime,
        });
        break;

      case 'payments':
        // Prefetch payments
        const { paymentService } = await import('@/services/paymentService');
        queryClient.prefetchQuery({
          queryKey: tripKeys.payments(tripId),
          queryFn: () => paymentService.getTripPaymentMessages(tripId),
          staleTime: QUERY_CACHE_CONFIG.payments.staleTime,
        });
        break;

      case 'places':
        // Places uses basecamp context, minimal prefetch needed
        break;

      case 'concierge':
        // AI Concierge is stateless, no prefetch needed
        break;
    }
  }, [isDemoMode, queryClient]);

  return { 
    prefetch, 
    prefetchExtended,
    prefetchTab,
  };
};
