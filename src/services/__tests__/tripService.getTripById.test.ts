import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { getCachedAuthUser } from '@/lib/authCache';
import { tripService } from '@/services/tripService';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('@/lib/authCache', () => ({
  getCachedAuthUser: vi.fn(),
}));

type QueryResult<T> = {
  data: T | null;
  error: { message: string; code?: string; details?: string } | null;
};

const baseTrip = {
  id: 'trip-123',
  name: 'Test Trip',
  created_by: 'owner-1',
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
  is_archived: false,
  trip_type: 'consumer',
};

const createTripBuilder = (result: QueryResult<typeof baseTrip>) => {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.maybeSingle.mockResolvedValue(result);
  return builder;
};

const createMembershipBuilder = (
  result: QueryResult<{ id: string }>,
  includeOr: boolean = true,
) => {
  const builder: {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    or?: ReturnType<typeof vi.fn>;
  } = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.maybeSingle.mockResolvedValue(result);

  if (includeOr) {
    builder.or = vi.fn();
    builder.or.mockReturnValue(builder);
  }

  return builder;
};

describe('tripService.getTripById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedAuthUser).mockResolvedValue({ id: 'user-1' } as never);
  });

  it('falls back to get-trip-detail when trip is readable but active membership is missing', async () => {
    const tripBuilder = createTripBuilder({ data: baseTrip, error: null });
    const membershipBuilder = createMembershipBuilder({ data: null, error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'trips') return tripBuilder as never;
      if (table === 'trip_members') return membershipBuilder as never;
      throw new Error(`Unexpected table ${table}`);
    });

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: false, error: 'Access denied', error_code: 'ACCESS_DENIED' },
      error: null,
    } as Awaited<ReturnType<typeof supabase.functions.invoke>>);

    await expect(tripService.getTripById(baseTrip.id)).rejects.toThrow('permission denied');

    expect(supabase.from).toHaveBeenCalledWith('trip_members');
    expect(supabase.functions.invoke).toHaveBeenCalledWith('get-trip-detail', {
      body: { tripId: baseTrip.id },
    });
  });

  it('returns trip directly when user has active membership', async () => {
    const tripBuilder = createTripBuilder({ data: baseTrip, error: null });
    const membershipBuilder = createMembershipBuilder({ data: { id: 'member-row' }, error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'trips') return tripBuilder as never;
      if (table === 'trip_members') return membershipBuilder as never;
      throw new Error(`Unexpected table ${table}`);
    });

    const result = await tripService.getTripById(baseTrip.id);

    expect(result).toEqual(baseTrip);
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('falls back to membership query without status filter when status column is missing', async () => {
    const tripBuilder = createTripBuilder({ data: baseTrip, error: null });
    const membershipWithStatusBuilder = createMembershipBuilder({
      data: null,
      error: { message: 'column "status" does not exist' },
    });
    const fallbackMembershipBuilder = createMembershipBuilder(
      {
        data: { id: 'member-row' },
        error: null,
      },
      false,
    );

    let membershipQueryCount = 0;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'trips') return tripBuilder as never;
      if (table === 'trip_members') {
        membershipQueryCount += 1;
        return (
          membershipQueryCount === 1 ? membershipWithStatusBuilder : fallbackMembershipBuilder
        ) as never;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const result = await tripService.getTripById(baseTrip.id);

    expect(result).toEqual(baseTrip);
    expect(membershipWithStatusBuilder.or).toHaveBeenCalledWith('status.is.null,status.eq.active');
    expect(membershipQueryCount).toBe(2);
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });
});
