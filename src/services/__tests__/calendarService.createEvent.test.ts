import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { calendarService } from '../calendarService';

const { mockGetUser, mockFrom, mockInsert, mockSelect, mockSingle, mockCacheEntity } = vi.hoisted(
  () => ({
    mockGetUser: vi.fn(),
    mockFrom: vi.fn(),
    mockInsert: vi.fn(),
    mockSelect: vi.fn(),
    mockSingle: vi.fn(),
    mockCacheEntity: vi.fn(),
  }),
);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  },
}));

vi.mock('../demoModeService', () => ({
  demoModeService: {
    isDemoModeEnabled: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock('../calendarStorageService', () => ({
  calendarStorageService: {
    createEvent: vi.fn(),
    getEvents: vi.fn(),
    setEvents: vi.fn(),
  },
}));

vi.mock('../calendarOfflineQueue', () => ({
  calendarOfflineQueue: {
    queueCreate: vi.fn(),
  },
}));

vi.mock('../offlineSyncService', () => ({
  offlineSyncService: {
    cacheEntity: mockCacheEntity,
    queueOperation: vi.fn(),
    getCachedEntities: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/utils/retry', () => ({
  retryWithBackoff: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

describe('calendarService.createEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    Object.defineProperty(globalThis.navigator, 'onLine', {
      value: true,
      configurable: true,
    });

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });

    const createdEvent = {
      id: 'event-1',
      trip_id: 'trip-1',
      title: 'Dinner',
      description: null,
      location: null,
      start_time: '2026-03-22T19:00:00.000Z',
      end_time: '2026-03-22T20:00:00.000Z',
      created_by: 'user-1',
      event_category: 'other',
      include_in_itinerary: true,
      source_type: 'manual',
      source_data: {},
      created_at: '2026-03-22T00:00:00.000Z',
      updated_at: '2026-03-22T00:00:00.000Z',
      version: 1,
    };

    mockSingle.mockResolvedValue({ data: createdEvent, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'trip_events') {
        return { insert: mockInsert };
      }

      throw new Error(`Unexpected table mock access: ${table}`);
    });

    mockCacheEntity.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('continues event creation when conflict check is slow', async () => {
    vi.spyOn(calendarService, 'ensureTripMembership').mockResolvedValue(true);

    vi.spyOn(calendarService, 'checkForConflicts').mockImplementation(
      () =>
        new Promise(resolve => {
          setTimeout(() => resolve(['Some overlap']), 5000);
        }),
    );

    const createPromise = calendarService.createEvent({
      trip_id: 'trip-1',
      title: 'Dinner',
      start_time: '2026-03-22T19:00:00.000Z',
      end_time: '2026-03-22T20:00:00.000Z',
      source_data: {},
    });

    await vi.advanceTimersByTimeAsync(2500);
    await Promise.resolve();

    expect(mockInsert).toHaveBeenCalledTimes(1);

    await vi.runAllTimersAsync();
    const result = await createPromise;

    expect(result.event?.id).toBe('event-1');
    expect(result.conflicts).toEqual([]);
  });
});
