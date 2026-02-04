import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProTripDetail from '../ProTripDetail';

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/hooks/useDemoMode', () => ({
  useDemoMode: () => ({
    demoView: 'app-preview',
    isDemoMode: true,
    showDemoContent: true,
    isLoading: false,
    setDemoView: vi.fn(),
    enableDemoMode: vi.fn(),
    disableDemoMode: vi.fn(),
    toggleDemoMode: vi.fn(),
  }),
}));

vi.mock('@/hooks/useTrips', () => ({
  useTrips: () => ({
    trips: [],
    loading: false,
    refreshTrips: vi.fn(),
  }),
}));

vi.mock('@/hooks/useProTripAdmin', () => ({
  useProTripAdmin: () => ({ isAdmin: false }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'demo-user' } }),
}));

vi.mock('@/components/TripHeader', () => ({
  TripHeader: ({ trip }: { trip: { title: string } }) => <h1>{trip.title}</h1>,
}));

vi.mock('@/components/pro/ProTripDetailContent', () => ({
  ProTripDetailContent: () => (
    <div>
      <h2>Tour Schedule</h2>
      <h2>Tour Team</h2>
    </div>
  ),
}));

vi.mock('@/components/trip/TripDetailModals', () => ({
  TripDetailModals: () => null,
}));

vi.mock('@/components/trip/TripExportModal', () => ({
  TripExportModal: () => null,
}));

vi.mock('@/components/MessageInbox', () => ({
  MessageInbox: () => null,
}));

const renderWithRoutes = (path: string) => {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/tour/pro-:proTripId" element={<ProTripDetail />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('Route order for pro trips', () => {
  it('renders ProTripDetail when visiting /tour/pro-1', () => {
    renderWithRoutes('/tour/pro-1');
    // title from proTripMockData for id '1'
    expect(
      screen.getByRole('heading', { name: 'Eli Lilly C-Suite Retreat 2026' }),
    ).toBeInTheDocument();
  });
});
