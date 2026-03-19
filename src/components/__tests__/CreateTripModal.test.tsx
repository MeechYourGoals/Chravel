import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { CreateTripModal } from '../CreateTripModal';

vi.mock('@/hooks/useTrips', () => ({
  useTrips: () => ({
    createTrip: vi.fn(),
    trips: [],
  }),
}));

vi.mock('@/hooks/useOrganization', () => ({
  useOrganization: () => ({
    organizations: [],
    fetchUserOrganizations: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
    },
  }),
}));

vi.mock('@/hooks/useDemoMode', () => ({
  useDemoMode: () => ({
    isDemoMode: false,
  }),
}));

describe('CreateTripModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('switches header and title label to event-specific copy when Event is selected', async () => {
    const user = userEvent.setup();

    render(
      <BrowserRouter>
        <CreateTripModal isOpen={true} onClose={vi.fn()} />
      </BrowserRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Create New Trip' })).toBeInTheDocument();
    expect(screen.getByText('Trip Title')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /event/i }));

    expect(screen.getByRole('heading', { name: 'Create New Event' })).toBeInTheDocument();
    expect(screen.getByText('Event Title')).toBeInTheDocument();
  });
});
