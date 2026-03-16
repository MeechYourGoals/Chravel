import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tripService } from '../tripService';
import { invalidateAuthCache } from '@/lib/authCache';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  invoke: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mocks.from,
    auth: {
      getUser: mocks.getUser,
    },
    functions: {
      invoke: mocks.invoke,
    },
  },
}));

function createTripQuery(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle: vi.fn().mockResolvedValue(result),
      })),
    })),
  };
}

function createMembershipQuery(
  activeResult: { data: unknown; error: { message?: string } | null },
  fallbackResult?: { data: unknown; error: { message?: string } | null },
) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          or: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue(activeResult),
          })),
          maybeSingle: vi.fn().mockResolvedValue(fallbackResult ?? activeResult),
        })),
      })),
    })),
  };
}

describe('tripService.getTripById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateAuthCache();
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
        },
      },
      error: null,
    });
  });

  it('falls back to canonical access check when active membership is missing', async () => {
    const trip = { id: 'trip-1', name: 'Trip', created_by: 'creator-1' };

    mocks.from.mockImplementation((table: string) => {
      if (table === 'trips') {
        return createTripQuery({ data: trip, error: null });
      }

      if (table === 'trip_members') {
        return createMembershipQuery({ data: null, error: null });
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    mocks.invoke.mockResolvedValue({
      data: {
        success: false,
        error: 'Access denied',
        error_code: 'ACCESS_DENIED',
      },
      error: null,
    });

    await expect(tripService.getTripById('trip-1')).rejects.toThrow('permission denied');
    expect(mocks.invoke).toHaveBeenCalledWith('get-trip-detail', {
      body: { tripId: 'trip-1' },
    });
  });

  it('returns trip directly when active membership exists', async () => {
    const trip = { id: 'trip-1', name: 'Trip', created_by: 'creator-1' };

    mocks.from.mockImplementation((table: string) => {
      if (table === 'trips') {
        return createTripQuery({ data: trip, error: null });
      }

      if (table === 'trip_members') {
        return createMembershipQuery({ data: { id: 'member-1' }, error: null });
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await tripService.getTripById('trip-1');

    expect(result).toEqual(trip);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });

  it('supports pre-migration schemas where trip_members.status does not exist', async () => {
    const trip = { id: 'trip-1', name: 'Trip', created_by: 'creator-1' };

    mocks.from.mockImplementation((table: string) => {
      if (table === 'trips') {
        return createTripQuery({ data: trip, error: null });
      }

      if (table === 'trip_members') {
        return createMembershipQuery(
          { data: null, error: { message: 'column trip_members.status does not exist' } },
          { data: { id: 'member-1' }, error: null },
        );
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await tripService.getTripById('trip-1');

    expect(result).toEqual(trip);
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
