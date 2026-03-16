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

import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { basecampService } from '@/services/basecampService';
import { demoModeService } from '@/services/demoModeService';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useMutationPermissions } from '@/hooks/useMutationPermissions';
import { BasecampLocation } from '@/types/basecamp';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { withTimeout } from '@/utils/timeout';

// Query key factory for consistent cache management
export const tripBasecampKeys = {
  all: ['tripBasecamp'] as const,
  trip: (tripId: string) => [...tripBasecampKeys.all, tripId] as const,
};

// Audit log prefix for debugging
const LOG_PREFIX = '[TripBasecamp]';

/** Internal type that carries version alongside location */
interface BasecampWithVersion extends BasecampLocation {
  _version?: number;
}

/**
 * Hook to get trip basecamp with proper caching
 */
export function useTripBasecamp(tripId: string | undefined) {
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();

  // Realtime subscription — invalidate cache when another user changes basecamp
  useEffect(() => {
    if (!tripId || isDemoMode) return;

    const channel = supabase
      .channel(`trip_basecamp:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        payload => {
          const newRow = payload.new as Record<string, unknown> | undefined;
          // Only invalidate if basecamp columns actually changed
          if (newRow && ('basecamp_address' in newRow || 'basecamp_name' in newRow)) {
            queryClient.invalidateQueries({ queryKey: tripBasecampKeys.trip(tripId) });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, isDemoMode, queryClient]);

  return useQuery({
    queryKey: tripBasecampKeys.trip(tripId || 'unknown'),
    queryFn: () =>
      withTimeout(
        (async (): Promise<BasecampWithVersion | null> => {
          if (!tripId) {
            console.warn(LOG_PREFIX, 'No tripId provided');
            return null;
          }

          if (isDemoMode) {
            const sessionBasecamp = demoModeService.getSessionTripBasecamp(tripId);

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

          // Authenticated mode: fetch basecamp + version together
          const dbBasecamp = await basecampService.getTripBasecamp(tripId);
          if (!dbBasecamp) return null;

          // Fetch version separately (basecampService doesn't return it)
          const version = await basecampService.getBasecampVersion(tripId);
          return { ...dbBasecamp, _version: version };
        })(),
        10000,
        'Failed to load trip basecamp: Timeout',
      ),
    enabled: !!tripId,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
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
  const permissions = useMutationPermissions(tripId || '');
  // Ref captures previous address before onMutate overwrites cache,
  // so mutationFn can read the real previous address for the system message.
  const previousAddressRef = useRef<string | undefined>(undefined);

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

      // Permission guard: pro/event trips restrict basecamp to admins/organizers
      if (!permissions.canSetBasecamp && !isDemoMode) {
        throw new Error('PERMISSION: Only admins can change the basecamp for this trip.');
      }

      // Guardrail: basecamp is never queued offline (prevent silent overwrites).
      if (!isDemoMode && typeof navigator !== 'undefined' && navigator.onLine === false) {
        throw new Error('OFFLINE: Trip Base Camp updates require an internet connection.');
      }

      if (isDemoMode) {
        demoModeService.setSessionTripBasecamp(tripId, {
          name: newBasecamp.name,
          address: newBasecamp.address,
        });
        return { success: true, address: newBasecamp.address, name: newBasecamp.name };
      }

      // Read version from cache (preserved through optimistic update — see onMutate)
      const cached = queryClient.getQueryData<BasecampWithVersion | null>(
        tripBasecampKeys.trip(tripId),
      );
      const currentVersion = cached?._version ?? undefined;

      // Get previous address from ref (captured in onMutate before cache overwrite)
      const previousAddress = previousAddressRef.current;

      // Authenticated mode: save to database with version check
      const result = await basecampService.setTripBasecamp(tripId, newBasecamp, {
        currentVersion,
        previousAddress,
      });

      if (result.conflict) {
        throw new Error(
          'CONFLICT: Basecamp was modified by another user. Please refresh and try again.',
        );
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to update basecamp');
      }

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

      // Snapshot previous value for rollback and version preservation
      const previousBasecamp = queryClient.getQueryData<BasecampWithVersion | null>(
        tripBasecampKeys.trip(tripId),
      );

      // Capture previous address before cache overwrite (for system message in mutationFn)
      previousAddressRef.current = previousBasecamp?.address ?? undefined;

      // Optimistically update cache — preserve _version so mutationFn reads the correct value
      const optimisticValue: BasecampWithVersion = {
        address: newBasecamp.address,
        name: newBasecamp.name,
        type: 'other',
        coordinates:
          newBasecamp.latitude && newBasecamp.longitude
            ? { lat: newBasecamp.latitude, lng: newBasecamp.longitude }
            : undefined,
        _version: previousBasecamp?._version,
      };

      queryClient.setQueryData(tripBasecampKeys.trip(tripId), optimisticValue);

      return { previousBasecamp, optimisticValue };
    },

    // Rollback on error
    onError: (error, _newBasecamp, context) => {
      if (tripId && context?.previousBasecamp !== undefined) {
        queryClient.setQueryData(tripBasecampKeys.trip(tripId), context.previousBasecamp);
      }

      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('PERMISSION:')) {
        toast.error(msg.replace('PERMISSION: ', ''));
      } else if (msg.includes('OFFLINE:')) {
        toast.error('Trip Base Camp requires an internet connection.');
      } else if (msg.includes('CONFLICT:')) {
        toast.error('Basecamp was updated by someone else. Refreshing...');
        // Re-fetch to get latest version
        if (tripId) {
          queryClient.invalidateQueries({ queryKey: tripBasecampKeys.trip(tripId) });
        }
      } else {
        toast.error('Failed to save basecamp. Please try again.');
      }
    },

    onSuccess: (_data, _variables, context) => {
      toast.success('Basecamp saved!');

      if (tripId && context?.optimisticValue) {
        queryClient.setQueryData(tripBasecampKeys.trip(tripId), context.optimisticValue);
      }

      // Reconcile with server after a short delay to let DB commit propagate.
      // Realtime subscription handles multi-user sync; this is for self-consistency.
      if (tripId) {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: tripBasecampKeys.trip(tripId) });
        }, 1000);
      }
    },

    onSettled: () => {
      // Immediate invalidation skipped to avoid race condition where refetch
      // returns stale data and overwrites the optimistic update.
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
    // Disable retries to prevent hanging on repeated failures
    retry: false,

    mutationFn: async () => {
      if (!tripId) {
        throw new Error('No tripId provided');
      }

      if (isDemoMode) {
        demoModeService.clearSessionTripBasecamp(tripId);
        return { success: true };
      }

      // For authenticated mode, set to empty values
      // basecampService.setTripBasecamp now has 3-tier fallback
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

    onError: (_error, _vars, context) => {
      if (tripId && context?.previousBasecamp) {
        queryClient.setQueryData(tripBasecampKeys.trip(tripId), context.previousBasecamp);
      }

      toast.error('Failed to clear basecamp. Please try again.');
    },

    onSuccess: () => {
      toast.success('Basecamp cleared');

      if (tripId) {
        queryClient.setQueryData(tripBasecampKeys.trip(tripId), null);
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: tripBasecampKeys.trip(tripId) });
        }, 1000);
      }
    },

    onSettled: () => {
      // No immediate invalidation — same pattern as update mutation.
    },
  });
}
