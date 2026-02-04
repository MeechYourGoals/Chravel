import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProTripDetail from '../ProTripDetail';
import { proTripMockData } from '../../data/proTripMockData';
import { getTripLabels } from '../../utils/tripLabels';

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
  ProTripDetailContent: ({ tripData }: { tripData?: { category?: string } }) => {
    const category = tripData?.category || '';
    const labels =
      category === 'Sports – Team Trip'
        ? { schedule: 'Game Schedule', team: 'Team Roster' }
        : category === 'Conference'
          ? { schedule: 'Conference Schedule', team: 'Conference Members' }
          : category === 'Tournament'
            ? { schedule: 'Tournament Schedule', team: 'Tournament Roster' }
            : category === 'Residency'
              ? { schedule: 'Residency Schedule', team: 'Show Crew' }
              : { schedule: 'Tour Schedule', team: 'Tour Team' };

    return (
      <div>
        <h2>{labels.schedule}</h2>
        <h2>{labels.team}</h2>
      </div>
    );
  },
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

const renderWithRouter = (id?: string) => {
  const path = id === undefined ? '/tour/pro-' : `/tour/pro-${id}`;
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/tour/pro-:proTripId" element={<ProTripDetail />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('ProTripDetail', () => {
  Object.keys(proTripMockData).forEach(id => {
    const data = proTripMockData[id];
    const labels = getTripLabels(data.category);

    it(`renders correct title and labels for trip ${id}`, () => {
      renderWithRouter(id);
      expect(screen.getByRole('heading', { name: data.title })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: labels.schedule })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: labels.team })).toBeInTheDocument();
    });
  });

  it('renders error message for invalid trip ID', () => {
    renderWithRouter('999');
    expect(screen.getByText('Trip Not Found')).toBeInTheDocument();
    expect(
      screen.getByText('The requested trip could not be found in demo data.'),
    ).toBeInTheDocument();
  });

  it('renders error message when trip ID is missing', () => {
    renderWithRouter();
    expect(screen.getByText('Trip Not Found')).toBeInTheDocument();
    expect(screen.getByText('No trip ID provided.')).toBeInTheDocument();
  });
});
