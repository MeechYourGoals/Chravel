import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { CreateTripModal } from '../CreateTripModal';

const fetchUserOrganizationsMock = vi.fn();

vi.mock('../../hooks/useTrips', () => ({
  useTrips: () => ({
    createTrip: vi.fn(),
    trips: [],
  }),
}));

vi.mock('../../hooks/useOrganization', () => ({
  useOrganization: () => ({
    organizations: [],
    fetchUserOrganizations: fetchUserOrganizationsMock,
  }),
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
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
      from: vi.fn(),
    },
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CreateTripModal labels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses event-specific title copy when Event type is selected', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <CreateTripModal isOpen={true} onClose={vi.fn()} />
      </BrowserRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Create New Trip' })).toBeInTheDocument();
    expect(screen.getByText('Trip Title')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Event' }));

    expect(screen.getByRole('heading', { name: 'Create New Event' })).toBeInTheDocument();
    expect(screen.getByText('Event Title')).toBeInTheDocument();
  });
});
