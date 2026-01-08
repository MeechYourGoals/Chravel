import { useQuery } from '@tanstack/react-query';
import { tripService, Trip as ServiceTrip } from '@/services/tripService';
import { useDemoMode } from './useDemoMode';
import { getTripById as getMockTripById, Trip as MockTrip } from '@/data/tripsData';
import { convertSupabaseTripToMock } from '@/utils/tripConverter';

/**
 * ⚡ PERFORMANCE: Hook for fetching trip data using React Query
 * 
 * This hook is the SINGLE SOURCE OF TRUTH for trip data loading.
 * It enables prefetching from TripCard hover to work because
 * both prefetch and load use the same query key ['trip', tripId].
 * 
 * Benefits:
 * - Prefetch on hover actually warms the cache that this hook reads
 * - Automatic background refetching
 * - Stale-while-revalidate pattern
 * - Instant cache hits when navigating back
 */
export const useTripData = (tripId: string | undefined) => {
  const { isDemoMode } = useDemoMode();

  const {
    data: trip,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['trip', tripId],
    queryFn: async (): Promise<MockTrip | null> => {
      if (!tripId) return null;

      // ⚡ DEMO MODE: Instant load from static mock data
      if (isDemoMode) {
        const tripIdNum = parseInt(tripId, 10);
        if (Number.isNaN(tripIdNum)) {
          console.warn('[useTripData] Invalid demo trip ID:', tripId);
          return null;
        }
        const mockTrip = getMockTripById(tripIdNum);
        return mockTrip || null;
      }

      // 🔐 AUTHENTICATED MODE: Fetch from Supabase
      const realTrip = await tripService.getTripById(tripId);
      if (!realTrip) return null;
      return convertSupabaseTripToMock(realTrip);
    },
    enabled: !!tripId,
    staleTime: 60000, // Data fresh for 1 minute (matches prefetch staleTime)
    gcTime: 300000, // Keep in cache for 5 minutes
  });

  return {
    trip,
    isLoading,
    error,
  };
};
