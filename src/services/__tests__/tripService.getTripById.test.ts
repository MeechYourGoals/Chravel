import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tripService } from '../tripService';
import { supabase } from '@/integrations/supabase/client';
import { getCachedAuthUser } from '@/lib/authCache';

type MockResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

const createQueryChain = (result: MockResult) => {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return chain;
};

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

describe('tripService.getTripById', () => {
  const tripId = 'trip-123';
  const authUser = { id: 'user-123' };
  const tripRow = {
    id: tripId,
    name: 'Test Trip',
    created_by: 'owner-1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCachedAuthUser).mockResolvedValue(authUser as never);
  });

  it('falls back to canonical edge access check when trip row is readable but active membership is missing', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'trips') {
        return createQueryChain({ data: tripRow, error: null }) as never;
      }
      if (table === 'trip_members') {
        return createQueryChain({ data: null, error: null }) as never;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { success: false, error_code: 'ACCESS_DENIED' },
      error: null,
    } as never);

    await expect(tripService.getTripById(tripId)).rejects.toThrow('permission denied');
    expect(supabase.functions.invoke).toHaveBeenCalledWith('get-trip-detail', {
      body: { tripId },
    });
  });

  it('returns trip directly when active membership exists', async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'trips') {
        return createQueryChain({ data: tripRow, error: null }) as never;
      }
      if (table === 'trip_members') {
        return createQueryChain({ data: { id: 'member-1' }, error: null }) as never;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const result = await tripService.getTripById(tripId);
    expect(result).toEqual(tripRow);
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('handles pre-migration schema without trip_members.status by retrying membership check without status filter', async () => {
    let memberQueryCount = 0;

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'trips') {
        return createQueryChain({ data: tripRow, error: null }) as never;
      }
      if (table === 'trip_members') {
        memberQueryCount += 1;
        if (memberQueryCount === 1) {
          return createQueryChain({
            data: null,
            error: { message: 'column trip_members.status does not exist' },
          }) as never;
        }
        return createQueryChain({ data: { id: 'member-2' }, error: null }) as never;
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const result = await tripService.getTripById(tripId);
    expect(result).toEqual(tripRow);
    expect(memberQueryCount).toBe(2);
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });
});
