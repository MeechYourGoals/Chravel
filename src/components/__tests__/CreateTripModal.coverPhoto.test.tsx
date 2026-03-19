import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { CreateTripModal } from '../CreateTripModal';

const {
  createTripMock,
  storageFromMock,
  uploadMock,
  getPublicUrlMock,
  maybeSingleMock,
  selectMock,
  eqMock,
  updateMock,
  fromMock,
} = vi.hoisted(() => ({
  createTripMock: vi.fn(),
  storageFromMock: vi.fn(),
  uploadMock: vi.fn(),
  getPublicUrlMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  updateMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('../../hooks/useTrips', () => ({
  useTrips: () => ({
    createTrip: createTripMock,
    trips: [],
  }),
}));

vi.mock('../../hooks/useOrganization', () => ({
  useOrganization: () => ({
    organizations: [],
    fetchUserOrganizations: vi.fn(),
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@example.com' },
  }),
}));

vi.mock('../../hooks/useDemoMode', () => ({
  useDemoMode: () => ({
    isDemoMode: false,
  }),
}));

vi.mock('@/telemetry/events', () => ({
  tripEvents: {
    createStarted: vi.fn(),
    created: vi.fn(),
    createFailed: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: storageFromMock,
    },
    from: fromMock,
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('CreateTripModal cover photo upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    createTripMock.mockResolvedValue({ id: 'trip-123' });

    uploadMock.mockResolvedValue({ error: null });
    getPublicUrlMock.mockReturnValue({
      data: { publicUrl: 'https://example.com/cover.jpg' },
    });
    storageFromMock.mockReturnValue({
      upload: uploadMock,
      getPublicUrl: getPublicUrlMock,
    });

    maybeSingleMock.mockResolvedValue({ data: { id: 'trip-123' }, error: null });
    selectMock.mockReturnValue({
      maybeSingle: maybeSingleMock,
    });
    eqMock.mockReturnValue({
      select: selectMock,
    });
    updateMock.mockReturnValue({ eq: eqMock });
    fromMock.mockReturnValue({
      update: updateMock,
    });
  });

  it('uploads new-trip cover photo to trip-media bucket', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CreateTripModal isOpen={true} onClose={vi.fn()} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole('radio', { name: 'Event' }));
    await user.type(screen.getByPlaceholderText('e.g., Summer in Paris'), 'MLB All Star Weekend');

    const startDateInput = document.querySelector('input[name="startDate"]') as HTMLInputElement;
    const endDateInput = document.querySelector('input[name="endDate"]') as HTMLInputElement;
    expect(startDateInput).toBeTruthy();
    expect(endDateInput).toBeTruthy();
    await user.type(startDateInput, '2026-07-24');
    await user.type(endDateInput, '2026-07-28');

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    const coverFile = new File(['cover'], 'cover.png', { type: 'image/png' });
    await user.upload(fileInput, coverFile);

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(storageFromMock).toHaveBeenCalled();
    });

    const usedBuckets = storageFromMock.mock.calls.map(call => call[0]);
    expect(usedBuckets).toEqual(['trip-media', 'trip-media']);
  });
});
