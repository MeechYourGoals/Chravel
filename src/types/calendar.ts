/**
 * Calendar event category union — shared by UI and DB layers.
 */
export type CalendarEventCategory =
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

/**
 * Source type for calendar events — how the event was created.
 */
export type CalendarSourceType =
  | 'manual'
  | 'ai_extracted'
  | 'places_tab'
  | 'bulk_import'
  | 'ai_concierge'
  | 'voice_concierge'
  | 'gmail_import'
  | 'ai_concierge_import'
  | 'demo';

/**
 * Availability status for busy/free time blocking.
 */
export type CalendarAvailabilityStatus = 'busy' | 'free' | 'tentative';

// ---------------------------------------------------------------------------
// DB-facing types (match trip_events table shape)
// ---------------------------------------------------------------------------

/**
 * Database row shape for trip_events.
 * Used by calendarService, offline queue, and realtime subscriptions.
 */
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
  is_all_day?: boolean;
  source_type: string;
  source_data: Record<string, unknown> | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  version?: number;
}

/**
 * Payload for creating a new trip event via calendarService.
 */
export interface CreateEventData {
  trip_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time?: string;
  location?: string;
  event_category?: string;
  include_in_itinerary?: boolean;
  is_all_day?: boolean;
  source_type?: string;
  source_data?: Record<string, unknown>;
  recurrence_rule?: string;
  recurrence_exceptions?: string[];
  is_busy?: boolean;
  availability_status?: CalendarAvailabilityStatus;
}

// ---------------------------------------------------------------------------
// UI-facing types (used by components and hooks)
// ---------------------------------------------------------------------------

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
  event_category: CalendarEventCategory;
  source_type: CalendarSourceType;
  source_data?: {
    confirmation_number?: string;
    original_text?: string;
    venue_details?: unknown;
  };
  // All-day / multi-day support
  is_all_day?: boolean;
  end_date?: Date;
  // Recurring event support
  recurrence_rule?: string;
  recurrence_exceptions?: string[];
  parent_event_id?: string;
  // Busy/free time blocking
  is_busy?: boolean;
  availability_status?: CalendarAvailabilityStatus;
  end_time?: Date;
}

export interface ItineraryDay {
  date: Date;
  events: CalendarEvent[];
}

export interface AddToCalendarData {
  title: string;
  date: Date;
  time: string;
  endDate?: Date;
  endTime?: string;
  location?: string;
  description?: string;
  category: CalendarEventCategory;
  include_in_itinerary?: boolean;
  is_all_day?: boolean;
  recurrence_rule?: string;
  recurrence_exceptions?: string[];
  is_busy?: boolean;
  availability_status?: CalendarAvailabilityStatus;
}
