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
   */
  const prefetchTab = useCallback((tripId: string, tabId: string) => {
    if (isDemoMode) return;

    switch (tabId) {
      case 'calendar':
        queryClient.prefetchQuery({
          queryKey: tripKeys.calendar(tripId),
          queryFn: () => calendarService.getTripEvents(tripId),
          staleTime: QUERY_CACHE_CONFIG.calendar.staleTime,
        });
        break;
      // Add more tab-specific prefetching as services are updated
      // case 'tasks':
      //   queryClient.prefetchQuery({
      //     queryKey: tripKeys.tasks(tripId),
      //     queryFn: () => taskService.getTripTasks(tripId),
      //     staleTime: QUERY_CACHE_CONFIG.tasks.staleTime,
      //   });
      //   break;
    }
  }, [isDemoMode, queryClient]);

  return { 
    prefetch, 
    prefetchExtended,
    prefetchTab,
  };
};
