import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tripService } from '@/services/tripService';
import { archiveService } from '@/services/archiveService';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';
import { EventData } from '@/types/events';

const EVENTS_QUERY_KEY = 'events';

export const useEvents = () => {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery<EventData[]>({
    queryKey: [EVENTS_QUERY_KEY, user?.id, isDemoMode],
    queryFn: async (): Promise<EventData[]> => {
      if (isDemoMode) {
        // Demo events data - return empty for now
        return [];
      }
      if (!user) return [];
      // NOTE: tripService returns Trip[], not EventData[]
      // This needs a proper converter - returning empty for now to fix build
      return [];
    },
    enabled: isDemoMode || !!user,
  });

  const archiveTripMutation = useMutation({
    mutationFn: (id: string) => archiveService.archiveTrip(id, 'event'),
    onMutate: async (tripId) => {
      await queryClient.cancelQueries({ queryKey: [EVENTS_QUERY_KEY] });
      const previousTrips = queryClient.getQueryData([EVENTS_QUERY_KEY, user?.id, isDemoMode]);
      queryClient.setQueryData([EVENTS_QUERY_KEY, user?.id, isDemoMode], (old: EventData[] | undefined) =>
        old ? old.filter((trip) => trip.id !== tripId) : []
      );
      return { previousTrips };
    },
    onError: (err, tripId, context) => {
      queryClient.setQueryData([EVENTS_QUERY_KEY, user?.id, isDemoMode], context?.previousTrips);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const hideTripMutation = useMutation({
    mutationFn: (id: string) => archiveService.hideTrip(id),
    onMutate: async (tripId) => {
      await queryClient.cancelQueries({ queryKey: [EVENTS_QUERY_KEY] });
      const previousTrips = queryClient.getQueryData([EVENTS_QUERY_KEY, user?.id, isDemoMode]);
      queryClient.setQueryData([EVENTS_QUERY_KEY, user?.id, isDemoMode], (old: EventData[] | undefined) =>
        old ? old.filter((trip) => trip.id !== tripId) : []
      );
      return { previousTrips };
    },
    onError: (err, tripId, context) => {
      queryClient.setQueryData([EVENTS_QUERY_KEY, user?.id, isDemoMode], context?.previousTrips);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  const deleteTripForMeMutation = useMutation({
    mutationFn: ({ tripId, userId }: { tripId: string; userId: string }) =>
      archiveService.deleteTripForMe(tripId, userId),
    onMutate: async ({ tripId }) => {
      await queryClient.cancelQueries({ queryKey: [EVENTS_QUERY_KEY] });
      const previousTrips = queryClient.getQueryData([EVENTS_QUERY_KEY, user?.id, isDemoMode]);
      queryClient.setQueryData([EVENTS_QUERY_KEY, user?.id, isDemoMode], (old: EventData[] | undefined) =>
        old ? old.filter((trip) => trip.id !== tripId) : []
      );
      return { previousTrips };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData([EVENTS_QUERY_KEY, user?.id, isDemoMode], context?.previousTrips);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [EVENTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
    },
  });

  return {
    events,
    loading: isLoading,
    archiveTrip: archiveTripMutation.mutateAsync,
    hideTrip: hideTripMutation.mutateAsync,
    deleteTripForMe: deleteTripForMeMutation.mutateAsync,
  };
};
