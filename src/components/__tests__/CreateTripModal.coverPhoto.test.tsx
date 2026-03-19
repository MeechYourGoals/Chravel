import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { CreateTripModal } from '../CreateTripModal';

const {
  mockCreateTrip,
  mockUpdateTrip,
  mockFetchUserOrganizations,
  mockUpload,
  mockGetPublicUrl,
  mockFrom,
  mockTripsTableUpdate,
  mockTripsTableEq,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockCreateTrip: vi.fn(),
  mockUpdateTrip: vi.fn(),
  mockFetchUserOrganizations: vi.fn(),
  mockUpload: vi.fn(),
  mockGetPublicUrl: vi.fn(),
  mockFrom: vi.fn(),
  mockTripsTableUpdate: vi.fn(),
  mockTripsTableEq: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('../../hooks/useTrips', () => ({
  useTrips: () => ({
    createTrip: mockCreateTrip,
    updateTrip: mockUpdateTrip,
    trips: [],
  }),
}));

vi.mock('../../hooks/useOrganization', () => ({
  useOrganization: () => ({
    organizations: [],
    fetchUserOrganizations: mockFetchUserOrganizations,
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

vi.mock('../../hooks/useDemoMode', () => ({
  useDemoMode: () => ({
    isDemoMode: false,
  }),
}));

vi.mock('../../telemetry/events', () => ({
  tripEvents: {
    createStarted: vi.fn(),
    created: vi.fn(),
    createFailed: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
    from: mockFrom,
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('CreateTripModal cover photo upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockCreateTrip.mockResolvedValue({ id: 'trip-123' });
    mockUpdateTrip.mockResolvedValue(true);
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://cdn.chravel.test/trip-123/cover.png' },
    });
    mockTripsTableEq.mockResolvedValue({ data: null, error: null });
    mockTripsTableUpdate.mockReturnValue({ eq: mockTripsTableEq });
    mockFrom.mockReturnValue({ update: mockTripsTableUpdate });

    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:cover-preview'),
      writable: true,
    });
  });

  it('updates trip cover through shared trip updater after upload', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    const { container } = render(
      <MemoryRouter>
        <CreateTripModal isOpen={true} onClose={onClose} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Event' }));

    const titleInput = container.querySelector<HTMLInputElement>('input[name="title"]');
    const startDateInput = container.querySelector<HTMLInputElement>('input[name="startDate"]');
    const endDateInput = container.querySelector<HTMLInputElement>('input[name="endDate"]');
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]');

    expect(titleInput).not.toBeNull();
    expect(startDateInput).not.toBeNull();
    expect(endDateInput).not.toBeNull();
    expect(fileInput).not.toBeNull();

    if (!titleInput || !startDateInput || !endDateInput || !fileInput) {
      throw new Error('Expected form inputs not found');
    }

    await user.type(titleInput, 'MLB All Star Weekend');
    fireEvent.change(startDateInput, { target: { value: '2026-07-24' } });
    fireEvent.change(endDateInput, { target: { value: '2026-07-28' } });

    const coverFile = new File(['cover-image'], 'cover.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [coverFile] } });

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mockCreateTrip).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'MLB All Star Weekend',
          trip_type: 'event',
        }),
      );
    });

    await waitFor(() => {
      expect(mockUpdateTrip).toHaveBeenCalledWith('trip-123', {
        cover_image_url: 'https://cdn.chravel.test/trip-123/cover.png',
      });
    });
  });
});
