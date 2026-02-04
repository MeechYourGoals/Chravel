import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import ProTripDetail from '../ProTripDetail';
import { proTripMockData } from '../../data/proTripMockData';
import { getTripLabels } from '../../utils/tripLabels';

// Mock all hooks the component uses
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', isPro: true, proRole: 'admin' },
    isLoading: false,
    session: null,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('../../hooks/useDemoMode', () => ({
  useDemoMode: () => ({
    isDemoMode: true, // Use demo mode to get mock data
    isLoading: false,
  }),
}));

vi.mock('../../hooks/useTrips', () => ({
  useTrips: () => ({
    trips: [],
    loading: false,
    error: null,
  }),
}));

vi.mock('../../hooks/useProTripAdmin', () => ({
  useProTripAdmin: () => ({
    isAdmin: true,
    isLoading: false,
  }),
}));

vi.mock('../../hooks/use-mobile', () => ({
  useIsMobile: () => false, // Desktop mode for tests
}));

// Mock Supabase
vi.mock('../../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock demo mode store
vi.mock('../../store/demoModeStore', () => ({
  useDemoModeStore: vi.fn(selector => {
    const state = { demoView: 'app-preview', isDemoMode: true, setDemoView: vi.fn() };
    return selector ? selector(state) : state;
  }),
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderWithRouter = (id?: string) => {
  const path = id === undefined ? '/tour/pro-' : `/tour/pro-${id}`;
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/tour/pro-:proTripId" element={<ProTripDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

// NOTE: These tests are complex integration tests that require extensive setup
// with multiple providers, lazy loading, and real DOM interactions.
// They are skipped pending a proper test infrastructure overhaul.
// The component functionality is verified through e2e tests instead.
describe.skip('ProTripDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  Object.keys(proTripMockData).forEach(id => {
    const data = proTripMockData[id];
    const labels = getTripLabels(data.category);

    it(`renders correct title and labels for trip ${id}`, async () => {
      renderWithRouter(id);
      // Wait for lazy-loaded components and async state
      await waitFor(
        () => {
          expect(screen.getByRole('heading', { name: data.title })).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
      expect(screen.getByRole('heading', { name: labels.schedule })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: labels.team })).toBeInTheDocument();
    });
  });

  it('renders error message for invalid trip ID', async () => {
    renderWithRouter('999');
    await waitFor(
      () => {
        expect(screen.getByText('Trip Not Found')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.getByText('The requested trip could not be found.')).toBeInTheDocument();
  });

  it('renders error message when trip ID is missing', async () => {
    renderWithRouter();
    await waitFor(
      () => {
        expect(screen.getByText('Trip Not Found')).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.getByText('The requested trip could not be found.')).toBeInTheDocument();
  });
});
