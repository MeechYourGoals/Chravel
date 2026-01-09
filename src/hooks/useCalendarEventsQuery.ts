import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { calendarService, TripEvent, CreateEventData } from '@/services/calendarService';
import { CalendarEvent } from '@/types/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from './useDemoMode';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';

/**
 * TanStack Query-based calendar events hook
 * 
 * Benefits over useState/useEffect approach:
 * - Automatic caching across tab switches
 * - Deduplication of identical requests
 * - Background refetching for freshness
 * - Optimistic updates for mutations
 * - Built-in loading/error states
 */
export const useCalendarEventsQuery = (tripId?: string) => {
  const queryClient = useQueryClient();
  const { isDemoMode } = useDemoMode();

  // Main query for calendar events
  const {
    data: events = [],
    isLoading: loading,
    error,
    refetch: refreshEvents,
  } = useQuery({
    queryKey: tripKeys.calendar(tripId || ''),
    queryFn: () => calendarService.getTripEvents(tripId!),
    enabled: !!tripId,
    ...QUERY_CACHE_CONFIG.calendar,
  });

  // Real-time subscription for authenticated mode
  useEffect(() => {
    if (!tripId || isDemoMode) return;

    const channel = supabase
      .channel(`trip_events:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trip_events',
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          // Update cache based on change type
          queryClient.setQueryData<TripEvent[]>(
            tripKeys.calendar(tripId),
            (oldEvents = []) => {
              if (payload.eventType === 'INSERT') {
                return [...oldEvents, payload.new as TripEvent];
              } else if (payload.eventType === 'UPDATE') {
                return oldEvents.map(event =>
                  event.id === payload.new.id ? (payload.new as TripEvent) : event
                );
              } else if (payload.eventType === 'DELETE') {
                return oldEvents.filter(event => event.id !== payload.old.id);
              }
              return oldEvents;
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, isDemoMode, queryClient]);

  // Create event mutation with optimistic update
  const createEventMutation = useMutation({
    mutationFn: async (eventData: CreateEventData) => {
      const result = await calendarService.createEvent(eventData);
      if (!result.event) {
        throw new Error('Failed to create event');
      }
      return result.event;
    },
    onMutate: async (newEvent) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: tripKeys.calendar(tripId || '') });

      // Snapshot previous value
      const previousEvents = queryClient.getQueryData<TripEvent[]>(
        tripKeys.calendar(tripId || '')
      );

      // Optimistically add new event
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

        queryClient.setQueryData<TripEvent[]>(
          tripKeys.calendar(tripId),
          [...previousEvents, optimisticEvent]
        );
      }

      return { previousEvents };
    },
    onError: (_err, _newEvent, context) => {
      // Rollback on error
      if (context?.previousEvents && tripId) {
        queryClient.setQueryData(tripKeys.calendar(tripId), context.previousEvents);
      }
    },
    onSettled: () => {
      // Refetch to ensure server state
      if (tripId) {
        queryClient.invalidateQueries({ queryKey: tripKeys.calendar(tripId) });
      }
    },
  });

  // Update event mutation
  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, updates }: { eventId: string; updates: Partial<TripEvent> }) => {
      const success = await calendarService.updateEvent(eventId, updates);
      if (!success) {
        throw new Error('Failed to update event');
      }
      return { eventId, updates };
    },
    onMutate: async ({ eventId, updates }) => {
      await queryClient.cancelQueries({ queryKey: tripKeys.calendar(tripId || '') });

      const previousEvents = queryClient.getQueryData<TripEvent[]>(
        tripKeys.calendar(tripId || '')
      );

      if (previousEvents && tripId) {
        queryClient.setQueryData<TripEvent[]>(
          tripKeys.calendar(tripId),
          previousEvents.map(event =>
            event.id === eventId ? { ...event, ...updates } : event
          )
        );
      }

      return { previousEvents };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousEvents && tripId) {
        queryClient.setQueryData(tripKeys.calendar(tripId), context.previousEvents);
      }
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const success = await calendarService.deleteEvent(eventId, tripId);
      if (!success) {
        throw new Error('Failed to delete event');
      }
      return eventId;
    },
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey: tripKeys.calendar(tripId || '') });

      const previousEvents = queryClient.getQueryData<TripEvent[]>(
        tripKeys.calendar(tripId || '')
      );

      if (previousEvents && tripId) {
        queryClient.setQueryData<TripEvent[]>(
          tripKeys.calendar(tripId),
          previousEvents.filter(event => event.id !== eventId)
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

  // Helper functions matching original API
  const createEvent = async (eventData: CreateEventData): Promise<TripEvent | null> => {
    try {
      return await createEventMutation.mutateAsync(eventData);
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  };

  const createEventFromCalendar = async (calendarEvent: CalendarEvent): Promise<TripEvent | null> => {
    if (!tripId) return null;
    const eventData = calendarService.convertFromCalendarEvent(calendarEvent, tripId);
    return createEvent(eventData);
  };

  const updateEvent = async (eventId: string, updates: Partial<TripEvent>): Promise<boolean> => {
    try {
      await updateEventMutation.mutateAsync({ eventId, updates });
      return true;
    } catch {
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

  // Convert to CalendarEvent format for components that expect it
  const getCalendarEvents = (): CalendarEvent[] => {
    return events.map(event => calendarService.convertToCalendarEvent(event));
  };

  return {
    events,
    loading,
    error,
    createEvent,
    createEventFromCalendar,
    updateEvent,
    deleteEvent,
    refreshEvents,
    getCalendarEvents,
    // Expose mutation states for loading indicators
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
  };
};
