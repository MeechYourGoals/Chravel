/**
 * Unified mutation hook for deleting/archiving trips from the home page.
 *
 * Provides:
 * - Optimistic removal from the ['trips'] cache (instant UI update).
 * - Correct creator vs member path via tripDeletionService.
 * - Rollback on error.
 * - Invalidates ['trips'] on settled so server state re-syncs.
 *
 * All UI entry points (TripCard, TripGrid swipe, EventCard, MobileDetail pages)
 * should use this hook instead of calling archiveService directly.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { executeDeleteTrip, DeletionContext, DeletionResult } from '@/services/tripDeletionService';
import { useAuth } from './useAuth';
import { useDemoMode } from './useDemoMode';
import { Trip } from '@/services/tripService';

const TRIPS_QUERY_KEY = 'trips';

export function useDeleteTrip() {
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();

  const mutation = useMutation<DeletionResult, Error, DeletionContext, { previousTrips: unknown }>({
    mutationFn: (ctx: DeletionContext) => executeDeleteTrip(ctx),

    onMutate: async (ctx) => {
      // Cancel in-flight queries to avoid race conditions
      await queryClient.cancelQueries({ queryKey: [TRIPS_QUERY_KEY] });

      // Snapshot current cache for rollback
      const previousTrips = queryClient.getQueryData([TRIPS_QUERY_KEY, user?.id, isDemoMode]);

      // Optimistic removal: immediately remove the trip from cached list
      queryClient.setQueryData(
        [TRIPS_QUERY_KEY, user?.id, isDemoMode],
        (old: Trip[] | undefined) =>
          old ? old.filter(trip => trip.id !== ctx.tripId) : [],
      );

      return { previousTrips };
    },

    onError: (_err, _ctx, context) => {
      // Rollback optimistic update
      if (context?.previousTrips) {
        queryClient.setQueryData(
          [TRIPS_QUERY_KEY, user?.id, isDemoMode],
          context.previousTrips,
        );
      }
    },

    onSettled: () => {
      // Always re-sync with server
      queryClient.invalidateQueries({ queryKey: [TRIPS_QUERY_KEY] });
      // Also invalidate stale Pro/Event query keys so those views stay consistent
      queryClient.invalidateQueries({ queryKey: ['proTrips'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  /**
   * Execute deletion for a trip.
   * @param tripId  - The trip/event ID to remove.
   * @param createdBy - The `created_by` field from the trip. Used to determine creator vs member.
   */
  const deleteTrip = async (
    tripId: string,
    createdBy?: string,
  ): Promise<DeletionResult> => {
    if (!user?.id) {
      throw new Error('AUTHENTICATION_REQUIRED');
    }

    const isCreator = user.id === createdBy;

    return mutation.mutateAsync({
      tripId,
      userId: user.id,
      isCreator,
      isDemoMode,
    });
  };

  return {
    deleteTrip,
    isDeleting: mutation.isPending,
  };
}
