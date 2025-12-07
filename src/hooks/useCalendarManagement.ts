import { useEffect, useState } from 'react';
import { CalendarEvent, AddToCalendarData } from '@/types/calendar';
import { calendarService } from '@/services/calendarService';
import { useToast } from './use-toast';

export type ViewMode = 'calendar' | 'itinerary' | 'grid';

export const useCalendarManagement = (tripId: string) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
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
    include_in_itinerary: true
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!tripId) {
      setEvents([]);
      setIsLoading(false);
      return;
    }

    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const tripEvents = await calendarService.getTripEvents(tripId);
        const formatted = tripEvents.map(calendarService.convertToCalendarEvent);
        setEvents(formatted);
      } catch (error) {
        console.error('Failed to load calendar events:', error);
        toast({
          title: 'Unable to load events',
          description: 'We had trouble retrieving the calendar. Please try again.',
          variant: 'destructive'
        });
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Set a timeout to prevent infinite loading (safety net)
    const timeoutId = setTimeout(() => {
      console.warn('Calendar loading timeout - forcing load complete');
      setIsLoading(false);
    }, 10000); // 10 second timeout

    loadEvents();
    
    return () => clearTimeout(timeoutId);
  }, [tripId, toast]);

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event =>
      event.date.toDateString() === date.toDateString()
    );
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !selectedDate || !tripId) {
      toast({
        title: 'Missing required fields',
        description: 'Please enter a title for the event.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSaving(true);
      const startDate = new Date(selectedDate);
      const [hours, minutes] = newEvent.time.split(':');
      startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));

      const result = await calendarService.createEvent({
        trip_id: tripId,
        title: newEvent.title,
        description: newEvent.description,
        start_time: startDate.toISOString(),
        end_time: undefined,
        location: newEvent.location,
        event_category: newEvent.category,
        include_in_itinerary: newEvent.include_in_itinerary ?? true,
        source_type: 'manual',
        source_data: {}
      });

      if (result.event) {
        const formatted = calendarService.convertToCalendarEvent(result.event);
        setEvents(prev => [...prev, formatted].sort((a, b) =>
          a.date.getTime() - b.date.getTime()
        ));
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
            description: 'Your event has been added to the shared calendar.'
          });
        }
      } else {
        toast({
          title: 'Unable to create event',
          description: 'Something went wrong. Please try again.',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Unable to create event',
        description: errorMessage.includes('permission') || errorMessage.includes('RLS') 
          ? 'You may not have permission to add events to this trip.'
          : errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!tripId) return;

    try {
      setIsSaving(true);
      const removed = await calendarService.deleteEvent(eventId, tripId);
      if (removed) {
        setEvents(prev => prev.filter(e => e.id !== eventId));
        toast({
          title: 'Event removed',
          description: 'The event has been removed from the calendar.'
        });
      }
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast({
        title: 'Unable to delete event',
        description: 'Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateEvent = async (eventId: string, eventData: AddToCalendarData) => {
    if (!tripId) return;

    try {
      setIsSaving(true);
      const startDate = new Date(eventData.date);
      const [hours, minutes] = eventData.time.split(':');
      startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));

      const updated = await calendarService.updateEvent(eventId, {
        title: eventData.title,
        description: eventData.description,
        start_time: startDate.toISOString(),
        location: eventData.location,
        event_category: eventData.category,
        include_in_itinerary: eventData.include_in_itinerary ?? true
      });

      if (updated) {
        // Reload events to get the updated data
        const tripEvents = await calendarService.getTripEvents(tripId);
        const formatted = tripEvents.map(calendarService.convertToCalendarEvent);
        setEvents(formatted);
        setEditingEvent(null);
        toast({
          title: 'Event updated',
          description: 'Your changes have been saved.'
        });
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      toast({
        title: 'Unable to update event',
        description: 'Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateEventField = <K extends keyof AddToCalendarData>(
    field: K,
    value: AddToCalendarData[K]
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
      include_in_itinerary: true
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

  return {
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    events,
    setEvents,
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
    isSaving
  };
};
