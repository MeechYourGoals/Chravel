import { describe, it, expect, beforeEach, vi } from 'vitest';
import { calendarService } from '../calendarService';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
        in: vi.fn(() => ({
          order: vi.fn(),
        })),
        order: vi.fn(),
      })),
    })),
  },
}));

// Mock demo mode service
vi.mock('../demoModeService', () => ({
  demoModeService: {
    isDemoModeEnabled: vi.fn(() => Promise.resolve(false)),
  },
}));

describe('calendarService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('convertToCalendarEvent', () => {
    it('should convert trip event to calendar event with timezone handling', () => {
      const tripEvent = {
        id: '123',
        trip_id: 'trip-123',
        title: 'Test Event',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
        location: 'Test Location',
        description: 'Test Description',
        created_by: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        include_in_itinerary: true,
        event_category: 'activity',
        source_type: 'manual',
        source_data: {},
        is_busy: true,
        availability_status: 'busy',
        recurrence_rule: null,
        parent_event_id: null,
        creator: {
          display_name: 'Test User',
          avatar_url: null,
        },
      };

      const calendarEvent = calendarService.convertToCalendarEvent(tripEvent);

      expect(calendarEvent.id).toBe('123');
      expect(calendarEvent.title).toBe('Test Event');
      expect(calendarEvent.date).toBeInstanceOf(Date);
      expect(calendarEvent.time).toMatch(/^\d{2}:\d{2}$/);
      expect(calendarEvent.location).toBe('Test Location');
      expect(calendarEvent.is_busy).toBe(true);
      expect(calendarEvent.availability_status).toBe('busy');
      expect(calendarEvent.end_time).toBeInstanceOf(Date);
    });

    it('should handle events without end time', () => {
      const tripEvent = {
        id: '123',
        trip_id: 'trip-123',
        title: 'Test Event',
        start_time: '2024-01-15T10:00:00Z',
        end_time: null,
        location: null,
        description: null,
        created_by: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        include_in_itinerary: true,
        event_category: 'activity',
        source_type: 'manual',
        source_data: {},
        is_busy: true,
        availability_status: 'busy',
        creator: {
          display_name: 'Test User',
          avatar_url: null,
        },
      };

      const calendarEvent = calendarService.convertToCalendarEvent(tripEvent);

      // Service returns null for missing optional fields
      expect(calendarEvent.end_time).toBeFalsy();
      expect(calendarEvent.location).toBeFalsy();
    });

    it('should handle recurring events', () => {
      const tripEvent = {
        id: '123',
        trip_id: 'trip-123',
        title: 'Recurring Event',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
        location: null,
        description: null,
        created_by: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        include_in_itinerary: true,
        event_category: 'activity',
        source_type: 'manual',
        source_data: {},
        is_busy: true,
        availability_status: 'busy',
        recurrence_rule: 'FREQ=DAILY;INTERVAL=1;COUNT=7',
        parent_event_id: null,
        creator: {
          display_name: 'Test User',
          avatar_url: null,
        },
      };

      const calendarEvent = calendarService.convertToCalendarEvent(tripEvent);

      expect(calendarEvent.recurrence_rule).toBe('FREQ=DAILY;INTERVAL=1;COUNT=7');
    });

    it('should handle free/tentative events', () => {
      const tripEvent = {
        id: '123',
        trip_id: 'trip-123',
        title: 'Free Time',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
        location: null,
        description: null,
        created_by: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        include_in_itinerary: true,
        event_category: 'activity',
        source_type: 'manual',
        source_data: {},
        is_busy: false,
        availability_status: 'free',
        creator: {
          display_name: 'Test User',
          avatar_url: null,
        },
      };

      const calendarEvent = calendarService.convertToCalendarEvent(tripEvent);

      expect(calendarEvent.is_busy).toBe(false);
      expect(calendarEvent.availability_status).toBe('free');
    });
  });

  describe('convertFromCalendarEvent', () => {
    it('should convert calendar event to database format', () => {
      const calendarEvent = {
        id: '123',
        title: 'Test Event',
        date: new Date('2024-01-15T10:00:00Z'),
        time: '10:00',
        location: 'Test Location',
        description: 'Test Description',
        createdBy: 'user-123',
        include_in_itinerary: true,
        event_category: 'activity' as const,
        source_type: 'manual' as const,
        source_data: {},
        is_busy: true,
        availability_status: 'busy' as const,
        end_time: new Date('2024-01-15T11:00:00Z'),
      };

      const createData = calendarService.convertFromCalendarEvent(calendarEvent, 'trip-123');

      expect(createData.trip_id).toBe('trip-123');
      expect(createData.title).toBe('Test Event');
      expect(createData.start_time).toContain('2024-01-15');
      expect(createData.end_time).toContain('2024-01-15');
      expect(createData.location).toBe('Test Location');
      expect(createData.is_busy).toBe(true);
      expect(createData.availability_status).toBe('busy');
    });

    it('should handle events without end time', () => {
      const calendarEvent = {
        id: '123',
        title: 'Test Event',
        date: new Date('2024-01-15T10:00:00Z'),
        time: '10:00',
        location: undefined,
        description: undefined,
        createdBy: 'user-123',
        include_in_itinerary: true,
        event_category: 'activity' as const,
        source_type: 'manual' as const,
        source_data: {},
        is_busy: true,
        availability_status: 'busy' as const,
      };

      const createData = calendarService.convertFromCalendarEvent(calendarEvent, 'trip-123');

      expect(createData.end_time).toBeUndefined();
    });
  });
});
