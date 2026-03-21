import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tripService } from '../tripService';
import { supabase } from '@/integrations/supabase/client';

type SupabaseResponse<T> = {
  data: T;
  error: { message?: string } | null;
};

type ChainableResponse<T> = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  or: ReturnType<typeof vi.fn>;
  not: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  then: (onFulfilled?: (value: SupabaseResponse<T>) => unknown) => Promise<unknown>;
};

function createChainableMock<T>(response: SupabaseResponse<T>): ChainableResponse<T> {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    or: vi.fn(),
    not: vi.fn(),
    neq: vi.fn(),
    then: (onFulfilled?: (value: SupabaseResponse<T>) => unknown) =>
      Promise.resolve(response).then(onFulfilled),
  } as ChainableResponse<T>;

  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.in.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.or.mockReturnValue(chain);
  chain.not.mockReturnValue(chain);
  chain.neq.mockReturnValue(chain);

  return chain;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
      refreshSession: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('tripService.getUserTrips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falls back when trip_members.status filter is unavailable and still returns member trips', async () => {
    const tripRecord = {
      id: 'trip-member-1',
      name: 'MLB All Star Weekend',
      description: null,
      start_date: '2026-07-24',
      end_date: '2026-07-28',
      destination: 'Philadelphia, PA',
      trip_type: 'consumer',
      created_at: '2026-03-01T00:00:00.000Z',
      updated_at: '2026-03-01T00:00:00.000Z',
      cover_image_url: null,
      created_by: 'owner-user',
      is_archived: false,
      card_color: null,
      organizer_display_name: null,
    };

    let tripsQueryCount = 0;
    let tripMembersQueryCount = 0;
    let firstMemberQueryChain: ChainableResponse<unknown[]> | null = null;

    vi.mocked(supabase.from).mockImplementation(((table: string) => {
      if (table === 'trips') {
        tripsQueryCount += 1;
        if (tripsQueryCount === 1) {
          return createChainableMock({ data: [], error: null });
        }
        return createChainableMock({ data: [tripRecord], error: null });
      }

      if (table === 'trip_join_requests') {
        return createChainableMock({ data: [], error: null });
      }

      if (table === 'trip_members') {
        tripMembersQueryCount += 1;

        if (tripMembersQueryCount === 1) {
          const chain = createChainableMock<unknown[]>({
            data: [],
            error: { message: 'column trip_members.status does not exist' },
          });
          firstMemberQueryChain = chain;
          return chain;
        }

        if (tripMembersQueryCount === 2) {
          return createChainableMock({
            data: [{ trip_id: 'trip-member-1' }],
            error: null,
          });
        }

        return createChainableMock({
          data: [{ trip_id: 'trip-member-1', user_id: 'member-user' }],
          error: null,
        });
      }

      if (table === 'trip_events') {
        return createChainableMock({ data: [], error: null });
      }

      return createChainableMock({ data: [], error: null });
    }) as any);

    const trips = await tripService.getUserTrips(false, undefined, 'member-user');

    expect(firstMemberQueryChain?.or).toHaveBeenCalledWith('status.is.null,status.eq.active');
    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe('trip-member-1');
    expect(trips[0].membership_status).toBe('member');
  });
});
