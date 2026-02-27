import { supabase } from '@/integrations/supabase/client';

export interface CalendarEvent {
  id: string;
  trip_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  created_by: string;
  event_category?: string;
}

/**
 * Calendar Repository (TDAL)
 */
export const calendarRepo = {
  async getEvents(tripId: string): Promise<CalendarEvent[]> {
    const { data, error } = await supabase
      .from('trip_events')
      .select('*')
      .eq('trip_id', tripId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  },

  async createEvent(event: Omit<CalendarEvent, 'id' | 'created_at'>): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from('trip_events')
      .insert(event)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from('trip_events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await supabase
      .from('trip_events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
  }
};
