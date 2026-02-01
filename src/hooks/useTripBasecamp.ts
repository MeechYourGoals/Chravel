/**
 * useTripBasecamp - TanStack Query based hook for trip basecamp persistence
 *
 * This is the canonical source of truth for trip basecamp state.
 * It replaces localStorage-based BasecampContext for persistence.
 *
 * Key features:
 * - Fetches from database (authenticated) or demoModeService (demo)
 * - Proper cache invalidation on mutations
 * - Optimistic updates with rollback
 * - Audit logging for all operations
 * - Cross-device synchronization via refetch
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { basecampService } from '@/services/basecampService';
import { demoModeService } from '@/services/demoModeService';
import { useDemoMode } from '@/hooks/useDemoMode';
import { BasecampLocation } from '@/types/basecamp';
import { toast } from 'sonner';
import { withTimeout } from '@/utils/timeout';

// Query key factory for consistent cache management
export const tripBasecampKeys = {
  all: ['tripBasecamp'] as const,
  trip: (tripId: string) => [...tripBasecampKeys.all, tripId] as const,
};

// Audit log prefix for debugging
const LOG_PREFIX = '[TripBasecamp]';

/**
 * Hook to get trip basecamp with proper caching
 */
export function useTripBasecamp(tripId: string | undefined) {
  const { isDemoMode } = useDemoMode();

  return useQuery({
    queryKey: tripBasecampKeys.trip(tripId || 'unknown'),
    queryFn: () => withTimeout((async (): Promise<BasecampLocation | null> => {
      if (!tripId) {
        console.warn(LOG_PREFIX, 'No tripId provided');
        return null;
      }

      console.log(LOG_PREFIX, 'Fetching basecamp for trip:', tripId, 'isDemoMode:', isDemoMode);

      if (isDemoMode) {
        // Demo mode: use in-memory session storage (NOT localStorage)
        const sessionBasecamp = demoModeService.getSessionTripBasecamp(tripId);
        console.log(LOG_PREFIX, 'Demo mode result:', sessionBasecamp);

        if (sessionBasecamp) {
          return {
            address: sessionBasecamp.address,
            name: sessionBasecamp.name,
            type: 'other',
            coordinates: undefined,
          };
        }
        return null;
      }

      // Authenticated mode: fetch from database
      const dbBasecamp = await basecampService.getTripBasecamp(tripId);
      console.log(LOG_PREFIX, 'DB result:', dbBasecamp);
      return dbBasecamp;
    })(), 10000, 'Failed to load trip basecamp: Timeout'),
    enabled: !!tripId,
    staleTime: 30_000, // Consider fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Always refetch on mount for cross-device sync
  });
}

/**
 * Hook to update trip basecamp with optimistic updates and cache invalidation
 *
 * CRITICAL FIX: The mutation now delays cache invalidation to prevent race conditions
 * where the refetch returns stale data before the database write is fully committed.
 */
export function useUpdateTripBasecamp(tripId: string | undefined) {
  const queryClient = useQueryClient();
  const { isDemoMode } = useDemoMode();

  return useMutation({
    // Disable retries to prevent hanging on repeated failures
    retry: false,

    mutationFn: async (newBasecamp: {
      name?: string;
      address: string;
      latitude?: number;
      longitude?: number;
    }) => {
      if (!tripId) {
        throw new Error('No tripId provided');
      }

      // Guardrail: basecamp is never queued offline (prevent silent overwrites).
      if (!isDemoMode && typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('OFFLINE: Trip Base Camp updates require an internet connection.');
      }

      console.log(LOG_PREFIX, 'Updating basecamp:', {
        tripId,
        isDemoMode,
        newAddress: newBasecamp.address,
        timestamp: new Date().toISOString(),
      });

      if (isDemoMode) {
        // Demo mode: save to in-memory session storage
        demoModeService.setSessionTripBasecamp(tripId, {
          name: newBasecamp.name,
          address: newBasecamp.address,
        });
        console.log(LOG_PREFIX, 'Demo mode save complete');
        return { success: true, address: newBasecamp.address, name: newBasecamp.name };
      }

      // Authenticated mode: save to database
      const result = await basecampService.setTripBasecamp(tripId, newBasecamp);

      console.log(LOG_PREFIX, 'DB update result:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update basecamp');
      }

      // Return the saved values so onSuccess can use them to update cache directly
      return {
        ...result,
        address: newBasecamp.address,
        name: newBasecamp.name,
      };
    },

    // Optimistic update: immediately show new value in UI
    onMutate: async newBasecamp => {
      if (!tripId) return;

      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: tripBasecampKeys.trip(tripId) });

      // Snapshot previous value for rollback
      const previousBasecamp = queryClient.getQueryData<BasecampLocation | null>(
        tripBasecampKeys.trip(tripId),
      );

      // Optimistically update cache
      const optimisticValue: BasecampLocation = {
        address: newBasecamp.address,
        name: newBasecamp.name,
        type: 'other',
        coordinates:
          newBasecamp.latitude && newBasecamp.longitude
            ? { lat: newBasecamp.latitude, lng: newBasecamp.longitude }
            : undefined,
      };

      queryClient.setQueryData(tripBasecampKeys.trip(tripId), optimisticValue);

      console.log(LOG_PREFIX, 'Optimistic update applied:', optimisticValue.address);

      // Return context with previous value for rollback
      return { previousBasecamp, optimisticValue };
    },

    // Rollback on error
    onError: (error, _newBasecamp, context) => {
      console.error(LOG_PREFIX, 'Update failed, rolling back:', error);

      if (tripId && context?.previousBasecamp !== undefined) {
        queryClient.setQueryData(tripBasecampKeys.trip(tripId), context.previousBasecamp);
      }

      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('OFFLINE:')) {
        toast.error('Trip Base Camp requires an internet connection.');
      } else {
        toast.error('Failed to save basecamp. Please try again.');
      }
    },

    // On success: confirm the optimistic value is correct, then schedule a delayed refetch
    onSuccess: (data, _variables, context) => {
      console.log(LOG_PREFIX, 'Update successful, confirming cache value');
      toast.success('Basecamp saved!');

      if (tripId && context?.optimisticValue) {
        // The optimistic update should already have the correct value
        // Re-set it to ensure it wasn't overwritten by any concurrent operations
        queryClient.setQueryData(tripBasecampKeys.trip(tripId), context.optimisticValue);
      }

      // Schedule a delayed refetch to sync with server (after DB write is fully committed)
      // This is a background operation - the UI already shows the correct value
      if (tripId) {
        setTimeout(() => {
          console.log(LOG_PREFIX, 'Performing delayed background refetch for consistency');
          queryClient.invalidateQueries({ queryKey: tripBasecampKeys.trip(tripId) });
        }, 2000); // 2 second delay to ensure DB replication
      }
    },

    // onSettled is now a no-op - we handle cache updates in onSuccess and onError
    onSettled: () => {
      // Do NOT invalidate immediately - this causes the race condition
      // where refetch returns stale data and overwrites the optimistic update
      console.log(LOG_PREFIX, 'Mutation settled');
    },
  });
}

/**
 * Hook to clear trip basecamp
 */
export function useClearTripBasecamp(tripId: string | undefined) {
  const queryClient = useQueryClient();
  const { isDemoMode } = useDemoMode();

  return useMutation({
    mutationFn: async () => {
      if (!tripId) {
        throw new Error('No tripId provided');
      }

      console.log(LOG_PREFIX, 'Clearing basecamp for trip:', tripId);

      if (isDemoMode) {
        demoModeService.clearSessionTripBasecamp(tripId);
        return { success: true };
      }

      // For authenticated mode, set to empty values
      // The database RPC should handle this
      const result = await basecampService.setTripBasecamp(tripId, {
        name: '',
        address: '',
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to clear basecamp');
      }

      return result;
    },

    onMutate: async () => {
      if (!tripId) return;

      await queryClient.cancelQueries({ queryKey: tripBasecampKeys.trip(tripId) });

      const previousBasecamp = queryClient.getQueryData<BasecampLocation | null>(
        tripBasecampKeys.trip(tripId),
      );

      // Optimistically clear
      queryClient.setQueryData(tripBasecampKeys.trip(tripId), null);

      return { previousBasecamp };
    },

    onError: (error, _vars, context) => {
      console.error(LOG_PREFIX, 'Clear failed:', error);

      if (tripId && context?.previousBasecamp) {
        queryClient.setQueryData(tripBasecampKeys.trip(tripId), context.previousBasecamp);
      }

      toast.error('Failed to clear basecamp. Please try again.');
    },

    onSettled: () => {
      if (tripId) {
        queryClient.invalidateQueries({ queryKey: tripBasecampKeys.trip(tripId) });
      }
    },

    onSuccess: () => {
      console.log(LOG_PREFIX, 'Basecamp cleared');
      toast.success('Basecamp cleared');
    },
  });
}
