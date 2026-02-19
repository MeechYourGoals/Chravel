import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { waitFor } from '@testing-library/react';

import { useTripPolls } from '../useTripPolls';

const cacheStore = new Map<string, any>();

vi.mock('@/offline/cache', () => {
  return {
    getCachedEntities: vi.fn(async ({ tripId, entityType }: { tripId: string; entityType: string }) => {
      const keyPrefix = `${tripId}:${entityType}:`;
      const entities = [...cacheStore.entries()]
        .filter(([k]) => k.startsWith(keyPrefix))
        .map(([, v]) => v);
      return entities;
    }),
    cacheEntity: vi.fn(async ({ tripId, entityType, entityId, data }: any) => {
      cacheStore.set(`${tripId}:${entityType}:${entityId}`, {
        tripId,
        entityType,
        entityId,
        data,
        cachedAt: Date.now(),
      });
    }),
  };
});

vi.mock('@/hooks/useDemoMode', () => ({
  useDemoMode: () => ({ isDemoMode: false }),
}));

vi.mock('../useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/native/haptics', () => ({
  medium: vi.fn(),
  success: vi.fn(),
}));

vi.mock('@/services/offlineSyncService', () => ({
  offlineSyncService: {
    queueOperation: vi.fn(async () => 'op_1'),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
    },
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useTripPolls - offline vote optimistic persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheStore.clear();
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });

    cacheStore.set('trip-1:trip_polls:poll-1', {
      tripId: 'trip-1',
      entityType: 'trip_polls',
      entityId: 'poll-1',
      cachedAt: Date.now(),
      data: {
        id: 'poll-1',
        trip_id: 'trip-1',
        question: 'Where to eat?',
        options: [{ id: 'opt-1', text: 'Pizza', votes: 0, voters: [] }],
        total_votes: 0,
        status: 'active',
        created_by: 'user-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  });

  it('does not visually revert after offline vote (optimistic persisted to offline cache)', async () => {
    const { result } = renderHook(() => useTripPolls('trip-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.polls[0]?.total_votes).toBe(0);

    await expect(
      result.current.votePollAsync({ pollId: 'poll-1', optionIds: 'opt-1' }),
    ).rejects.toThrow('OFFLINE:');

    // Wait for onSettled invalidation/refetch to happen.
    await waitFor(() => {
      const poll = result.current.polls.find(p => p.id === 'poll-1');
      expect(poll?.total_votes).toBe(1);
    });

    // The optimistic vote should remain visible.
    const poll = result.current.polls.find(p => p.id === 'poll-1');
    expect(poll?.total_votes).toBe(1);
    expect(poll?.options.find(o => o.id === 'opt-1')?.votes).toBe(1);
  });
});

