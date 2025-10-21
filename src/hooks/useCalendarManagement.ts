import { useEffect, useState } from 'react';
import { CalendarEvent, AddToCalendarData } from '@/types/calendar';
import { calendarService } from '@/services/calendarService';
import { useToast } from './use-toast';

export type ViewMode = 'calendar' | 'itinerary';

export const useCalendarManagement = (tripId: string) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
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

    loadEvents();
  }, [tripId, toast]);

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event =>
      event.date.toDateString() === date.toDateString()
    );
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !selectedDate || !tripId) return;

    try {
      setIsSaving(true);
      const startDate = new Date(selectedDate);
      const [hours, minutes] = newEvent.time.split(':');
      startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));

      const created = await calendarService.createEvent({
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

      if (created) {
        const formatted = calendarService.convertToCalendarEvent(created);
        setEvents(prev => [...prev, formatted].sort((a, b) =>
          a.date.getTime() - b.date.getTime()
        ));
        resetForm();
        toast({
          title: 'Event added',
          description: 'Your event has been added to the shared calendar.'
        });
      }
    } catch (error) {
      console.error('Failed to create event:', error);
      toast({
        title: 'Unable to create event',
        description: 'Please try again after refreshing the calendar.',
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
    setViewMode(prev => prev === 'calendar' ? 'itinerary' : 'calendar');
  };

  return {
    selectedDate,
    setSelectedDate,
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
