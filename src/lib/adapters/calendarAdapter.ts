/**
 * Calendar event adapter: converts between Supabase DB rows and app-level types.
 *
 * DB table: trip_events (snake_case, start_time as ISO string)
 * App type: CalendarEvent (mixed case currently -- this adapter bridges the gap)
 *
 * Key transformation: DB `start_time` (ISO string) -> App `date` (Date) + `time` (HH:mm string)
 */

import type { Database } from '../../integrations/supabase/types';
import type { CalendarEvent } from '../../types/calendar';
import { normalizeCalendarCategory } from '../../constants/calendarCategories';

type EventRow = Database['public']['Tables']['trip_events']['Row'];

/**
 * Converts a Supabase trip_events row to an app-level CalendarEvent.
 *
 * Handles:
 * - start_time (ISO) -> date (Date) + time (HH:mm)
 * - event_category normalization via alias map
 * - Nullable include_in_itinerary -> defaults to true
 * - created_by preserved as createdBy
 */
export function toAppCalendarEvent(row: EventRow): CalendarEvent {
  const startDate = new Date(row.start_time);
  const hours = startDate.getHours().toString().padStart(2, '0');
  const minutes = startDate.getMinutes().toString().padStart(2, '0');

  return {
    id: row.id,
    title: row.title,
    date: startDate,
    time: `${hours}:${minutes}`,
    location: row.location ?? undefined,
    description: row.description ?? undefined,
    createdBy: row.created_by,
    include_in_itinerary: row.include_in_itinerary ?? true,
    event_category: normalizeCalendarCategory(row.event_category),
    source_type: (row.source_type as CalendarEvent['source_type']) ?? 'manual',
    source_data: row.source_data as CalendarEvent['source_data'],
    end_time: row.end_time ? new Date(row.end_time) : undefined,
  };
}

/**
 * Converts app-level calendar event data to a DB-compatible insert payload.
 */
export function toDbCalendarEventInsert(
  tripId: string,
  createdBy: string,
  data: {
    title: string;
    date: Date;
    time: string;
    location?: string;
    description?: string;
    eventCategory?: string;
    includeInItinerary?: boolean;
    sourceType?: string;
    sourceData?: Record<string, unknown>;
    endTime?: Date;
  },
): Database['public']['Tables']['trip_events']['Insert'] {
  // Combine date + time into ISO start_time
  const [hours, minutes] = data.time.split(':').map(Number);
  const startDate = new Date(data.date);
  startDate.setHours(hours || 0, minutes || 0, 0, 0);

  return {
    trip_id: tripId,
    created_by: createdBy,
    title: data.title,
    start_time: startDate.toISOString(),
    end_time: data.endTime?.toISOString() ?? null,
    location: data.location ?? null,
    description: data.description ?? null,
    event_category: normalizeCalendarCategory(data.eventCategory),
    include_in_itinerary: data.includeInItinerary ?? true,
    source_type: data.sourceType ?? 'manual',
    source_data: (data.sourceData as Database['public']['Tables']['trip_events']['Insert']['source_data']) ?? null,
  };
}
