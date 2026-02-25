import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useUpdateTripBasecamp } from '../useTripBasecamp';
import { basecampService } from '@/services/basecampService';

vi.mock('@/services/basecampService', () => ({
  basecampService: {
    getTripBasecamp: vi.fn(),
    setTripBasecamp: vi.fn(),
  },
}));

vi.mock('@/hooks/useDemoMode', () => ({
  useDemoMode: () => ({ isDemoMode: false }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useUpdateTripBasecamp - offline guardrails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks basecamp updates while offline (never queued)', async () => {
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });

    const { result } = renderHook(() => useUpdateTripBasecamp('trip-1'), {
      wrapper: createWrapper(),
    });

    await expect(
      result.current.mutateAsync({ address: '123 Main St', name: 'Hotel' }),
    ).rejects.toThrow('OFFLINE:');

    expect(basecampService.setTripBasecamp).not.toHaveBeenCalled();
  });
});
