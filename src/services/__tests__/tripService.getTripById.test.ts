import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Trip } from '@/services/tripService';

const { fromMock, invokeMock, getCachedAuthUserMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  invokeMock: vi.fn(),
  getCachedAuthUserMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: fromMock,
    functions: {
      invoke: invokeMock,
    },
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      refreshSession: vi.fn(),
    },
  },
}));

vi.mock('@/lib/authCache', () => ({
  getCachedAuthUser: getCachedAuthUserMock,
}));

import { tripService } from '@/services/tripService';

const mockTrip: Trip = {
  id: 'trip-123',
  name: 'Test Trip',
  created_by: 'owner-123',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_archived: false,
  trip_type: 'consumer',
};

type MaybeSingleResult<T> = { data: T | null; error: { message?: string } | null };

function createTripTable(result: MaybeSingleResult<Trip>) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  return {
    select: vi.fn().mockReturnValue({ eq }),
  };
}

function createMembersTable(results: Array<MaybeSingleResult<{ id: string }>>) {
  const select = vi.fn();

  results.forEach((result, index) => {
    const chain = {
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(result),
    };

    select.mockImplementationOnce(() => chain);

    if (index === results.length - 1) {
      select.mockImplementation(() => chain);
    }
  });

  return { select };
}

describe('tripService.getTripById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCachedAuthUserMock.mockResolvedValue({ id: 'member-123' });
  });

  it('returns trip directly when active membership exists', async () => {
    const tripsTable = createTripTable({ data: mockTrip, error: null });
    const membersTable = createMembersTable([{ data: { id: 'membership-1' }, error: null }]);

    fromMock.mockImplementation((table: string) => {
      if (table === 'trips') {
        return tripsTable;
      }
      if (table === 'trip_members') {
        return membersTable;
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await tripService.getTripById(mockTrip.id);

    expect(result).toEqual(mockTrip);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('falls back to edge function when trip is readable but active membership is missing', async () => {
    const tripsTable = createTripTable({ data: mockTrip, error: null });
    const membersTable = createMembersTable([{ data: null, error: null }]);

    fromMock.mockImplementation((table: string) => {
      if (table === 'trips') {
        return tripsTable;
      }
      if (table === 'trip_members') {
        return membersTable;
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    invokeMock.mockResolvedValue({
      data: { success: false, error_code: 'ACCESS_DENIED' },
      error: null,
    });

    await expect(tripService.getTripById(mockTrip.id)).rejects.toThrow('permission denied');
    expect(invokeMock).toHaveBeenCalledWith('get-trip-detail', {
      body: { tripId: mockTrip.id },
    });
  });

  it('retries membership check without status filter when schema does not have status column', async () => {
    const tripsTable = createTripTable({ data: mockTrip, error: null });
    const membersTable = createMembersTable([
      { data: null, error: { message: 'column "status" does not exist' } },
      { data: { id: 'membership-2' }, error: null },
    ]);

    fromMock.mockImplementation((table: string) => {
      if (table === 'trips') {
        return tripsTable;
      }
      if (table === 'trip_members') {
        return membersTable;
      }
      throw new Error(`Unexpected table: ${table}`);
    });

    const result = await tripService.getTripById(mockTrip.id);

    expect(result).toEqual(mockTrip);
    expect(invokeMock).not.toHaveBeenCalled();
  });
});
