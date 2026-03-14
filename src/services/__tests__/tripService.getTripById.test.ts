import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromMock = vi.hoisted(() => vi.fn());
const invokeMock = vi.hoisted(() => vi.fn());

type MaybeSingleResult = {
  data: Record<string, unknown> | null;
  error: { message: string } | null;
};

let tripQueryResult: MaybeSingleResult;
let tripMemberQueryResults: MaybeSingleResult[] = [];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromMock,
    functions: {
      invoke: invokeMock,
    },
  },
}));

import { tripService } from '../tripService';

describe('tripService.getTripById', () => {
  const tripId = 'trip-123';

  beforeEach(() => {
    vi.clearAllMocks();

    tripQueryResult = {
      data: {
        id: tripId,
        name: 'Access Test Trip',
        created_by: 'owner-1',
      },
      error: null,
    };
    tripMemberQueryResults = [];

    fromMock.mockImplementation((table: string) => {
      if (table === 'trips') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => tripQueryResult,
            }),
          }),
        };
      }

      if (table === 'trip_members') {
        const nextResult = async () =>
          tripMemberQueryResults.shift() ?? {
            data: null,
            error: null,
          };

        return {
          select: () => ({
            eq: () => ({
              or: () => ({
                maybeSingle: nextResult,
              }),
              maybeSingle: nextResult,
            }),
          }),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      };
    });
  });

  it('returns trip directly for active members', async () => {
    tripMemberQueryResults.push({
      data: { id: 'member-row-1' },
      error: null,
    });

    const result = await tripService.getTripById(tripId);

    expect(result).toEqual(tripQueryResult.data);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('falls back to edge access check when membership is missing', async () => {
    // Trip row is readable (e.g. pending preview policy), but user is not an active member.
    tripMemberQueryResults.push({
      data: null,
      error: null,
    });

    invokeMock.mockResolvedValue({
      data: {
        success: false,
        error: 'Access denied',
        error_code: 'ACCESS_DENIED',
      },
      error: null,
    });

    await expect(tripService.getTripById(tripId)).rejects.toThrow('permission denied');
    expect(invokeMock).toHaveBeenCalledWith('get-trip-detail', {
      body: { tripId },
    });
  });
});
