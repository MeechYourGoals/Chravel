/**
 * Regression tests for canonical trip membership hook
 * Ensures Trip Members and Payments stay in sync (single source of truth)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useTripMembersQuery } from '../useTripMembersQuery';
import { tripService } from '@/services/tripService';

vi.mock('@/services/tripService', () => ({
  tripService: {
    getTripMembersWithCreator: vi.fn(),
  },
}));

vi.mock('@/hooks/useDemoMode', () => ({
  useDemoMode: () => ({ isDemoMode: false }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('@/store/demoTripMembersStore', () => ({
  useDemoTripMembersStore: () => 0,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTripMembersQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns members from getTripMembersWithCreator', async () => {
    vi.mocked(tripService.getTripMembersWithCreator).mockResolvedValue({
      members: [
        { id: 'user-1', name: 'Creator', avatar: undefined, isCreator: true },
        { id: 'user-2', name: 'Member', avatar: undefined, isCreator: false },
      ],
      creatorId: 'user-1',
    });

    const { result } = renderHook(() => useTripMembersQuery('trip-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tripMembers).toHaveLength(2);
    expect(result.current.tripMembers[0].name).toBe('Creator');
    expect(result.current.hadMembersError).toBe(false);
  });

  it('sets hadMembersError when fetch fails', async () => {
    vi.mocked(tripService.getTripMembersWithCreator).mockRejectedValue(new Error('Failed to load'));

    const { result } = renderHook(() => useTripMembersQuery('trip-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tripMembers).toEqual([]);
    expect(result.current.hadMembersError).toBe(true);
  });

  it('includes creator when trip_members is empty (creator fallback)', async () => {
    vi.mocked(tripService.getTripMembersWithCreator).mockResolvedValue({
      members: [{ id: 'creator-1', name: 'Trip Creator', avatar: undefined, isCreator: true }],
      creatorId: 'creator-1',
    });

    const { result } = renderHook(() => useTripMembersQuery('trip-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tripMembers).toHaveLength(1);
    expect(result.current.tripMembers[0].isCreator).toBe(true);
    expect(result.current.tripCreatorId).toBe('creator-1');
  });
});
