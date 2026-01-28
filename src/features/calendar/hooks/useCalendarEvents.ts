import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calendarService, TripEvent, CreateEventData } from '@/services/calendarService';
import { CalendarEvent } from '@/types/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from '@/hooks/useDemoMode';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';
import { withTimeout } from '@/utils/timeout';
import { errorTracking } from '@/utils/errorTracking';

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

  // Main query for calendar events with proper caching
  const {
    data: events = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: tripKeys.calendar(tripId || ''),
    queryFn: async () => {
      const startTime = performance.now();
      errorTracking.addBreadcrumb({
        category: 'api-call',
        message: 'Calendar events fetch started',
        level: 'info',
        data: { tripId },
      });
      
      const result = await withTimeout(
        calendarService.getTripEvents(tripId!),
        10000,
        'Failed to load calendar events: Timeout'
      );
      
      const durationMs = Math.round(performance.now() - startTime);
      errorTracking.addBreadcrumb({
        category: 'api-call',
        message: `Calendar events loaded: ${result.length} events in ${durationMs}ms`,
        level: durationMs > 3000 ? 'warning' : 'info',
        data: { tripId, count: result.length, durationMs },
      });
      
      return result;
    },
    enabled: !!tripId,
    staleTime: QUERY_CACHE_CONFIG.calendar.staleTime,
    gcTime: QUERY_CACHE_CONFIG.calendar.gcTime,
    refetchOnWindowFocus: QUERY_CACHE_CONFIG.calendar.refetchOnWindowFocus,
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
          // Update cache directly for instant UI updates
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

  // Create event with optimistic update
  const createEventMutation = useMutation({
    mutationFn: async (eventData: CreateEventData) => {
      const result = await calendarService.createEvent(eventData);
      return result.event;
    },
    onMutate: async (newEvent) => {
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
        queryClient.setQueryData<TripEvent[]>(
          tripKeys.calendar(tripId),
          [...previousEvents, optimisticEvent]
        );
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

  // Update event with optimistic update
  const updateEventMutation = useMutation({
    mutationFn: async ({ eventId, updates }: { eventId: string; updates: Partial<TripEvent> }) => {
      await calendarService.updateEvent(eventId, updates);
      return { eventId, updates };
    },
    onMutate: async ({ eventId, updates }) => {
      await queryClient.cancelQueries({ queryKey: tripKeys.calendar(tripId || '') });
      const previousEvents = queryClient.getQueryData<TripEvent[]>(tripKeys.calendar(tripId || ''));

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

  // Delete event with optimistic update
  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      await calendarService.deleteEvent(eventId, tripId);
      return eventId;
    },
    onMutate: async (eventId) => {
      await queryClient.cancelQueries({ queryKey: tripKeys.calendar(tripId || '') });
      const previousEvents = queryClient.getQueryData<TripEvent[]>(tripKeys.calendar(tripId || ''));

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

  // API compatible with original hook
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

  const getCalendarEvents = (): CalendarEvent[] => {
    return events.map(event => calendarService.convertToCalendarEvent(event));
  };

  const refreshEvents = async () => {
    await refetch();
  };

  return {
    events,
    loading,
    createEvent,
    createEventFromCalendar,
    updateEvent,
    deleteEvent,
    refreshEvents,
    getCalendarEvents,
  };
};