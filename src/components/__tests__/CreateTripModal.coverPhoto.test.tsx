import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { CreateTripModal } from '../CreateTripModal';

const mocks = vi.hoisted(() => {
  const mockNavigate = vi.fn();
  const mockCreateTrip = vi.fn();
  const mockUpdateTrip = vi.fn();
  const mockFetchUserOrganizations = vi.fn();
  const mockUpload = vi.fn();
  const mockGetPublicUrl = vi.fn();
  const mockTripsTableEq = vi.fn();
  const mockTripsTableUpdate = vi.fn(() => ({ eq: mockTripsTableEq }));
  const mockSupabaseFrom = vi.fn(() => ({ update: mockTripsTableUpdate }));

  return {
    mockNavigate,
    mockCreateTrip,
    mockUpdateTrip,
    mockFetchUserOrganizations,
    mockUpload,
    mockGetPublicUrl,
    mockTripsTableEq,
    mockTripsTableUpdate,
    mockSupabaseFrom,
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.mockNavigate,
  };
});

vi.mock('../../hooks/useTrips', () => ({
  useTrips: () => ({
    createTrip: mocks.mockCreateTrip,
    updateTrip: mocks.mockUpdateTrip,
    trips: [],
  }),
}));

vi.mock('../../hooks/useOrganization', () => ({
  useOrganization: () => ({
    organizations: [],
    fetchUserOrganizations: mocks.mockFetchUserOrganizations,
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-123' },
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

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mocks.mockUpload,
        getPublicUrl: mocks.mockGetPublicUrl,
      })),
    },
    from: mocks.mockSupabaseFrom,
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CreateTripModal cover image updates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockCreateTrip.mockResolvedValue({ id: 'trip-123' });
    mocks.mockUpdateTrip.mockResolvedValue(true);
    mocks.mockUpload.mockResolvedValue({ error: null });
    mocks.mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/trips/trip-123/cover.png' },
    });
    mocks.mockTripsTableEq.mockResolvedValue({ data: null, error: null });
  });

  it('routes cover URL persistence through useTrips.updateTrip', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MemoryRouter>
        <CreateTripModal isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>,
    );

    await user.type(screen.getByPlaceholderText('e.g., Summer in Paris'), 'MLB All Star Weekend');

    const startDateInput = container.querySelector('input[name="startDate"]');
    const endDateInput = container.querySelector('input[name="endDate"]');
    const fileInput = container.querySelector('input[type="file"]');

    if (!(startDateInput instanceof HTMLInputElement)) {
      throw new Error('Expected start date input to exist');
    }
    if (!(endDateInput instanceof HTMLInputElement)) {
      throw new Error('Expected end date input to exist');
    }
    if (!(fileInput instanceof HTMLInputElement)) {
      throw new Error('Expected cover image file input to exist');
    }

    fireEvent.change(startDateInput, { target: { value: '2026-07-24' } });
    fireEvent.change(endDateInput, { target: { value: '2026-07-28' } });
    await user.upload(
      fileInput,
      new File(['cover-image-bytes'], 'cover.png', { type: 'image/png' }),
    );

    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => {
      expect(mocks.mockUpdateTrip).toHaveBeenCalledWith('trip-123', {
        cover_image_url: 'https://cdn.example.com/trips/trip-123/cover.png',
      });
    });

    expect(mocks.mockSupabaseFrom).not.toHaveBeenCalled();
  });
});
