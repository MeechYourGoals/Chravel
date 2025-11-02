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
  event_category: 'dining' | 'lodging' | 'activity' | 'transportation' | 'entertainment' | 'other' | 'accommodations' | 'food' | 'fitness' | 'nightlife' | 'attractions' | 'budget';
  source_type: 'manual' | 'ai_extracted' | 'places_tab';
  source_data?: {
    confirmation_number?: string;
    original_text?: string;
    venue_details?: any;
  };
}

export interface ItineraryDay {
  date: Date;
  events: CalendarEvent[];
}

export interface AddToCalendarData {
  title: string;
  date: Date;
  time: string;
  location?: string;
  description?: string;
  category: CalendarEvent['event_category'];
  include_in_itinerary?: boolean;
}