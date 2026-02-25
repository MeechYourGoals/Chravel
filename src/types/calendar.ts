export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  location?: string;
  description?: string;
  createdBy: string;
  creatorName?: string;
  creatorAvatar?: string;
  include_in_itinerary: boolean;
  event_category:
    | 'dining'
    | 'lodging'
    | 'activity'
    | 'transportation'
    | 'entertainment'
    | 'other'
    | 'accommodations'
    | 'food'
    | 'fitness'
    | 'nightlife'
    | 'attractions'
    | 'budget';
  source_type: 'manual' | 'ai_extracted' | 'places_tab';
  source_data?: {
    confirmation_number?: string;
    original_text?: string;
    venue_details?: any;
  };
  // Recurring event support
  recurrence_rule?: string; // RRULE format (e.g., "FREQ=DAILY;INTERVAL=1;COUNT=7")
  recurrence_exceptions?: string[]; // Array of exception dates (ISO format)
  parent_event_id?: string; // For recurring series
  // Busy/free time blocking
  is_busy?: boolean; // true = busy, false = free/tentative
  availability_status?: 'busy' | 'free' | 'tentative';
  end_time?: Date; // End time for the event
}

export interface ItineraryDay {
  date: Date;
  events: CalendarEvent[];
}

export interface AddToCalendarData {
  title: string;
  date: Date;
  time: string;
  endTime?: string; // End time (HH:mm format)
  location?: string;
  description?: string;
  category: CalendarEvent['event_category'];
  include_in_itinerary?: boolean;
  // Recurring event support
  recurrence_rule?: string; // RRULE format
  recurrence_exceptions?: string[];
  // Busy/free time blocking
  is_busy?: boolean;
  availability_status?: 'busy' | 'free' | 'tentative';
}
