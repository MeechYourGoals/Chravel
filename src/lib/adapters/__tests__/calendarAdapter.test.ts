import { describe, it, expect } from 'vitest';
import { toAppCalendarEvent, toDbCalendarEventInsert } from '../calendarAdapter';
import type { Database } from '../../../integrations/supabase/types';

type EventRow = Database['public']['Tables']['trip_events']['Row'];

const baseRow: EventRow = {
  id: 'evt-1',
  trip_id: 'trip-1',
  title: 'Team Dinner',
  start_time: '2026-03-15T19:30:00Z',
  end_time: '2026-03-15T21:00:00Z',
  location: 'The Restaurant',
  description: 'Group dinner downtown',
  created_by: 'user-a',
  created_at: '2026-03-01T10:00:00Z',
  updated_at: '2026-03-01T10:00:00Z',
  event_category: 'dining',
  include_in_itinerary: true,
  source_type: 'manual',
  source_data: null,
  version: 1,
};

describe('calendarAdapter', () => {
  describe('toAppCalendarEvent', () => {
    it('splits start_time into date (Date) and time (HH:mm)', () => {
      const result = toAppCalendarEvent(baseRow);

      expect(result.date).toBeInstanceOf(Date);
      expect(result.time).toMatch(/^\d{2}:\d{2}$/);
    });

    it('maps all required fields', () => {
      const result = toAppCalendarEvent(baseRow);

      expect(result.id).toBe('evt-1');
      expect(result.title).toBe('Team Dinner');
      expect(result.location).toBe('The Restaurant');
      expect(result.description).toBe('Group dinner downtown');
      expect(result.createdBy).toBe('user-a');
    });

    it('normalizes legacy category aliases to canonical values', () => {
      const foodRow: EventRow = { ...baseRow, event_category: 'food' };
      expect(toAppCalendarEvent(foodRow).event_category).toBe('dining');

      const accomRow: EventRow = { ...baseRow, event_category: 'accommodations' };
      expect(toAppCalendarEvent(accomRow).event_category).toBe('lodging');

      const nightlifeRow: EventRow = { ...baseRow, event_category: 'nightlife' };
      expect(toAppCalendarEvent(nightlifeRow).event_category).toBe('entertainment');
    });

    it('defaults null event_category to "other"', () => {
      const row: EventRow = { ...baseRow, event_category: null };
      expect(toAppCalendarEvent(row).event_category).toBe('other');
    });

    it('defaults null include_in_itinerary to true', () => {
      const row: EventRow = { ...baseRow, include_in_itinerary: null };
      expect(toAppCalendarEvent(row).include_in_itinerary).toBe(true);
    });

    it('converts end_time string to Date', () => {
      const result = toAppCalendarEvent(baseRow);
      expect(result.end_time).toBeInstanceOf(Date);
    });

    it('handles null end_time', () => {
      const row: EventRow = { ...baseRow, end_time: null };
      expect(toAppCalendarEvent(row).end_time).toBeUndefined();
    });

    it('handles null location and description as undefined', () => {
      const row: EventRow = { ...baseRow, location: null, description: null };
      const result = toAppCalendarEvent(row);
      expect(result.location).toBeUndefined();
      expect(result.description).toBeUndefined();
    });

    it('defaults null source_type to "manual"', () => {
      const row: EventRow = { ...baseRow, source_type: null };
      expect(toAppCalendarEvent(row).source_type).toBe('manual');
    });
  });

  describe('toDbCalendarEventInsert', () => {
    it('combines date + time into ISO start_time', () => {
      const result = toDbCalendarEventInsert('trip-1', 'user-a', {
        title: 'Brunch',
        date: new Date('2026-04-01T00:00:00'),
        time: '10:30',
      });

      expect(result.start_time).toBeDefined();
      expect(result.trip_id).toBe('trip-1');
      expect(result.created_by).toBe('user-a');
      expect(result.title).toBe('Brunch');
    });

    it('normalizes category in inserts', () => {
      const result = toDbCalendarEventInsert('trip-1', 'user-a', {
        title: 'Dinner',
        date: new Date(),
        time: '19:00',
        eventCategory: 'food',
      });
      expect(result.event_category).toBe('dining');
    });

    it('defaults optional fields', () => {
      const result = toDbCalendarEventInsert('trip-1', 'user-a', {
        title: 'Event',
        date: new Date(),
        time: '12:00',
      });
      expect(result.include_in_itinerary).toBe(true);
      expect(result.source_type).toBe('manual');
      expect(result.location).toBeNull();
      expect(result.description).toBeNull();
    });
  });
});
