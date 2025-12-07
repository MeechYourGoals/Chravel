import { useState, useEffect } from 'react';
import { calendarService, TripEvent, CreateEventData } from '@/services/calendarService';
import { CalendarEvent } from '@/types/calendar';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from './useDemoMode';

export const useCalendarEvents = (tripId?: string) => {
  const [events, setEvents] = useState<TripEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const { isDemoMode } = useDemoMode();

  useEffect(() => {
    if (tripId) {
      loadEvents();
    }
  }, [tripId]);

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
          if (payload.eventType === 'INSERT') {
            setEvents(prev => [...prev, payload.new as TripEvent]);
          } else if (payload.eventType === 'UPDATE') {
            setEvents(prev => 
              prev.map(event => 
                event.id === payload.new.id ? payload.new as TripEvent : event
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setEvents(prev => prev.filter(event => event.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, isDemoMode]);

  const loadEvents = async () => {
    if (!tripId) return;

    setLoading(true);
    try {
      const tripEvents = await calendarService.getTripEvents(tripId);
      setEvents(tripEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData: CreateEventData): Promise<TripEvent | null> => {
    try {
      // Use conflict-checking RPC if authenticated
      if (!isDemoMode && eventData.trip_id) {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data, error } = await supabase.rpc('create_event_with_conflict_check', {
          p_trip_id: eventData.trip_id,
          p_title: eventData.title,
          p_description: eventData.description || '',
          p_location: eventData.location || '',
          p_start_time: eventData.start_time,
          p_end_time: eventData.end_time || eventData.start_time,
          p_created_by: user?.id || ''
        });

        if (error) {
          // Check if it's a conflict error
          if (error.message?.toLowerCase().includes('conflict')) {
            console.warn('Calendar conflict detected:', error.message);
            // Continue anyway - we'll allow overlapping events
          } else {
            throw error;
          }
        }

        if (data) {
          const newEvent = {
            ...eventData,
            id: data
          } as TripEvent;
          setEvents(prevEvents => [...prevEvents, newEvent]);
          return newEvent;
        }
      }
      
      // Fallback to regular creation for demo mode or if RPC fails
      const result = await calendarService.createEvent(eventData);
      if (result.event) {
        setEvents(prevEvents => [...prevEvents, result.event!]);
      }
      return result.event;
    } catch (error) {
      console.error('Error creating event:', error);
      // Fallback to regular creation
      const result = await calendarService.createEvent(eventData);
      if (result.event) {
        setEvents(prevEvents => [...prevEvents, result.event!]);
      }
      return result.event;
    }
  };

  const createEventFromCalendar = async (calendarEvent: CalendarEvent): Promise<TripEvent | null> => {
    if (!tripId) return null;
    
    const eventData = calendarService.convertFromCalendarEvent(calendarEvent, tripId);
    return createEvent(eventData);
  };

  const updateEvent = async (eventId: string, updates: Partial<TripEvent>): Promise<boolean> => {
    const success = await calendarService.updateEvent(eventId, updates);
    if (success) {
      setEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === eventId ? { ...event, ...updates } : event
        )
      );
    }
    return success;
  };

  const deleteEvent = async (eventId: string): Promise<boolean> => {
    const success = await calendarService.deleteEvent(eventId, tripId);
    if (success) {
      setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
    }
    return success;
  };

  // Convert to CalendarEvent format for components that expect it
  const getCalendarEvents = (): CalendarEvent[] => {
    return events.map(event => calendarService.convertToCalendarEvent(event));
  };

  return {
    events,
    loading,
    createEvent,
    createEventFromCalendar,
    updateEvent,
    deleteEvent,
    refreshEvents: loadEvents,
    getCalendarEvents
  };
};