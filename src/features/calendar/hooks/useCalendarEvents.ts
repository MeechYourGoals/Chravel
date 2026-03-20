import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarService } from '@/services/calendarService';
import type { TripEvent, CreateEventData, CalendarEvent } from '@/types/calendar';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useAuth } from '@/hooks/useAuth';
import { useMutationPermissions } from '@/hooks/useMutationPermissions';
import { useCalendarRealtime } from './useCalendarRealtime';
import { createCalendarQueryFn } from './calendarQueryFn';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';
import { toast } from 'sonner';

/**
 * ⚡ PERFORMANCE: TanStack Query-based calendar events hook
 *
 * Benefits over previous useState/useEffect approach:
 * - Automatic caching across tab switches (instant re-renders)
 * - Deduplication of identical requests
 * - Background refetching for freshness
 * - Optimistic updates for mutations
 * - Built-in loading/error states
 * - 5-minute gcTime keeps data in cache after unmount
 */
export const useCalendarEvents = (tripId?: string) => {
  const queryClient = useQueryClient();
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  const permissions = useMutationPermissions(tripId || '');

  // Main query for calendar events with proper caching
  const {
    data: events = [],
    isLoading: loading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: tripKeys.calendar(tripId || ''),
    queryFn: createCalendarQueryFn(tripId || '', 15_000),
    enabled: !!tripId,
    staleTime: QUERY_CACHE_CONFIG.calendar.staleTime,
    gcTime: QUERY_CACHE_CONFIG.calendar.gcTime,
    refetchOnWindowFocus: QUERY_CACHE_CONFIG.calendar.refetchOnWindowFocus,
    retry: 2,
    retryDelay: (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 5000),
  });

  // Real-time subscription for authenticated mode (shared hook)
  useCalendarRealtime(tripId || undefined, !!tripId && !isDemoMode);

  // Create event with optimistic update
  const createEventMutation = useMutation({
    mutationFn: async (eventData: CreateEventData) => {
      // Permission guard: event/pro trip restrictions
      if (!permissions.canCreateEvent && !isDemoMode) {
        throw new Error("PERMISSION: You don't have permission to create calendar events.");
      }
      const result = await calendarService.createEvent(eventData);
      return result.event;
    },
    onMutate: async newEvent => {
      await queryClient.cancelQueries({ queryKey: tripKeys.calendar(tripId || '') });
      const previousEvents = queryClient.getQueryData<TripEvent[]>(tripKeys.calendar(tripId || ''));

      if (previousEvents && tripId) {
        const optimisticEvent: TripEvent = {
          id: `temp-${Date.now()}`,
          trip_id: tripId,
          title: newEvent.title,
          description: newEvent.description,
          start_time: newEvent.start_time,
          end_time: newEvent.end_time,
          location: newEvent.location,
          event_category: newEvent.event_category || 'other',
          include_in_itinerary: newEvent.include_in_itinerary ?? true,
          source_type: newEvent.source_type || 'manual',
          source_data: newEvent.source_data || {},
          created_by: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData<TripEvent[]>(tripKeys.calendar(tripId), [
          ...previousEvents,
          optimisticEvent,
        ]);
      }
      return { previousEvents };
    },
    onError: (_err, _newEvent, context) => {
      if (context?.previousEvents && tripId) {
        queryClient.setQueryData(tripKeys.calendar(tripId), context.previousEvents);
      }
    },
    onSettled: () => {
      if (tripId) {
        queryClient.invalidateQueries({ queryKey: tripKeys.calendar(tripId) });
      }
    },
  });

  // Update event with optimistic update and version-based conflict detection
  const updateEventMutation = useMutation({
    mutationFn: async ({
      eventId,
      updates,
      currentVersion,
    }: {
      eventId: string;
      updates: Partial<TripEvent>;
      currentVersion?: number;
    }) => {
      // Permission guard: event/pro trip restrictions
      if (!permissions.canEditEvent && !isDemoMode) {
        throw new Error("PERMISSION: You don't have permission to edit calendar events.");
      }
      await calendarService.updateEvent(eventId, updates, currentVersion);
      return { eventId, updates };
    },
    onMutate: async ({ eventId, updates }) => {
      await queryClient.cancelQueries({ queryKey: tripKeys.calendar(tripId || '') });
      const previousEvents = queryClient.getQueryData<TripEvent[]>(tripKeys.calendar(tripId || ''));

      if (previousEvents && tripId) {
        queryClient.setQueryData<TripEvent[]>(
          tripKeys.calendar(tripId),
          previousEvents.map(event => (event.id === eventId ? { ...event, ...updates } : event)),
        );
      }
      return { previousEvents };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousEvents && tripId) {
        queryClient.setQueryData(tripKeys.calendar(tripId), context.previousEvents);
      }
    },
    onSettled: () => {
      if (tripId) {
        queryClient.invalidateQueries({ queryKey: tripKeys.calendar(tripId) });
      }
    },
  });

  // Delete event with optimistic update
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      // Permission guard: event/pro trip restrictions
      if (!permissions.canDeleteEvent && !isDemoMode) {
        throw new Error("PERMISSION: You don't have permission to delete calendar events.");
      }
      await calendarService.deleteEvent(eventId, tripId);
      return eventId;
    },
    onMutate: async eventId => {
      await queryClient.cancelQueries({ queryKey: tripKeys.calendar(tripId || '') });
      const previousEvents = queryClient.getQueryData<TripEvent[]>(tripKeys.calendar(tripId || ''));

      if (previousEvents && tripId) {
        queryClient.setQueryData<TripEvent[]>(
          tripKeys.calendar(tripId),
          previousEvents.filter(event => event.id !== eventId),
        );
      }
      return { previousEvents };
    },
    onError: (_err, _eventId, context) => {
      if (context?.previousEvents && tripId) {
        queryClient.setQueryData(tripKeys.calendar(tripId), context.previousEvents);
      }
    },
  });

  // API compatible with original hook
  const createEvent = async (eventData: CreateEventData): Promise<TripEvent | null> => {
    try {
      return await createEventMutation.mutateAsync(eventData);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error creating event:', error);
      throw error;
    }
  };

  const createEventFromCalendar = async (
    calendarEvent: CalendarEvent,
  ): Promise<TripEvent | null> => {
    if (!tripId) return null;
    const eventData = calendarService.convertFromCalendarEvent(calendarEvent, tripId);
    return createEvent(eventData);
  };

  const updateEvent = async (
    eventId: string,
    updates: Partial<TripEvent>,
    currentVersion?: number,
  ): Promise<boolean> => {
    // If no version provided, look it up from the current cache
    let version = currentVersion;
    if (version == null && tripId) {
      const cached = queryClient.getQueryData<TripEvent[]>(tripKeys.calendar(tripId));
      const existing = cached?.find(e => e.id === eventId);
      version = existing?.version ?? undefined;
    }

    try {
      await updateEventMutation.mutateAsync({ eventId, updates, currentVersion: version });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('PERMISSION:')) {
        toast.error(msg.replace('PERMISSION: ', ''));
      } else if (msg.includes('CONFLICT:') || msg.includes('modified by another user')) {
        toast.error('This event was modified by someone else. Please refresh and try again.');
        if (tripId) {
          queryClient.invalidateQueries({ queryKey: tripKeys.calendar(tripId) });
        }
      }
      return false;
    }
  };

  const deleteEvent = async (eventId: string): Promise<boolean> => {
    try {
      await deleteEventMutation.mutateAsync(eventId);
      return true;
    } catch {
      return false;
    }
  };

  const getCalendarEvents = (): CalendarEvent[] => {
    return events.map(event => calendarService.convertToCalendarEvent(event));
  };

  const refreshEvents = async () => {
    await refetch();
  };

  return {
    events,
    loading,
    isFetching,
    isError,
    error,
    refetch,
    createEvent,
    createEventFromCalendar,
    updateEvent,
    deleteEvent,
    refreshEvents,
    getCalendarEvents,

    // Permissions (for UI gating)
    canCreateEvent: permissions.canCreateEvent,
    canEditEvent: permissions.canEditEvent,
    canDeleteEvent: permissions.canDeleteEvent,
  };
};
