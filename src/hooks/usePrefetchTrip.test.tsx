import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePrefetchTrip } from './usePrefetchTrip';

const prefetchQuery = vi.fn();
const prefetchInfiniteQuery = vi.fn();

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    prefetchQuery,
    prefetchInfiniteQuery,
  }),
}));

vi.mock('@/services/tripService', () => ({
  tripService: {
    getTripById: vi.fn(),
    getTripMembersWithCreator: vi.fn(),
  },
}));

vi.mock('@/services/calendarService', () => ({
  calendarService: {
    getTripEvents: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
}));

vi.mock('@/services/paymentService', () => ({
  paymentService: {
    getTripPaymentMessages: vi.fn(),
  },
}));

vi.mock('@/services/paymentBalanceService', () => ({
  paymentBalanceService: {
    getBalanceSummary: vi.fn(),
  },
}));

vi.mock('@/services/tripMediaService', () => ({
  fetchTripMediaItemsPaginated: vi.fn(),
}));

vi.mock('@/services/tripPlacesService', () => ({
  fetchTripPlaces: vi.fn(),
}));

vi.mock('./useDemoMode', () => ({
  useDemoMode: () => ({
    isDemoMode: false,
  }),
}));

vi.mock('./useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
  }),
}));

vi.mock('@/store/demoTripMembersStore', () => ({
  useDemoTripMembersStore: {
    getState: () => ({
      addedMembers: {
        'trip-1': [{ id: 'member-1', name: 'Taylor' }],
      },
    }),
  },
}));

vi.mock('@/lib/tabChunkPreloader', () => ({
  preloadTabChunk: vi.fn(),
  preloadTabChunks: vi.fn(),
}));

function PrefetchHarness() {
  const { prefetch } = usePrefetchTrip();

  return (
    <button type="button" onClick={() => prefetch('trip-1')}>
      Prefetch trip
    </button>
  );
}

describe('usePrefetchTrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefetches detail and members using the same cache keys as trip detail', async () => {
    const user = userEvent.setup();

    render(<PrefetchHarness />);

    await user.click(screen.getByRole('button', { name: 'Prefetch trip' }));

    expect(prefetchQuery).toHaveBeenCalledTimes(3);

    const queryKeys = prefetchQuery.mock.calls.map(([options]) => options.queryKey);

    expect(queryKeys).toContainEqual(['trip', 'trip-1', 'user-123']);
    expect(queryKeys).toContainEqual(['trip-members', 'trip-1', 1]);
    expect(queryKeys).toContainEqual(['calendarEvents', 'trip-1']);
  });
});
