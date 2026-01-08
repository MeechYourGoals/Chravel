import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { tripService } from '@/services/tripService';
import { useDemoMode } from './useDemoMode';

/**
 * Hook for prefetching trip data on hover/focus
 * Reduces perceived load time by warming the cache before navigation
 */
export const usePrefetchTrip = () => {
  const queryClient = useQueryClient();
  const { isDemoMode } = useDemoMode();

  const prefetch = useCallback((tripId: string) => {
    // Skip prefetch in demo mode - mock data is synchronous
    if (isDemoMode) return;
    
    // Prefetch trip data with 60s stale time
    queryClient.prefetchQuery({
      queryKey: ['trip', tripId],
      queryFn: () => tripService.getTripById(tripId),
      staleTime: 60000,
    });

    // Prefetch trip members with 30s stale time
    queryClient.prefetchQuery({
      queryKey: ['trip-members', tripId],
      queryFn: () => tripService.getTripMembers(tripId),
      staleTime: 30000,
    });
  }, [isDemoMode, queryClient]);

  return { prefetch };
};
