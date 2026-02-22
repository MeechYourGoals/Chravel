import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripService, Trip, CreateTripData } from '@/services/tripService';
import { archiveService } from '@/services/archiveService';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';
import { useUserTripsRealtime } from './useUserTripsRealtime';

const TRIPS_QUERY_KEY = 'trips';

export const useTrips = () => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();

  useUserTripsRealtime(user?.id, isDemoMode);

  const { data: trips = [], isLoading, refetch } = useQuery({
    queryKey: [TRIPS_QUERY_KEY, user?.id, isDemoMode],
    queryFn: async () => {
      if (isDemoMode) return await tripService.getUserTrips(true);
      if (!user) return [];
      return await tripService.getUserTrips(false);
    },
    enabled: isDemoMode || !!user,
    staleTime: 1000 * 60 * 5,
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
    onMutate: async (tripId) => {
      await queryClient.cancelQueries({ queryKey: [TRIPS_QUERY_KEY] });
      const previousTrips = queryClient.getQueryData([TRIPS_QUERY_KEY, user?.id, isDemoMode]);
      queryClient.setQueryData([TRIPS_QUERY_KEY, user?.id, isDemoMode], (old: Trip[] | undefined) =>
        old ? old.filter((trip) => trip.id !== tripId) : []
      );
      return { previousTrips };
    },
    onError: (err, tripId, context) => {
      queryClient.setQueryData([TRIPS_QUERY_KEY, user?.id, isDemoMode], context?.previousTrips);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_QUERY_KEY] });
    },
  });

  const hideTripMutation = useMutation({
    mutationFn: (id: string) => archiveService.hideTrip(id),
    onMutate: async (tripId) => {
      await queryClient.cancelQueries({ queryKey: [TRIPS_QUERY_KEY] });
      const previousTrips = queryClient.getQueryData([TRIPS_QUERY_KEY, user?.id, isDemoMode]);
      queryClient.setQueryData([TRIPS_QUERY_KEY, user?.id, isDemoMode], (old: Trip[] | undefined) =>
        old ? old.filter((trip) => trip.id !== tripId) : []
      );
      return { previousTrips };
    },
    onError: (err, tripId, context) => {
      queryClient.setQueryData([TRIPS_QUERY_KEY, user?.id, isDemoMode], context?.previousTrips);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [TRIPS_QUERY_KEY] });
    },
  });

  const deleteTripForMeMutation = useMutation({
    mutationFn: ({ tripId, userId }: { tripId: string; userId: string }) =>
      archiveService.deleteTripForMe(tripId, userId),
    onMutate: async ({ tripId }) => {
      await queryClient.cancelQueries({ queryKey: [TRIPS_QUERY_KEY] });
      const previousTrips = queryClient.getQueryData([TRIPS_QUERY_KEY, user?.id, isDemoMode]);
      queryClient.setQueryData([TRIPS_QUERY_KEY, user?.id, isDemoMode], (old: Trip[] | undefined) =>
        old ? old.filter((trip) => trip.id !== tripId) : []
      );
      return { previousTrips };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData([TRIPS_QUERY_KEY, user?.id, isDemoMode], context?.previousTrips);
    },
    onSettled: () => {
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

  const hideTrip = async (tripId: string): Promise<boolean> => {
    try {
      await hideTripMutation.mutateAsync(tripId);
      return true;
    } catch (e) {
      console.error("Hide trip failed", e);
      return false;
    }
  };

  const deleteTripForMe = async (tripId: string, userId: string): Promise<boolean> => {
    try {
      await deleteTripForMeMutation.mutateAsync({ tripId, userId });
      return true;
    } catch (e) {
      console.error("Delete trip for me failed", e);
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
    hideTrip,
    deleteTripForMe,
    refreshTrips: refetch,
  };
};
