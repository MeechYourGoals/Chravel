import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calendarService } from '../calendarService';
import { createMockSupabaseClient, mockUser } from '@/__tests__/utils/supabaseMocks';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

vi.mock('../demoModeService', () => ({
  demoModeService: {
    isDemoModeEnabled: vi.fn().mockResolvedValue(false),
  },
}));

describe('calendarService - Integration Tests', () => {
  const tripId = 'trip-123';

  beforeEach(() => {
    vi.clearAllMocks();
    const mockSupabase = vi.mocked(supabase);
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  describe('createEvent', () => {
    it('should create an event successfully', async () => {
      const mockSupabase = vi.mocked(supabase);
      const eventId = 'event-123';

      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: eventId,
        error: null,
      });

      const createdEvent = {
        id: eventId,
        trip_id: tripId,
        title: 'Test Event',
        description: 'Test description',
        start_time: '2024-01-01T14:00:00Z',
        end_time: '2024-01-01T15:00:00Z',
        location: 'Test Location',
        event_category: 'activity',
        include_in_itinerary: true,
        source_type: 'manual',
        created_by: mockUser.id,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        creator: {
          id: mockUser.id,
          display_name: 'Test User',
          avatar_url: null,
        },
      };

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: createdEvent,
              error: null,
            }),
          }),
        }),
      } as any);

      const eventData = {
        trip_id: tripId,
        title: 'Test Event',
        description: 'Test description',
        start_time: '2024-01-01T14:00:00Z',
        end_time: '2024-01-01T15:00:00Z',
        location: 'Test Location',
      };

      const result = await calendarService.createEvent(eventData);

      expect(result).not.toBeNull();
      expect(result.event?.id).toBe(eventId);
      expect(result.event?.title).toBe('Test Event');
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'create_event_with_conflict_check',
        expect.objectContaining({
          p_trip_id: tripId,
          p_title: 'Test Event',
        })
      );
    });

    it('should detect conflicts when creating overlapping events', async () => {
      const mockSupabase = vi.mocked(supabase);
      const conflictError = {
        code: 'P0001',
        message: 'Event conflicts with existing event',
        details: 'Event ID: event-existing-123',
      };

      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: conflictError,
      });

      const eventData = {
        trip_id: tripId,
        title: 'Conflicting Event',
        start_time: '2024-01-01T14:00:00Z',
        end_time: '2024-01-01T15:00:00Z',
      };

      const result = await calendarService.createEvent(eventData);

      expect(result).toBeNull();
    });

    it('should return null when user is not authenticated', async () => {
      const mockSupabase = vi.mocked(supabase);
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const eventData = {
        trip_id: tripId,
        title: 'Test Event',
        start_time: '2024-01-01T14:00:00Z',
      };

      const result = await calendarService.createEvent(eventData);

      expect(result).toBeNull();
    });
  });

  describe('getTripEvents', () => {
    it('should fetch all events for a trip', async () => {
      const mockSupabase = vi.mocked(supabase);
      const events = [
        {
          id: 'event-1',
          trip_id: tripId,
          title: 'Event 1',
          start_time: '2024-01-01T10:00:00Z',
          end_time: '2024-01-01T11:00:00Z',
          created_by: mockUser.id,
        },
        {
          id: 'event-2',
          trip_id: tripId,
          title: 'Event 2',
          start_time: '2024-01-01T14:00:00Z',
          end_time: '2024-01-01T15:00:00Z',
          created_by: mockUser.id,
        },
      ];

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: events,
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await calendarService.getTripEvents(tripId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('event-1');
      expect(result[1].id).toBe('event-2');
    });

    it('should return empty array when no events exist', async () => {
      const mockSupabase = vi.mocked(supabase);

      mockSupabase.from = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      } as any);

      const result = await calendarService.getTripEvents(tripId);

      expect(result).toEqual([]);
    });
  });
});
