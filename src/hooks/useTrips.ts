import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripService, Trip, CreateTripData } from '@/services/tripService';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';

const TRIPS_QUERY_KEY = 'trips';

export const useTrips = () => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();

  const { data: trips = [], isLoading, refetch } = useQuery({
    queryKey: [TRIPS_QUERY_KEY, user?.id, isDemoMode],
    queryFn: async () => {
      // If in demo mode, explicitly request demo trips
      if (isDemoMode) {
         return await tripService.getUserTrips(true);
      }
      // If not authenticated and not in demo mode, return empty
      if (!user) return [];
      
      // Request real user trips
      return await tripService.getUserTrips(false);
    },
    // Only run query if we have a user or we are in demo mode
    enabled: isDemoMode || !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });

  const createTripMutation = useMutation({
    mutationFn: (tripData: CreateTripData) => {
      // CRITICAL: Validate user authentication state before mutation
      if (!isDemoMode && (!user || !user.id)) {
        console.error('[useTrips] Cannot create trip: No authenticated user', { user });
        throw new Error('AUTHENTICATION_REQUIRED');
      }
      return tripService.createTrip(tripData);
    },
    onSuccess: (newTrip) => {
      if (newTrip) {
        // Invalidate and refetch trips query to update UI everywhere
        queryClient.invalidateQueries({ queryKey: [TRIPS_QUERY_KEY] });
      }
    },
  });

  const updateTripMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Trip> }) => 
      tripService.updateTrip(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_QUERY_KEY] });
    },
  });

  const archiveTripMutation = useMutation({
    mutationFn: (id: string) => tripService.archiveTrip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_QUERY_KEY] });
    },
  });

  // Wrappers to match existing API interface
  const createTrip = async (tripData: CreateTripData): Promise<Trip | null> => {
     try {
       return await createTripMutation.mutateAsync(tripData);
     } catch (e) {
       console.error("Create trip failed", e);
       throw e; // Re-throw for UI handling (CreateTripModal expects error for toast)
     }
  };

  const updateTrip = async (tripId: string, updates: Partial<Trip>): Promise<boolean> => {
    try {
      await updateTripMutation.mutateAsync({ id: tripId, updates });
      return true;
    } catch (e) {
      console.error("Update trip failed", e);
      return false;
    }
  };

  const archiveTrip = async (tripId: string): Promise<boolean> => {
    try {
      await archiveTripMutation.mutateAsync(tripId);
      return true;
    } catch (e) {
      console.error("Archive trip failed", e);
      return false;
    }
  };

  return {
    trips,
    loading: isLoading,
    initializing: isLoading, 
    createTrip,
    updateTrip,
    archiveTrip,
    refreshTrips: refetch
  };
};
