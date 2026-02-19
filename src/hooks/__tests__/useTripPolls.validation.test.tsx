import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useTripPolls } from '../useTripPolls';

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock('@/hooks/useDemoMode', () => ({
  useDemoMode: () => ({ isDemoMode: false }),
}));

vi.mock('../useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

vi.mock('../use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
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

vi.mock('@/offline/cache', () => ({
  getCachedEntities: vi.fn(async () => []),
  cacheEntity: vi.fn(async () => undefined),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })),
    },
    from: (...args: unknown[]) => fromMock(...args),
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

function createChain(response: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => response);
  chain.then = (onFulfilled: (value: typeof response) => unknown) =>
    Promise.resolve(response).then(onFulfilled);
  return chain;
}

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

describe('useTripPolls validation guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { writable: true, value: true });

    fromMock.mockImplementation((table: string) => {
      if (table === 'trip_polls') {
        return createChain({
          data: {
            id: 'poll-1',
            version: 1,
            allow_multiple: false,
            allow_vote_change: true,
          },
          error: null,
        });
      }

      return createChain({ data: [], error: null });
    });
  });

  it('rejects multi-option voting for single-choice polls before RPC call', async () => {
    const { result } = renderHook(() => useTripPolls('trip-1'), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.votePollAsync({ pollId: 'poll-1', optionIds: ['opt-1', 'opt-2'] }),
    ).rejects.toThrow('only allows one option');

    expect(rpcMock).not.toHaveBeenCalled();
  });
});
