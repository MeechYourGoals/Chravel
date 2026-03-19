import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tripService } from '../tripService';

const { mockGetUser, mockGetSession, mockRefreshSession, mockFrom, mockInvoke } = vi.hoisted(() => {
  return {
    mockGetUser: vi.fn(),
    mockGetSession: vi.fn(),
    mockRefreshSession: vi.fn(),
    mockFrom: vi.fn(),
    mockInvoke: vi.fn(),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: mockGetUser,
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
    },
    from: mockFrom,
    functions: {
      invoke: mockInvoke,
    },
  },
}));

type QueryResult = {
  count: number;
  error: null;
  data: null;
};

function createTripCountQuery(count: number) {
  const result: QueryResult = {
    count,
    error: null,
    data: null,
  };

  return {
    eq: vi.fn().mockReturnThis(),
    then: (
      resolve: (value: QueryResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ): Promise<unknown> => Promise.resolve(result).then(resolve, reject),
  };
}

describe('tripService.createTrip error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'traveler@example.com' } },
      error: null,
    });

    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockRefreshSession.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'trips') {
        return {
          select: vi.fn().mockReturnValue(createTripCountQuery(0)),
        };
      }

      throw new Error(`Unexpected table in test: ${table}`);
    });
  });

  it('returns a user-friendly message for FunctionsFetchError', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        name: 'FunctionsFetchError',
        message: 'Failed to send a request to the Edge Function',
        context: new TypeError('Failed to fetch'),
      },
    });

    let thrownMessage = '';

    try {
      await tripService.createTrip({ name: 'Test Trip', trip_type: 'consumer' });
    } catch (error) {
      thrownMessage = (error as Error).message;
    }

    expect(thrownMessage).toBe(
      'Network error creating trip. Please check your connection and try again.',
    );
    expect(thrownMessage).not.toContain('Failed to fetch');
  });

  it('maps known edge-function upgrade codes from HTTP response body', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: {
        name: 'FunctionsHttpError',
        message: 'Edge function failed with status 402',
        context: new Response(JSON.stringify({ error: 'UPGRADE_REQUIRED_EVENT' }), {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        }),
      },
    });

    await expect(
      tripService.createTrip({ name: 'Event Trip', trip_type: 'event' }),
    ).rejects.toThrow('UPGRADE_REQUIRED_EVENT');
  });
});
