import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calendarService } from '../calendarService';
import { demoModeService } from '../demoModeService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('../demoModeService', () => ({
  demoModeService: {
    isDemoModeEnabled: vi.fn(),
  },
}));

vi.mock('@/services/offlineSyncService', () => ({
  offlineSyncService: {
    cacheEntity: vi.fn().mockResolvedValue(undefined),
    getCachedEntities: vi.fn().mockResolvedValue([]),
    getCachedEntity: vi.fn().mockResolvedValue(null),
    queueOperation: vi.fn().mockResolvedValue(undefined),
    removeCachedEntity: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/services/calendarOfflineQueue', () => ({
  calendarOfflineQueue: {
    queueCreate: vi.fn().mockResolvedValue('offline-temp-id'),
    queueUpdate: vi.fn().mockResolvedValue(undefined),
    queueDelete: vi.fn().mockResolvedValue(undefined),
    getFailedOperations: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

describe('calendarService.createEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    vi.mocked(demoModeService.isDemoModeEnabled).mockResolvedValue(false);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    } as never);
  });

  it('does not block event creation on slow conflict checks', async () => {
    const createdEvent = {
      id: 'event-1',
      trip_id: 'trip-1',
      title: 'Dinner',
      description: null,
      start_time: '2026-03-22T19:00:00.000Z',
      end_time: '2026-03-22T20:00:00.000Z',
      location: 'Las Vegas',
      event_category: 'other',
      include_in_itinerary: true,
      source_type: 'manual',
      source_data: {},
      created_by: 'user-1',
      created_at: '2026-03-18T00:00:00.000Z',
      updated_at: '2026-03-18T00:00:00.000Z',
      version: 1,
    };

    vi.spyOn(calendarService, 'ensureTripMembership').mockResolvedValue(true);
    vi.spyOn(calendarService, 'checkForConflicts').mockImplementation(
      () => new Promise<string[]>(() => undefined),
    );

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'trip_events') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: createdEvent, error: null }),
            }),
          }),
        } as never;
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const creationPromise = calendarService.createEvent({
      trip_id: 'trip-1',
      title: 'Dinner',
      start_time: '2026-03-22T19:00:00.000Z',
      end_time: '2026-03-22T20:00:00.000Z',
      location: 'Las Vegas',
    });

    const completionStatePromise = Promise.race([
      creationPromise.then(() => 'resolved' as const),
      new Promise<'timeout'>(resolve => {
        setTimeout(() => resolve('timeout'), 2500);
      }),
    ]);

    await vi.advanceTimersByTimeAsync(2500);

    const completionState = await completionStatePromise;
    expect(completionState).toBe('resolved');

    const result = await creationPromise;
    expect(result.event?.id).toBe('event-1');
    expect(result.conflicts).toEqual([]);
  });
});
