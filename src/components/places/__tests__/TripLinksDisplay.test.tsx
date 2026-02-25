/**
 * TripLinksDisplay tests
 * Ensures loading state is finite and error/empty states surface instead of infinite spinner
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TripLinksDisplay } from '../TripLinksDisplay';
import * as tripLinksService from '@/services/tripLinksService';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
}));

vi.mock('@/hooks/useDemoMode', () => ({
  useDemoMode: () => ({ isDemoMode: false }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('TripLinksDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows spinner while loading, then content when loaded', async () => {
    vi.spyOn(tripLinksService, 'getTripLinks').mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([]), 50)),
    );

    render(<TripLinksDisplay tripId="trip-1" />, {
      wrapper: createTestWrapper(),
    });

    expect(screen.getByTestId('trip-links-loading')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText('Explore')).toBeInTheDocument();
        expect(screen.queryByTestId('trip-links-loading')).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('shows error state with retry when fetch fails', async () => {
    vi.spyOn(tripLinksService, 'getTripLinks').mockRejectedValue(new Error('Network error'));

    render(<TripLinksDisplay tripId="trip-1" />, {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(screen.getByText(/couldn't load links/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      },
      { timeout: 8000 },
    );
  });

  it('shows empty state when fetch returns empty array', async () => {
    vi.spyOn(tripLinksService, 'getTripLinks').mockResolvedValue([]);

    render(<TripLinksDisplay tripId="trip-1" />, {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(screen.getByText('Explore')).toBeInTheDocument();
        expect(screen.getByText(/share links for registries/i)).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('retry button refetches on error', { timeout: 25000 }, async () => {
    // First 2 calls fail (initial + auto-retry), 3rd (manual Retry) succeeds
    const getTripLinksSpy = vi
      .spyOn(tripLinksService, 'getTripLinks')
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockRejectedValueOnce(new Error('Retry failed'))
      .mockResolvedValueOnce([]);

    render(<TripLinksDisplay tripId="trip-1" />, {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      },
      { timeout: 10000 },
    );

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(
      () => {
        expect(getTripLinksSpy).toHaveBeenCalledTimes(3);
        expect(screen.getByText('Explore')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
