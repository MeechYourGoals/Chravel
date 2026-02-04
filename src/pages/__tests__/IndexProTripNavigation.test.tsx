import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Index from '../Index';
import ProTripDetail from '../ProTripDetail';
import { proTripMockData } from '../../data/proTripMockData';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'demo-user' } }),
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

vi.mock('@/store/demoModeStore', () => {
  const state = {
    demoView: 'app-preview',
    isDemoMode: true,
    isLoading: false,
  };
  const getState = () => ({
    ...state,
    setDemoView: vi.fn(),
    toggle: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
  });
  const useDemoModeStore = Object.assign(
    (selector?: (s: typeof state) => unknown) => (selector ? selector(state) : state),
    { getState },
  );
  return { useDemoModeStore };
});

vi.mock('@/hooks/useTrips', () => ({
  useTrips: () => ({
    trips: [],
    loading: false,
    refreshTrips: vi.fn(),
  }),
}));

vi.mock('@/hooks/useMyPendingTrips', () => ({
  useMyPendingTrips: () => ({
    pendingTrips: [],
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useOnboarding', () => ({
  useOnboarding: () => ({
    hasCompletedOnboarding: true,
    isInitialized: true,
    completeOnboarding: vi.fn(),
    skipOnboarding: vi.fn(),
    setPendingDestination: vi.fn(),
    getPendingDestination: vi.fn(() => null),
    clearPendingDestination: vi.fn(),
  }),
}));

vi.mock('@/hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => null,
}));

vi.mock('@/hooks/useMobilePortrait', () => ({
  useMobilePortrait: () => false,
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/services/demoModeService', () => ({
  demoModeService: {
    getSessionArchivedTripIds: vi.fn(() => []),
    getSessionHiddenTripIds: vi.fn(() => []),
  },
}));

vi.mock('@/components/home/TripViewToggle', () => ({
  TripViewToggle: ({ onViewModeChange }: { onViewModeChange: (value: string) => void }) => (
    <button onClick={() => onViewModeChange('tripsPro')}>Trips Pro</button>
  ),
}));

vi.mock('@/components/home/TripGrid', async () => {
  const { useNavigate } =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    TripGrid: ({
      viewMode,
      proTrips,
    }: {
      viewMode: string;
      proTrips: Record<string, { title: string }>;
    }) => {
      const navigate = useNavigate();
      if (viewMode !== 'tripsPro') {
        return null;
      }
      return (
        <div>
          {Object.entries(proTrips).map(([id]) => (
            <button key={id} onClick={() => navigate(`/tour/pro-${id}`)}>
              View Trip
            </button>
          ))}
        </div>
      );
    },
  };
});

vi.mock('@/components/home/TripStatsOverview', () => ({
  TripStatsOverview: () => null,
}));

vi.mock('@/components/home/TripActionBar', () => ({
  TripActionBar: () => null,
}));

vi.mock('@/components/home/DesktopHeader', () => ({
  DesktopHeader: () => null,
}));

vi.mock('@/components/home/RecommendationFilters', () => ({
  RecommendationFilters: () => null,
}));

vi.mock('@/components/home/SearchOverlay', () => ({
  SearchOverlay: () => null,
}));

vi.mock('@/components/landing/FullPageLanding', () => ({
  FullPageLanding: () => null,
}));

vi.mock('@/components/conversion/DemoModal', () => ({
  DemoModal: () => null,
}));

vi.mock('@/components/onboarding', () => ({
  OnboardingCarousel: () => null,
}));

vi.mock('@/components/native', () => ({
  NativeTabBar: () => null,
  NativeTabBarSpacer: () => null,
  NativeTripTypeSwitcher: () => null,
}));

vi.mock('@/components/CreateTripModal', () => ({
  CreateTripModal: () => null,
}));

vi.mock('@/components/UpgradeModal', () => ({
  UpgradeModal: () => null,
}));

vi.mock('@/components/SettingsMenu', () => ({
  SettingsMenu: () => null,
}));

vi.mock('@/components/AuthModal', () => ({
  AuthModal: () => null,
}));

vi.mock('../ProTripDetail', async () => {
  const { useParams } =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  const { proTripMockData } =
    await vi.importActual<typeof import('@/data/proTripMockData')>('@/data/proTripMockData');

  const MockProTripDetail = () => {
    const { proTripId } = useParams<{ proTripId?: string }>();
    const trip = proTripId ? proTripMockData[proTripId] : null;
    if (!trip) {
      return <h1>Trip Not Found</h1>;
    }
    return <h1>{trip.title}</h1>;
  };

  return {
    default: MockProTripDetail,
  };
});

const renderWithRouter = () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/tour/pro-:proTripId" element={<ProTripDetail />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe('Index ProTrip navigation', () => {
  const ids = Object.keys(proTripMockData);

  ids.forEach((id, index) => {
    it(`navigates to detail page for pro trip ${id}`, () => {
      renderWithRouter();

      fireEvent.click(screen.getByRole('button', { name: /trips pro/i }));

      const viewButtons = screen.getAllByRole('button', { name: /view trip/i });
      fireEvent.click(viewButtons[index]);

      expect(screen.getByRole('heading', { name: proTripMockData[id].title })).toBeInTheDocument();
    });
  });
});
