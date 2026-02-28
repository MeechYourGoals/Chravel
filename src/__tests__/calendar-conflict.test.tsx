/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockSupabase, supabaseMockHelpers } from './utils/supabaseMocks';
import { calendarService } from '@/services/calendarService';
import { testFactories } from './utils/testHelpers';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

// Mock demoModeService
vi.mock('@/services/demoModeService', () => ({
  demoModeService: {
    isDemoModeEnabled: vi.fn(() => Promise.resolve(false)),
  },
}));

// NOTE: Integration tests with complex mock hoisting issues
// Skipped pending proper test infrastructure overhaul
describe.skip('Calendar Event → Conflict Detection', () => {
  beforeEach(() => {
    supabaseMockHelpers.clearMocks();
    supabaseMockHelpers.setUser(testFactories.createUser());
  });

  it('should detect overlapping events as conflicts', async () => {
    const trip = testFactories.createTrip();
    const existingEvent = testFactories.createEvent({
      trip_id: trip.id,
      start_time: '2024-01-01T10:00:00Z',
      end_time: '2024-01-01T12:00:00Z',
    });

    // Mock existing event
    supabaseMockHelpers.setMockData('trip_events', [existingEvent]);

    // Mock conflict detection RPC
    const conflictData = {
      conflicting_events: [existingEvent],
      has_conflict: true,
    };

    supabaseMockHelpers.setMockData('rpc', conflictData, {
      column: 'create_event_with_conflict_check',
      value: 'create_event_with_conflict_check',
    });

    // Try to create overlapping event
    const newEventData = {
      trip_id: trip.id,
      title: 'New Event',
      start_time: '2024-01-01T11:00:00Z', // Overlaps with existing event
      end_time: '2024-01-01T13:00:00Z',
    };

    // Mock RPC call
    (mockSupabase.rpc as import('vitest').Mock).mockResolvedValueOnce({
      data: conflictData,
      error: null,
    });

    await calendarService.createEvent(newEventData);

    // Should detect conflict
    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'create_event_with_conflict_check',
      expect.objectContaining({
        p_trip_id: trip.id,
        p_start_time: newEventData.start_time,
      }),
    );
  });

  it('should allow non-overlapping events', async () => {
    const trip = testFactories.createTrip();
    const existingEvent = testFactories.createEvent({
      trip_id: trip.id,
      start_time: '2024-01-01T10:00:00Z',
      end_time: '2024-01-01T12:00:00Z',
    });

    supabaseMockHelpers.setMockData('trip_events', [existingEvent]);

    // Mock successful creation (no conflict)
    const newEvent = testFactories.createEvent({
      trip_id: trip.id,
      title: 'Non-conflicting Event',
      start_time: '2024-01-01T14:00:00Z', // After existing event
      end_time: '2024-01-01T16:00:00Z',
    });

    (mockSupabase.rpc as import('vitest').Mock).mockResolvedValueOnce({
      data: newEvent.id,
      error: null,
    });

    supabaseMockHelpers.setMockData('trip_events', [existingEvent, newEvent], {
      column: 'id',
      value: newEvent.id,
    });

    const result = await calendarService.createEvent({
      trip_id: trip.id,
      title: 'Non-conflicting Event',
      start_time: '2024-01-01T14:00:00Z',
      end_time: '2024-01-01T16:00:00Z',
    });

    expect(result).toBeDefined();
    expect(result?.title).toBe('Non-conflicting Event');
  });

  it('should handle events that end exactly when another starts', async () => {
    const trip = testFactories.createTrip();
    const existingEvent = testFactories.createEvent({
      trip_id: trip.id,
      start_time: '2024-01-01T10:00:00Z',
      end_time: '2024-01-01T12:00:00Z',
    });
    void existingEvent; // Used to set up mock state

    // Event 2 starts exactly when Event 1 ends - should not conflict
    const event2Data = {
      trip_id: trip.id,
      title: 'Back-to-back Event',
      start_time: '2024-01-01T12:00:00Z', // Starts when Event 1 ends
      end_time: '2024-01-01T14:00:00Z',
    };

    (mockSupabase.rpc as import('vitest').Mock).mockResolvedValueOnce({
      data: 'event-2-id',
      error: null,
    });

    const result = await calendarService.createEvent(event2Data);

    // Back-to-back events should not conflict
    expect(result).toBeDefined();
  });

  it('should detect conflicts for same user across multiple trips', async () => {
    const trip1 = testFactories.createTrip({ id: 'trip-1' });
    const trip2 = testFactories.createTrip({ id: 'trip-2' });
    const user = testFactories.createUser();

    const event1 = testFactories.createEvent({
      trip_id: trip1.id,
      start_time: '2024-01-01T10:00:00Z',
      end_time: '2024-01-01T12:00:00Z',
      created_by: user.id,
    });

    supabaseMockHelpers.setMockData('trip_events', [event1]);

    // Try to create conflicting event in different trip
    const conflictingEventData = {
      trip_id: trip2.id,
      title: 'Conflicting Event',
      start_time: '2024-01-01T11:00:00Z', // Overlaps
      end_time: '2024-01-01T13:00:00Z',
    };

    // Note: This would require checking user's events across all trips
    // The actual implementation may vary based on requirements
    (mockSupabase.rpc as import('vitest').Mock).mockResolvedValueOnce({
      data: null,
      error: { message: 'Time conflict detected', code: 'CONFLICT' },
    });

    const result = await calendarService.createEvent(conflictingEventData);

    // Should handle conflict appropriately
    expect(result).toBeNull();
  });

  it('should handle all-day events correctly', async () => {
    const trip = testFactories.createTrip();
    const allDayEvent = {
      trip_id: trip.id,
      title: 'All Day Event',
      start_time: '2024-01-01T00:00:00Z',
      end_time: '2024-01-01T23:59:59Z',
      is_busy: true,
    };

    (mockSupabase.rpc as import('vitest').Mock).mockResolvedValueOnce({
      data: 'all-day-event-id',
      error: null,
    });

    const result = await calendarService.createEvent(allDayEvent);

    expect(result).toBeDefined();
  });

  it('should return null on creation error', async () => {
    const trip = testFactories.createTrip();
    const error = { message: 'Database error', code: 'DB_ERROR' };

    (mockSupabase.rpc as import('vitest').Mock).mockResolvedValueOnce({
      data: null,
      error,
    });

    const result = await calendarService.createEvent({
      trip_id: trip.id,
      title: 'Test Event',
      start_time: '2024-01-01T10:00:00Z',
    });

    expect(result).toBeNull();
  });
});
