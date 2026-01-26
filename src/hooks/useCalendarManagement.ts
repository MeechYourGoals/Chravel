import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarEvent, AddToCalendarData } from '@/types/calendar';
import { calendarService, TripEvent } from '@/services/calendarService';
import { demoModeService } from '@/services/demoModeService';
import { useDemoMode } from './useDemoMode';
import { useToast } from './use-toast';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';
import { withTimeout } from '@/utils/timeout';

export type ViewMode = 'calendar' | 'itinerary' | 'grid';

/**
 * ⚡ PERFORMANCE: Enhanced calendar management hook with TanStack Query caching
 *
 * Benefits:
 * - Instant tab switching (data cached for 10 minutes)
 * - Optimistic updates for create/update/delete
 * - Automatic background refetching
 * - Real-time sync via subscription
 */
export const useCalendarManagement = (tripId: string) => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [newEvent, setNewEvent] = useState<AddToCalendarData>({
    title: '',
    date: new Date(),
    time: '12:00',
    location: '',
    description: '',
    category: 'other',
    include_in_itinerary: true,
  });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();

  // ⚡ PERFORMANCE: Use TanStack Query for caching
  const {
    data: tripEvents = [],
    isLoading,
    refetch: refreshEvents,
  } = useQuery({
    queryKey: tripKeys.calendar(tripId),
    queryFn: () => withTimeout(
      calendarService.getTripEvents(tripId),
      10000,
      'Failed to load calendar events: Timeout'
    ),
    enabled: !!tripId,
    staleTime: QUERY_CACHE_CONFIG.calendar.staleTime,
    gcTime: QUERY_CACHE_CONFIG.calendar.gcTime,
    refetchOnWindowFocus: QUERY_CACHE_CONFIG.calendar.refetchOnWindowFocus,
  });

  // Convert TripEvents to CalendarEvents for UI
  const events: CalendarEvent[] = tripEvents.map(calendarService.convertToCalendarEvent);

  const getEventsForDate = useCallback(
    (date: Date): CalendarEvent[] => {
      // Get regular events for this date
      const regularEvents = events.filter(
        event => event.date.toDateString() === date.toDateString(),
      );

      // In demo mode for Cancun trip (ID "1"), inject dynamic demo events
      if (isDemoMode && tripId === '1') {
        const dynamicDemoEvents = demoModeService.getDynamicDemoEventsForDate(tripId, date);
        // Convert TripEvent to CalendarEvent format
        const demoCalendarEvents: CalendarEvent[] = dynamicDemoEvents.map(evt =>
          calendarService.convertToCalendarEvent(evt),
        );

        // Merge, avoiding duplicates by ID
        const existingIds = new Set(regularEvents.map(e => e.id));
        const newDemoEvents = demoCalendarEvents.filter(e => !existingIds.has(e.id));
        return [...regularEvents, ...newDemoEvents];
      }

      return regularEvents;
    },
    [events, isDemoMode, tripId],
  );

  // Create mutation with optimistic update
  const createMutation = useMutation({
    mutationFn: async (eventData: {
      trip_id: string;
      title: string;
      description?: string;
      start_time: string;
      end_time?: string;
      location?: string;
      event_category?: string;
      include_in_itinerary?: boolean;
      source_type?: string;
      source_data?: any;
    }) => {
      return calendarService.createEvent(eventData);
    },
    onMutate: async newEventData => {
      await queryClient.cancelQueries({ queryKey: tripKeys.calendar(tripId) });
      const previousEvents = queryClient.getQueryData<TripEvent[]>(tripKeys.calendar(tripId));

      // Optimistic update
      if (previousEvents) {
        const optimisticEvent: TripEvent = {
          id: `temp-${Date.now()}`,
          trip_id: tripId,
          title: newEventData.title,
          description: newEventData.description,
          start_time: newEventData.start_time,
          end_time: newEventData.end_time,
          location: newEventData.location,
          event_category: newEventData.event_category || 'other',
          include_in_itinerary: newEventData.include_in_itinerary ?? true,
          source_type: 'manual',
          source_data: {},
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
      if (context?.previousEvents) {
        queryClient.setQueryData(tripKeys.calendar(tripId), context.previousEvents);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.calendar(tripId) });
    },
  });

  const handleAddEvent = async () => {
    if (!newEvent.title || !selectedDate || !tripId) {
      toast({
        title: 'Missing required fields',
        description: 'Please enter a title for the event.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      const startDate = new Date(selectedDate);
      const [hours, minutes] = newEvent.time.split(':');
      startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));

      const result = await createMutation.mutateAsync({
        trip_id: tripId,
        title: newEvent.title,
        description: newEvent.description,
        start_time: startDate.toISOString(),
        end_time: undefined,
        location: newEvent.location,
        event_category: newEvent.category,
        include_in_itinerary: newEvent.include_in_itinerary ?? true,
        source_type: 'manual',
        source_data: {},
      });

      if (result.event) {
        setShowAddEvent(false);
        resetForm();

        // Show conflict warning if overlapping events exist
        if (result.conflicts.length > 0) {
          toast({
            title: 'Event added with overlap',
            description: `Note: This event overlaps with "${result.conflicts[0]}"${result.conflicts.length > 1 ? ` and ${result.conflicts.length - 1} other event(s)` : ''}.`,
          });
        } else {
          toast({
            title: 'Event added',
            description: 'Your event has been added to the shared calendar.',
          });
        }
      } else {
        toast({
          title: 'Unable to create event',
          description: 'Something went wrong. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Unable to create event',
        description:
          errorMessage.includes('permission') || errorMessage.includes('RLS')
            ? 'You may not have permission to add events to this trip.'
            : errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete mutation with optimistic update
  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      return calendarService.deleteEvent(eventId, tripId);
    },
    onMutate: async eventId => {
      await queryClient.cancelQueries({ queryKey: tripKeys.calendar(tripId) });
      const previousEvents = queryClient.getQueryData<TripEvent[]>(tripKeys.calendar(tripId));

      if (previousEvents) {
        queryClient.setQueryData<TripEvent[]>(
          tripKeys.calendar(tripId),
          previousEvents.filter(e => e.id !== eventId),
        );
      }

      return { previousEvents };
    },
    onError: (_err, _eventId, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(tripKeys.calendar(tripId), context.previousEvents);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.calendar(tripId) });
    },
  });

  const deleteEvent = async (eventId: string) => {
    if (!tripId) return;

    try {
      setIsSaving(true);
      const removed = await deleteMutation.mutateAsync(eventId);
      if (removed) {
        toast({
          title: 'Event removed',
          description: 'The event has been removed from the calendar.',
        });
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast({
        title: 'Unable to delete event',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Update mutation with optimistic update
  const updateMutation = useMutation({
    mutationFn: async ({ eventId, updates }: { eventId: string; updates: Partial<TripEvent> }) => {
      return calendarService.updateEvent(eventId, updates);
    },
    onMutate: async ({ eventId, updates }) => {
      await queryClient.cancelQueries({ queryKey: tripKeys.calendar(tripId) });
      const previousEvents = queryClient.getQueryData<TripEvent[]>(tripKeys.calendar(tripId));

      if (previousEvents) {
        queryClient.setQueryData<TripEvent[]>(
          tripKeys.calendar(tripId),
          previousEvents.map(e => (e.id === eventId ? { ...e, ...updates } : e)),
        );
      }

      return { previousEvents };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(tripKeys.calendar(tripId), context.previousEvents);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.calendar(tripId) });
    },
  });

  const updateEvent = async (eventId: string, eventData: AddToCalendarData): Promise<boolean> => {
    if (!tripId) {
      toast({
        title: 'Unable to update event',
        description: 'Trip ID is missing.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setIsSaving(true);
      const startDate = new Date(eventData.date);
      const [hours, minutes] = eventData.time.split(':');
      startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));

      const updated = await updateMutation.mutateAsync({
        eventId,
        updates: {
          title: eventData.title,
          description: eventData.description,
          start_time: startDate.toISOString(),
          location: eventData.location,
          event_category: eventData.category,
          include_in_itinerary: eventData.include_in_itinerary ?? true,
        },
      });

      if (updated) {
        setEditingEvent(null);
        setShowAddEvent(false);
        toast({
          title: 'Event updated',
          description: 'Your changes have been saved.',
        });
        return true;
      } else {
        toast({
          title: 'Unable to update event',
          description: 'The update did not complete. Please try again.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Unable to update event',
        description:
          errorMessage.includes('permission') || errorMessage.includes('RLS')
            ? 'You may not have permission to edit this event.'
            : errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const updateEventField = <K extends keyof AddToCalendarData>(
    field: K,
    value: AddToCalendarData[K],
  ) => {
    setNewEvent(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setNewEvent({
      title: '',
      date: selectedDate || new Date(),
      time: '12:00',
      location: '',
      description: '',
      category: 'other',
      include_in_itinerary: true,
    });
    setShowAddEvent(false);
  };

  const toggleViewMode = () => {
    setViewMode(prev => {
      if (prev === 'calendar') return 'grid';
      if (prev === 'grid') return 'itinerary';
      return 'calendar';
    });
  };

  // Setter for events (for backwards compatibility with components that set events directly)
  const setEvents = useCallback(
    (updater: CalendarEvent[] | ((prev: CalendarEvent[]) => CalendarEvent[])) => {
      // Convert CalendarEvents back to TripEvents and update cache
      const newEvents = typeof updater === 'function' ? updater(events) : updater;
      const tripEventData = newEvents.map(
        e =>
          ({
            id: e.id,
            trip_id: tripId,
            title: e.title,
            description: e.description,
            start_time: e.date.toISOString(),
            end_time: undefined,
            location: e.location,
            event_category: e.event_category || 'other',
            include_in_itinerary: e.include_in_itinerary ?? true,
            source_type: 'manual',
            source_data: {},
            created_by: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }) as TripEvent,
      );

      queryClient.setQueryData(tripKeys.calendar(tripId), tripEventData);
    },
    [events, tripId, queryClient],
  );

  return {
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    events,
    setEvents,
    // Raw TripEvent array for ICS import deduplication
    tripEvents,
    showAddEvent,
    setShowAddEvent,
    editingEvent,
    setEditingEvent,
    viewMode,
    setViewMode,
    toggleViewMode,
    newEvent,
    updateEventField,
    getEventsForDate,
    handleAddEvent,
    updateEvent,
    deleteEvent,
    resetForm,
    isLoading,
    isSaving,
    // Expose refresh function
    refreshEvents,
  };
};
