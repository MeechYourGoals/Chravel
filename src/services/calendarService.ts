import { supabase } from '@/integrations/supabase/client';
import { CalendarEvent } from '@/types/calendar';
import { demoModeService } from './demoModeService';
import { calendarStorageService } from './calendarStorageService';

export interface TripEvent {
  id: string;
  trip_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  event_category: string;
  include_in_itinerary: boolean;
  source_type: string;
  source_data: any;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEventData {
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
  // Recurring event support
  recurrence_rule?: string;
  recurrence_exceptions?: string[];
  // Busy/free time blocking
  is_busy?: boolean;
  availability_status?: 'busy' | 'free' | 'tentative';
}

export const calendarService = {
  async createEvent(eventData: CreateEventData): Promise<TripEvent | null> {
    try {
      // Check if in demo mode
      const isDemoMode = await demoModeService.isDemoModeEnabled();
      
      if (isDemoMode) {
        // Use localStorage for demo mode
        return await calendarStorageService.createEvent(eventData);
      }

      // Use Supabase with conflict detection for authenticated users
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Use atomic function to create event with conflict detection
      const { data: eventId, error } = await supabase
        .rpc('create_event_with_conflict_check', {
          p_trip_id: eventData.trip_id,
          p_title: eventData.title,
          p_description: eventData.description || '',
          p_location: eventData.location || '',
          p_start_time: eventData.start_time,
          p_end_time: eventData.end_time || null,
          p_created_by: user.id,
          p_recurrence_rule: eventData.recurrence_rule || null,
          p_is_busy: eventData.is_busy ?? true,
          p_availability_status: eventData.availability_status || 'busy'
        });

      if (error) throw error;
      
      // Fetch the created event to return complete data with creator profile
      const { data: createdEvent, error: fetchError } = await supabase
        .from('trip_events')
        .select(`
          *,
          creator:created_by (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('id', eventId)
        .single();

      if (fetchError) throw fetchError;
      return createdEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      return null;
    }
  },

  async getTripEvents(tripId: string): Promise<TripEvent[]> {
    try {
      // Check if in demo mode
      const isDemoMode = await demoModeService.isDemoModeEnabled();
      
      if (isDemoMode) {
        // Use localStorage for demo mode
        return await calendarStorageService.getEvents(tripId);
      }

      // Use Supabase with timezone-aware function for authenticated users
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Fallback to direct query if no user
        const { data, error } = await supabase
          .from('trip_events')
          .select(`
            *,
            creator:created_by (
              id,
              display_name,
              avatar_url
            )
          `)
          .eq('trip_id', tripId)
          .order('start_time', { ascending: true });
        
        if (error) throw error;
        return data || [];
      }

      // Use timezone-aware function
      const { data: timezoneData, error: tzError } = await supabase
        .rpc('get_events_in_user_tz', {
          p_trip_id: tripId,
          p_user_id: user.id
        });

      if (tzError) {
        // Fallback to direct query if timezone function fails
        console.warn('Timezone function failed, using direct query:', tzError);
        const { data, error } = await supabase
          .from('trip_events')
          .select(`
            *,
            creator:created_by (
              id,
              display_name,
              avatar_url
            )
          `)
          .eq('trip_id', tripId)
          .order('start_time', { ascending: true });
        
        if (error) throw error;
        return data || [];
      }

      // Fetch full event details with creator info
      if (!timezoneData || timezoneData.length === 0) {
        return [];
      }

      const eventIds = timezoneData.map((e: any) => e.id);
      const { data: fullEvents, error: fetchError } = await supabase
        .from('trip_events')
        .select(`
          *,
          creator:created_by (
            id,
            display_name,
            avatar_url
          )
        `)
        .in('id', eventIds)
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;
      return fullEvents || [];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  },

  async updateEvent(eventId: string, updates: Partial<TripEvent>): Promise<boolean> {
    try {
      // Check if in demo mode
      const isDemoMode = await demoModeService.isDemoModeEnabled();
      
      if (isDemoMode) {
        // Extract trip_id from the eventId or use updates
        const tripId = updates.trip_id || eventId.split('-')[0]; // Fallback logic
        const updatedEvent = await calendarStorageService.updateEvent(tripId, eventId, updates);
        return updatedEvent !== null;
      }

      // Use Supabase for authenticated users
      const { error } = await supabase
        .from('trip_events')
        .update(updates)
        .eq('id', eventId);

      return !error;
    } catch (error) {
      console.error('Error updating event:', error);
      return false;
    }
  },

  async deleteEvent(eventId: string, tripId?: string): Promise<boolean> {
    try {
      // Check if in demo mode
      const isDemoMode = await demoModeService.isDemoModeEnabled();
      
      if (isDemoMode) {
        // For demo mode, we need the trip ID to delete from localStorage
        if (!tripId) {
          console.error('Trip ID required for demo mode event deletion');
          return false;
        }
        return await calendarStorageService.deleteEvent(tripId, eventId);
      }

      // Use Supabase for authenticated users
      const { error } = await supabase
        .from('trip_events')
        .delete()
        .eq('id', eventId);

      return !error;
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  },

  // Convert database event to CalendarEvent format
  convertToCalendarEvent(tripEvent: any): CalendarEvent {
    const startDate = new Date(tripEvent.start_time);
    return {
      id: tripEvent.id,
      title: tripEvent.title,
      date: startDate,
      time: startDate.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      location: tripEvent.location,
      description: tripEvent.description,
      createdBy: tripEvent.created_by,
      creatorName: tripEvent.creator?.display_name || 'Unknown User',
      creatorAvatar: tripEvent.creator?.avatar_url,
      include_in_itinerary: tripEvent.include_in_itinerary,
      event_category: tripEvent.event_category as CalendarEvent['event_category'],
      source_type: tripEvent.source_type as any,
      source_data: tripEvent.source_data,
      // Recurring event support
      recurrence_rule: tripEvent.recurrence_rule,
      recurrence_exceptions: tripEvent.recurrence_exceptions,
      parent_event_id: tripEvent.parent_event_id,
      // Busy/free time blocking
      is_busy: tripEvent.is_busy ?? true,
      availability_status: tripEvent.availability_status || 'busy',
      end_time: tripEvent.end_time ? new Date(tripEvent.end_time) : undefined
    };
  },

  // Convert CalendarEvent to database format
  convertFromCalendarEvent(calendarEvent: CalendarEvent, tripId: string): CreateEventData {
    const startTime = new Date(calendarEvent.date);
    const [hours, minutes] = calendarEvent.time.split(':');
    startTime.setHours(parseInt(hours), parseInt(minutes));

    let endTime: string | undefined;
    if (calendarEvent.end_time) {
      endTime = calendarEvent.end_time.toISOString();
    }

    return {
      trip_id: tripId,
      title: calendarEvent.title,
      description: calendarEvent.description,
      start_time: startTime.toISOString(),
      end_time: endTime,
      location: calendarEvent.location,
      event_category: calendarEvent.event_category || 'other',
      include_in_itinerary: calendarEvent.include_in_itinerary,
      source_type: calendarEvent.source_type || 'manual',
      source_data: calendarEvent.source_data || {},
      // Recurring event support
      recurrence_rule: calendarEvent.recurrence_rule,
      recurrence_exceptions: calendarEvent.recurrence_exceptions,
      // Busy/free time blocking
      is_busy: calendarEvent.is_busy ?? true,
      availability_status: calendarEvent.availability_status || 'busy'
    };
  }
};