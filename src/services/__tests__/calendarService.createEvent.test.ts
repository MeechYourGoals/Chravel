import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calendarService } from '../calendarService';
import { supabase } from '@/integrations/supabase/client';
import { demoModeService } from '../demoModeService';
import { offlineSyncService } from '../offlineSyncService';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('../demoModeService', () => ({
  demoModeService: {
    isDemoModeEnabled: vi.fn(),
  },
}));

vi.mock('../calendarStorageService', () => ({
  calendarStorageService: {
    createEvent: vi.fn(),
  },
}));

vi.mock('../calendarOfflineQueue', () => ({
  calendarOfflineQueue: {
    queueCreate: vi.fn(),
  },
}));

vi.mock('../offlineSyncService', () => ({
  offlineSyncService: {
    queueOperation: vi.fn(),
    cacheEntity: vi.fn(),
  },
}));

describe('calendarService.createEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });

    vi.mocked(demoModeService.isDemoModeEnabled).mockResolvedValue(false);
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    vi.mocked(offlineSyncService.cacheEntity).mockResolvedValue(undefined);
    vi.spyOn(calendarService, 'ensureTripMembership').mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not block event creation when conflict checks are slow', async () => {
    const createdEvent = {
      id: 'event-123',
      trip_id: 'trip-123',
      title: 'Dinner',
      description: 'Steakhouse reservation',
      location: 'Las Vegas',
      start_time: '2026-03-22T19:00:00.000Z',
      end_time: '2026-03-22T20:30:00.000Z',
      event_category: 'other',
      include_in_itinerary: true,
      source_type: 'manual',
      source_data: {},
      created_by: 'user-123',
      created_at: '2026-03-19T00:00:00.000Z',
      updated_at: '2026-03-19T00:00:00.000Z',
      version: 1,
    };

    const insertMock = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: createdEvent,
          error: null,
        }),
      })),
    }));

    vi.mocked(supabase.from).mockImplementation(table => {
      if (table === 'trip_events') {
        return { insert: insertMock } as never;
      }
      throw new Error(`Unexpected table in test: ${table}`);
    });

    vi.spyOn(calendarService, 'checkForConflicts').mockImplementation(
      () =>
        new Promise<string[]>(resolve => {
          setTimeout(() => resolve(['Existing Event']), 60_000);
        }),
    );

    const createPromise = calendarService.createEvent({
      trip_id: 'trip-123',
      title: 'Dinner',
      description: 'Steakhouse reservation',
      start_time: '2026-03-22T19:00:00.000Z',
      end_time: '2026-03-22T20:30:00.000Z',
      location: 'Las Vegas',
    });

    await vi.advanceTimersByTimeAsync(2_100);
    const result = await createPromise;

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(result.event?.id).toBe('event-123');
    expect(result.conflicts).toEqual([]);
  });
});
