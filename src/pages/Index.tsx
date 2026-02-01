import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { CreateTripModal } from '../components/CreateTripModal';
import { UpgradeModal } from '../components/UpgradeModal';
import { SettingsMenu } from '../components/SettingsMenu';
import { AuthModal } from '../components/AuthModal';
import { TripStatsOverview } from '../components/home/TripStatsOverview';
import { TripViewToggle } from '../components/home/TripViewToggle';
import { DesktopHeader } from '../components/home/DesktopHeader';
import { TripActionBar } from '../components/home/TripActionBar';
import { TripGrid } from '../components/home/TripGrid';
import {
  NativeTabBar,
  NativeTabBarSpacer,
  NativeTripTypeSwitcher,
  type TabId,
} from '../components/native';
import { RecommendationFilters } from '../components/home/RecommendationFilters';
import { FullPageLanding } from '../components/landing/FullPageLanding';
import { SearchOverlay } from '../components/home/SearchOverlay';
import { DemoModal } from '../components/conversion/DemoModal';
import { OnboardingCarousel } from '../components/onboarding';

import { useAuth } from '../hooks/useAuth';
import { useIsMobile } from '../hooks/use-mobile';
import { useDemoMode } from '../hooks/useDemoMode';
import { useDemoModeStore } from '../store/demoModeStore';
import { useTrips } from '../hooks/useTrips';
import { useMyPendingTrips } from '../hooks/useMyPendingTrips';
import { proTripMockData } from '../data/proTripMockData';
import { eventsMockData } from '../data/eventsMockData';
import { tripsData } from '../data/tripsData';
import { demoModeService } from '../services/demoModeService';
import { mockMyPendingRequests } from '../mockData/pendingRequestsMock';
import {
  calculateTripStats,
  calculateProTripStats,
  calculateEventStats,
} from '../utils/tripStatsCalculator';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useMobilePortrait } from '../hooks/useMobilePortrait';
import {
  convertSupabaseTripsToMock,
  convertSupabaseTripToProTrip,
  convertSupabaseTripToEvent,
} from '../utils/tripConverter';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import {
  filterTrips,
  filterProTrips,
  filterEvents,
  type DateFacet,
} from '../utils/semanticTripFilter';
import { useOnboarding } from '../hooks/useOnboarding';
import { shouldShowOnboarding, capturePendingDestination } from '../utils/onboardingUtils';
import { X } from 'lucide-react';

const Index = () => {
  usePerformanceMonitor('Index');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('myTrips');
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [recsFilter, setRecsFilter] = useState('all');
  const [settingsInitialConsumerSection, setSettingsInitialConsumerSection] = useState<
    string | undefined
  >(undefined);
  const [settingsInitialType, setSettingsInitialType] = useState<
    'consumer' | 'enterprise' | 'events'
  >('consumer');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Native iOS tab bar state (mobile only)
  const [activeTab, setActiveTab] = useState<TabId>('trips');
  const [showTripTypeSwitcher, setShowTripTypeSwitcher] = useState(false);

  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { demoView, isDemoMode, setDemoView } = useDemoMode();
  const isMobilePortrait = useMobilePortrait();

  // Initialize onboarding with user context for Supabase sync
  const {
    hasCompletedOnboarding,
    isInitialized,
    completeOnboarding,
    skipOnboarding,
    setPendingDestination,
    getPendingDestination,
    clearPendingDestination,
  } = useOnboarding({
    userId: user?.id,
    isDemoMode,
  });

  // Centralized onboarding decision
  const showOnboarding = shouldShowOnboarding({
    user,
    hasCompletedOnboarding,
    isInitialized,
    isDemoMode,
  });

  // Navigate to pending destination after onboarding, or stay on dashboard
  const navigateToPendingOrDashboard = useCallback(() => {
    const pendingDest = getPendingDestination();
    if (pendingDest) {
      clearPendingDestination();
      // Also clear the original invite code storage
      sessionStorage.removeItem('chravel_pending_invite_code');
      navigate(pendingDest, { replace: true });
    }
    // Otherwise stay on dashboard (default)
  }, [getPendingDestination, clearPendingDestination, navigate]);

  const handleOnboardingComplete = useCallback(async () => {
    await completeOnboarding();
    navigateToPendingOrDashboard();
  }, [completeOnboarding, navigateToPendingOrDashboard]);

  const handleOnboardingSkip = useCallback(async () => {
    await skipOnboarding();
    navigateToPendingOrDashboard();
  }, [skipOnboarding, navigateToPendingOrDashboard]);

  const handleOnboardingExploreDemoTrip = useCallback(async () => {
    await completeOnboarding();
    setDemoView('app-preview');
    // Clear any pending destination since user chose to explore demo
    clearPendingDestination();
    navigate('/trip/1');
  }, [completeOnboarding, setDemoView, clearPendingDestination, navigate]);

  const handleOnboardingCreateTrip = useCallback(async () => {
    // Mark onboarding as complete before opening create modal
    await completeOnboarding();
    clearPendingDestination();
    setIsCreateModalOpen(true);
  }, [completeOnboarding, clearPendingDestination]);

  // Handler for selecting a trip from search results
  const handleSearchTripSelect = useCallback(
    (tripId: string | number) => {
      setIsSearchOpen(false);
      setSearchQuery('');
      navigate(`/trip/${tripId}`);
    },
    [navigate]
  );

  // Clear stale demo mode for unauthenticated users visiting root (not from /demo redirect)
  useEffect(() => {
    const fromDemo = searchParams.get('from') === 'demo';

    if (fromDemo) {
      // Clean up the URL param, keep demo mode active
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('from');
      setSearchParams(newParams, { replace: true });
      return;
    }

    // Not from /demo redirect - clear stale demo mode for unauthenticated users
    if (!user && demoView === 'app-preview') {
      useDemoModeStore.getState().setDemoView('off');
    }
  }, [user, demoView, searchParams, setSearchParams]);

  // Counter to force re-renders when demo session state changes (archive/hide)
  const [demoRefreshCounter, setDemoRefreshCounter] = useState(0);

  // ✅ FIXED: Always call useTrips hook (Rules of Hooks requirement)
  // The hook handles demo mode internally, returning empty arrays when in demo mode
  const { trips: userTripsRaw, loading: tripsLoading, refreshTrips } = useTrips();

  // Callback to refresh trip list when a trip is archived/hidden/deleted
  const handleTripStateChange = useCallback(() => {
    if (isDemoMode) {
      setDemoRefreshCounter(prev => prev + 1);
    } else {
      // Refresh the trips query so hidden/archived/deleted trips disappear immediately
      refreshTrips();
    }
  }, [isDemoMode, refreshTrips]);

  // Fetch pending join requests for the current user (for "Requests" counter)
  const { pendingTrips: myPendingRequests } = useMyPendingTrips();

  // Use centralized trip data - demo data or real user data converted to mock format
  // ✅ FILTER: Only consumer trips in allTrips (Pro/Event filtered separately below)
  // ✅ FILTER: Exclude archived trips from main list (they have their own section)
  // ✅ FILTER: In demo mode, also exclude session-archived/hidden trips
  // ✅ SEPARATE: Pending trips from active trips
  const { activeTrips: allTrips, pendingTrips } = useMemo(() => {
    if (isDemoMode) {
      // Get session-scoped archived/hidden trip IDs
      const archivedIds = demoModeService.getSessionArchivedTripIds();
      const hiddenIds = demoModeService.getSessionHiddenTripIds();

      // Filter out trips that have been archived or hidden in this session
      const filteredTrips = tripsData.filter(
        t =>
          !t.archived &&
          !archivedIds.includes(t.id.toString()) &&
          !hiddenIds.includes(t.id.toString()),
      );

      return {
        activeTrips: filteredTrips,
        pendingTrips: [],
      };
    }
    const converted = convertSupabaseTripsToMock(
      userTripsRaw.filter(t => (t.trip_type === 'consumer' || !t.trip_type) && !t.is_archived),
    );
    // Separate pending trips from active trips
    const active = converted.filter(t => (t as any).membership_status !== 'pending');
    const pending = converted.filter(t => (t as any).membership_status === 'pending');
    return {
      activeTrips: active,
      pendingTrips: pending,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemoMode, userTripsRaw, demoRefreshCounter]);

  // Unified semantic search + date facet filtering
  const trips = useMemo(() => {
    return filterTrips(allTrips, searchQuery, activeFilter as DateFacet | '');
  }, [allTrips, searchQuery, activeFilter]);

  // Count total results for current view mode
  const searchResultCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;

    // Filter based on current view mode
    if (viewMode === 'myTrips') {
      // Only count consumer trips
      return trips.length;
    } else if (viewMode === 'pro') {
      // Only count pro trips
      const safeProTrips = isDemoMode ? proTripMockData : {};

      if (!isDemoMode && userTripsRaw) {
        const proTripsFromDB = userTripsRaw.filter(t => t.trip_type === 'pro');
        const proCount = proTripsFromDB.reduce(
          (acc, trip) => {
            acc[trip.id] = convertSupabaseTripToProTrip(trip);
            return acc;
          },
          {} as Record<string, any>,
        );
        const filteredPro = filterProTrips(proCount, searchQuery, activeFilter as DateFacet | '');
        return Object.keys(filteredPro).length;
      }

      const filteredPro = filterProTrips(safeProTrips, searchQuery, activeFilter as DateFacet | '');
      return Object.keys(filteredPro).length;
    } else if (viewMode === 'events') {
      // Only count events
      const safeEvents = isDemoMode ? eventsMockData : {};

      if (!isDemoMode && userTripsRaw) {
        const eventsFromDB = userTripsRaw.filter(t => t.trip_type === 'event');
        const eventCount = eventsFromDB.reduce(
          (acc, trip) => {
            acc[trip.id] = convertSupabaseTripToEvent(trip);
            return acc;
          },
          {} as Record<string, any>,
        );
        const filteredEvents = filterEvents(
          eventCount,
          searchQuery,
          activeFilter as DateFacet | '',
        );
        return Object.keys(filteredEvents).length;
      }

      const filteredEvents = filterEvents(safeEvents, searchQuery, activeFilter as DateFacet | '');
      return Object.keys(filteredEvents).length;
    }

    // For travelRecs or other modes, count all
    const safeProTrips = isDemoMode ? proTripMockData : {};
    const safeEvents = isDemoMode ? eventsMockData : {};

    if (!isDemoMode && userTripsRaw) {
      const proTripsFromDB = userTripsRaw.filter(t => t.trip_type === 'pro');
      const eventsFromDB = userTripsRaw.filter(t => t.trip_type === 'event');

      const proCount = proTripsFromDB.reduce(
        (acc, trip) => {
          acc[trip.id] = convertSupabaseTripToProTrip(trip);
          return acc;
        },
        {} as Record<string, any>,
      );

      const eventCount = eventsFromDB.reduce(
        (acc, trip) => {
          acc[trip.id] = convertSupabaseTripToEvent(trip);
          return acc;
        },
        {} as Record<string, any>,
      );

      const filteredPro = filterProTrips(proCount, searchQuery, activeFilter as DateFacet | '');
      const filteredEvents = filterEvents(eventCount, searchQuery, activeFilter as DateFacet | '');

      return trips.length + Object.keys(filteredPro).length + Object.keys(filteredEvents).length;
    }

    const filteredPro = filterProTrips(safeProTrips, searchQuery, activeFilter as DateFacet | '');
    const filteredEvents = filterEvents(safeEvents, searchQuery, activeFilter as DateFacet | '');

    return trips.length + Object.keys(filteredPro).length + Object.keys(filteredEvents).length;
  }, [searchQuery, trips.length, isDemoMode, userTripsRaw, activeFilter, viewMode]);

  // Development diagnostics available via console when needed

  // Calculate requests count per view mode (scoped by trip_type)
  const requestsCounts = useMemo(() => {
    // Demo mode: show mock pending requests count (all consumer for demo)
    if (isDemoMode) {
      return { consumer: mockMyPendingRequests.length, pro: 0, event: 0 };
    }

    if (!myPendingRequests) {
      return { consumer: 0, pro: 0, event: 0 };
    }
    // Group pending requests by trip type
    // Note: myPendingRequests contains trip_join_requests with trip info
    // We need to determine trip_type from the trip data
    let consumer = 0;
    let pro = 0;
    let event = 0;

    myPendingRequests.forEach(req => {
      // Look up the trip in userTripsRaw to get trip_type
      const tripData = userTripsRaw.find(t => t.id === req.trip_id);
      if (tripData) {
        if (tripData.trip_type === 'pro') pro++;
        else if (tripData.trip_type === 'event') event++;
        else consumer++;
      } else {
        // Default to consumer if trip data not found
        consumer++;
      }
    });

    return { consumer, pro, event };
  }, [isDemoMode, myPendingRequests, userTripsRaw]);

  // Calculate stats for each view mode - use UNFILTERED data for accurate counts
  // Stats should reflect total counts, not filtered counts
  const tripStats = useMemo(() => {
    return calculateTripStats(allTrips, requestsCounts.consumer);
  }, [allTrips, requestsCounts.consumer]);

  const proTripStats = useMemo(() => {
    // Get unfiltered pro trips data (excluding archived)
    let safeProTrips = isDemoMode
      ? Object.fromEntries(
          Object.entries(proTripMockData || {}).filter(([_, trip]) => !trip.archived),
        )
      : {};

    if (!isDemoMode && userTripsRaw) {
      const proTripsFromDB = userTripsRaw.filter(t => t.trip_type === 'pro' && !t.is_archived);
      if (proTripsFromDB.length > 0) {
        safeProTrips = proTripsFromDB.reduce(
          (acc, trip) => {
            acc[trip.id] = convertSupabaseTripToProTrip(trip);
            return acc;
          },
          {} as Record<string, any>,
        );
      }
    }

    // Stats should show total counts, not filtered counts
    // Only apply date filter when calculating stats for that specific filter
    return calculateProTripStats(safeProTrips, requestsCounts.pro);
  }, [isDemoMode, userTripsRaw, requestsCounts.pro]);

  const eventStats = useMemo(() => {
    // Get unfiltered events data (excluding archived)
    let safeEvents = isDemoMode
      ? Object.fromEntries(
          Object.entries(eventsMockData || {}).filter(([_, event]) => !event.archived),
        )
      : {};

    if (!isDemoMode && userTripsRaw) {
      const eventsFromDB = userTripsRaw.filter(t => t.trip_type === 'event' && !t.is_archived);
      if (eventsFromDB.length > 0) {
        safeEvents = eventsFromDB.reduce(
          (acc, trip) => {
            acc[trip.id] = convertSupabaseTripToEvent(trip);
            return acc;
          },
          {} as Record<string, any>,
        );
      }
    }

    // Stats should show total counts, not filtered counts
    return calculateEventStats(safeEvents, requestsCounts.event);
  }, [isDemoMode, userTripsRaw, requestsCounts.event]);

  const getCurrentStats = () => {
    switch (viewMode) {
      case 'myTrips':
        return tripStats;
      case 'tripsPro':
        return proTripStats;
      case 'events':
        return eventStats;
      default:
        return tripStats;
    }
  };

  // 🛡️ Unified filtering with semantic search + date facets
  const filteredData = useMemo(() => {
    // Always ensure safe values
    const safeTrips = Array.isArray(trips) ? trips : [];
    const safePendingTrips = Array.isArray(pendingTrips) ? pendingTrips : [];

    // Initialize with demo data or empty objects
    let safeProTrips = isDemoMode ? proTripMockData || {} : {};
    let safeEvents = isDemoMode ? eventsMockData || {} : {};

    // For authenticated users, populate proTrips and events from userTripsRaw
    // ✅ FILTER: Exclude archived trips from main list
    if (!isDemoMode && userTripsRaw) {
      const proTripsFromDB = userTripsRaw.filter(t => t.trip_type === 'pro' && !t.is_archived);
      const eventsFromDB = userTripsRaw.filter(t => t.trip_type === 'event' && !t.is_archived);

      if (proTripsFromDB.length > 0) {
        safeProTrips = proTripsFromDB.reduce(
          (acc, trip) => {
            acc[trip.id] = convertSupabaseTripToProTrip(trip);
            return acc;
          },
          {} as Record<string, any>,
        );
      }

      if (eventsFromDB.length > 0) {
        safeEvents = eventsFromDB.reduce(
          (acc, trip) => {
            acc[trip.id] = convertSupabaseTripToEvent(trip);
            return acc;
          },
          {} as Record<string, any>,
        );
      }
    }

    // Apply unified semantic filter (already includes search + date facet)
    // trips are already filtered above, now filter pro trips and events
    const filteredProTrips = filterProTrips(
      safeProTrips,
      searchQuery,
      activeFilter as DateFacet | '',
    );
    const filteredEvents = filterEvents(safeEvents, searchQuery, activeFilter as DateFacet | '');
    // Filter pending trips by search query
    const filteredPendingTrips = filterTrips(
      safePendingTrips,
      searchQuery,
      activeFilter as DateFacet | '',
    );

    return {
      trips: safeTrips,
      pendingTrips: filteredPendingTrips,
      proTrips: filteredProTrips,
      events: filteredEvents,
    };
  }, [trips, pendingTrips, isDemoMode, userTripsRaw, searchQuery, activeFilter]);

  // Handle view mode changes without artificial delays
  const handleViewModeChange = (newMode: string) => {
    if (newMode === 'upgrade') {
      setIsUpgradeModalOpen(true);
      return;
    }
    setViewMode(newMode);
    // Keep search query active when switching views
    setIsLoading(false);
  };

  // Clear search and reset filters
  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveFilter('');
  };

  const handleFilterClick = (filter: string) => {
    // Toggle filter: if same filter is clicked, clear it
    setActiveFilter(activeFilter === filter ? '' : filter);
  };

  // Handle native tab bar changes (mobile only)
  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    switch (tab) {
      case 'trips':
        // Show trip type switcher to let user choose My Trips/Pro/Events
        setShowTripTypeSwitcher(true);
        break;
      case 'search':
        setIsSearchOpen(true);
        break;
      case 'new':
        setIsCreateModalOpen(true);
        break;
      case 'alerts':
        setIsNotificationsOpen(true);
        break;
      case 'profile':
        setSettingsInitialType('consumer');
        setIsSettingsOpen(true);
        break;
    }
  }, []);

  // Handle trip type selection from the switcher (including travelRecs)
  const handleTripTypeSelect = useCallback(
    (type: 'myTrips' | 'tripsPro' | 'events' | 'travelRecs') => {
      if (type === 'travelRecs') {
        setViewMode('travelRecs');
      } else {
        setViewMode(type);
      }
      setActiveTab('trips');
    },
    [],
  );

  // Get current trip type for the tab bar label
  const getTripTypeForTabBar = useCallback(() => {
    if (viewMode === 'tripsPro') return 'Pro';
    if (viewMode === 'events') return 'Events';
    return 'Trips';
  }, [viewMode]);

  const handleCreateTrip = () => {
    setIsCreateModalOpen(true);
  };

  // Open settings to saved recs if requested via query params
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const open = sp.get('openSettings');
    if (open === 'saved-recs') {
      setSettingsInitialConsumerSection('saved-recs');
      setIsSettingsOpen(true);
    }
  }, [location.search]);

  // Detect mobile search trigger from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('search') === 'open') {
      setIsSearchOpen(true);
      // Clean up URL without triggering navigation
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [location.search]);

  // Handle pending invite code after login
  // If user hasn't completed onboarding, store as pending destination
  // Otherwise, navigate immediately
  useEffect(() => {
    if (!user) return;

    const pendingInviteCode = sessionStorage.getItem('chravel_pending_invite_code');
    if (pendingInviteCode) {
      const destination = `/join/${pendingInviteCode}`;

      if (showOnboarding) {
        // User needs onboarding - store destination for after completion
        setPendingDestination(destination);
        // Don't remove the invite code yet - onboarding will handle cleanup
      } else {
        // User has completed onboarding - navigate immediately
        sessionStorage.removeItem('chravel_pending_invite_code');
        navigate(destination, { replace: true });
      }
    }
  }, [user, showOnboarding, navigate, setPendingDestination]);

  // Capture any other deep link destinations when onboarding will be shown
  useEffect(() => {
    if (!user || !showOnboarding) return;

    // Check if there's already a pending destination (e.g., from invite code)
    const existingPending = getPendingDestination();
    if (existingPending) return;

    // Capture current path as potential destination (for direct deep link visits)
    const captured = capturePendingDestination(location.pathname);
    if (captured) {
      setPendingDestination(captured);
    }
  }, [user, showOnboarding, location.pathname, getPendingDestination, setPendingDestination]);

  // MRKTING toggle: Show marketing page only for unauthenticated users
  if (demoView === 'off' && !user) {
    return (
      <div className="min-h-screen min-h-mobile-screen bg-background font-outfit">
        <FullPageLanding onSignUp={() => setIsAuthModalOpen(true)} />

        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  // Show onboarding for new authenticated users
  if (showOnboarding) {
    return (
      <OnboardingCarousel
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
        onExploreDemoTrip={handleOnboardingExploreDemoTrip}
        onCreateTrip={handleOnboardingCreateTrip}
      />
    );
  }

  // Show marketing landing when logged out (for Home/Demo views)
  if (!user) {
    // HOME (marketing state): Show authenticated user experience WITHOUT mock data
    // This renders the app interface as if logged in, but with empty/default state
    if (demoView === 'marketing') {
      return (
        <div className="min-h-screen min-h-mobile-screen bg-background font-sans geometric-bg wireframe-overlay">
          <div className="container mx-auto px-4 py-6 max-w-[1600px] relative z-10">
            {/* Desktop floating auth button */}
            {!isMobile && (
              <DesktopHeader
                viewMode={viewMode}
                onCreateTrip={handleCreateTrip}
                onUpgrade={() => setIsUpgradeModalOpen(true)}
                onSettings={(settingsType, activeSection) => {
                  if (settingsType === 'advertiser') {
                    navigate('/advertiser');
                  } else {
                    if (settingsType) setSettingsInitialType(settingsType);
                    if (activeSection) setSettingsInitialConsumerSection(activeSection);
                    setIsSettingsOpen(true);
                  }
                }}
              />
            )}

            <div className="max-w-[1500px] mx-auto">
              {/* Desktop navigation - hidden on mobile, use NativeTabBar instead */}
              <div className="hidden lg:flex w-full flex-col lg:flex-row gap-1.5 sm:gap-3 lg:gap-6 items-stretch mb-3 sm:mb-6">
                <TripViewToggle
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange}
                  showRecsTab={true}
                  recsTabDisabled={true}
                  className="w-full lg:flex-1 h-12 sm:h-16"
                  requireAuth={true}
                  onAuthRequired={() => setIsAuthModalOpen(true)}
                />
                <TripActionBar
                  onSettings={() => setIsSettingsOpen(true)}
                  onCreateTrip={handleCreateTrip}
                  onSearch={() => setIsSearchOpen(true)}
                  onNotifications={() => {}}
                  isNotificationsOpen={isNotificationsOpen}
                  setIsNotificationsOpen={setIsNotificationsOpen}
                  className="w-full lg:flex-1 h-12 sm:h-16"
                  requireAuth={true}
                  onAuthRequired={() => setIsAuthModalOpen(true)}
                />
              </div>

              <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <TripStatsOverview
                  stats={getCurrentStats()}
                  viewMode={viewMode}
                  activeFilter={activeFilter}
                  onFilterClick={handleFilterClick}
                />
              </div>

              {viewMode === 'travelRecs' && (
                <div className="mb-6">
                  <RecommendationFilters
                    activeFilter={recsFilter}
                    onFilterChange={setRecsFilter}
                    showInlineSearch={true}
                  />
                </div>
              )}

              <div className="mb-12 animate-fade-in w-full" style={{ animationDelay: '0.2s' }}>
                <TripGrid
                  viewMode={viewMode}
                  trips={[]}
                  proTrips={{}}
                  events={{}}
                  loading={isLoading}
                  onCreateTrip={handleCreateTrip}
                  activeFilter={recsFilter}
                  onTripStateChange={handleTripStateChange}
                />
              </div>
            </div>
          </div>

          <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

          <CreateTripModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

          <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />

          <SettingsMenu
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            initialConsumerSection={settingsInitialConsumerSection}
            initialSettingsType={settingsInitialType}
            onTripStateChange={handleTripStateChange}
          />

          {/* Search indicator when active */}
          {searchQuery && (
            <div className="flex items-center gap-2 mb-4 p-3 bg-primary/10 backdrop-blur-sm rounded-xl border border-primary/20 animate-fade-in">
              <div className="flex items-center gap-2 flex-1">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm font-medium">
                  Active search: <span className="text-primary">"{searchQuery}"</span>
                  {activeFilter && activeFilter !== 'total' && (
                    <span className="text-muted-foreground"> + {activeFilter}</span>
                  )}
                </span>
              </div>
              <button
                onClick={handleClearSearch}
                className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg transition-colors"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            </div>
          )}

          <SearchOverlay
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            resultCount={searchResultCount}
            matchingTrips={trips}
            onTripSelect={handleSearchTripSelect}
          />

          {/* iOS-style bottom tab bar (mobile only) */}
          <NativeTabBar
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onNewPress={() => setIsCreateModalOpen(true)}
            alertsBadge={0}
            tripTypeLabel={getTripTypeForTabBar()}
            onTripTypePress={() => setShowTripTypeSwitcher(true)}
          />
          <NativeTabBarSpacer />

          {/* Trip type switcher (Instagram-style) - now includes Chravel Recs */}
          <NativeTripTypeSwitcher
            isOpen={showTripTypeSwitcher}
            onClose={() => setShowTripTypeSwitcher(false)}
            selectedType={
              viewMode === 'tripsPro'
                ? 'tripsPro'
                : viewMode === 'events'
                  ? 'events'
                  : viewMode === 'travelRecs'
                    ? 'travelRecs'
                    : 'myTrips'
            }
            onSelectType={handleTripTypeSelect}
            showRecsOption={true}
            recsDisabled={!isDemoMode}
          />
        </div>
      );
    }

    // MOCK (app-preview state): Show full app interface WITH mock data
    return (
      <div className="min-h-screen min-h-mobile-screen bg-background font-sans geometric-bg wireframe-overlay">
        <div className="container mx-auto px-4 py-6 max-w-[1600px] relative z-10">
          {/* Desktop floating auth button */}
          {!isMobile && (
            <DesktopHeader
              viewMode={viewMode}
              onCreateTrip={handleCreateTrip}
              onUpgrade={() => setIsUpgradeModalOpen(true)}
              onSettings={(settingsType, activeSection) => {
                if (settingsType === 'advertiser') {
                  navigate('/advertiser');
                } else {
                  if (settingsType) setSettingsInitialType(settingsType);
                  if (activeSection) setSettingsInitialConsumerSection(activeSection);
                  setIsSettingsOpen(true);
                }
              }}
            />
          )}

          <div className="max-w-[1500px] mx-auto">
            {/* Desktop navigation - hidden on mobile, use NativeTabBar instead */}
            <div className="hidden lg:flex w-full flex-col lg:flex-row gap-1.5 sm:gap-3 lg:gap-6 items-stretch mb-3 sm:mb-6">
              <TripViewToggle
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                showRecsTab={true}
                recsTabDisabled={!isDemoMode}
                className="w-full lg:flex-1 h-12 sm:h-16"
              />
              <TripActionBar
                onSettings={() => setIsSettingsOpen(true)}
                onCreateTrip={handleCreateTrip}
                onSearch={() => setIsSearchOpen(true)}
                onNotifications={() => {}}
                isNotificationsOpen={isNotificationsOpen}
                setIsNotificationsOpen={setIsNotificationsOpen}
                className="w-full lg:flex-1 h-12 sm:h-16"
              />
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <TripStatsOverview
                stats={getCurrentStats()}
                viewMode={viewMode}
                activeFilter={activeFilter}
                onFilterClick={handleFilterClick}
              />
            </div>

            {viewMode === 'travelRecs' && (
              <div className="mb-6">
                <RecommendationFilters
                  activeFilter={recsFilter}
                  onFilterChange={setRecsFilter}
                  showInlineSearch={true}
                />
              </div>
            )}

            <div className="mb-12 animate-fade-in w-full" style={{ animationDelay: '0.2s' }}>
              <TripGrid
                viewMode={viewMode}
                trips={filteredData.trips}
                pendingTrips={filteredData.pendingTrips}
                proTrips={filteredData.proTrips}
                events={filteredData.events}
                loading={isLoading}
                onCreateTrip={handleCreateTrip}
                activeFilter={recsFilter}
                onTripStateChange={handleTripStateChange}
              />
            </div>
          </div>
        </div>

        {/* PersistentCTABar removed until production-ready MVP launch */}

        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

        <CreateTripModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

        <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />

        <SettingsMenu
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          initialConsumerSection={settingsInitialConsumerSection}
          initialSettingsType={settingsInitialType}
          onTripStateChange={handleTripStateChange}
        />

        <DemoModal
          isOpen={isDemoModalOpen}
          onClose={() => setIsDemoModalOpen(false)}
          demoType={viewMode === 'events' ? 'events' : 'pro'}
        />

        {/* Search indicator when active */}
        {searchQuery && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-primary/10 backdrop-blur-sm rounded-xl border border-primary/20 animate-fade-in">
            <div className="flex items-center gap-2 flex-1">
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                Active search: <span className="text-primary">"{searchQuery}"</span>
                {activeFilter && activeFilter !== 'total' && (
                  <span className="text-muted-foreground"> + {activeFilter}</span>
                )}
              </span>
            </div>
            <button
              onClick={handleClearSearch}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          </div>
        )}

        <SearchOverlay
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          resultCount={searchResultCount}
        />

        {/* iOS-style bottom tab bar (mobile only) */}
        <NativeTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onNewPress={() => setIsCreateModalOpen(true)}
          alertsBadge={0}
          tripTypeLabel={getTripTypeForTabBar()}
          onTripTypePress={() => setShowTripTypeSwitcher(true)}
        />
        <NativeTabBarSpacer />

        {/* Trip type switcher (Instagram-style) - now includes Chravel Recs */}
        <NativeTripTypeSwitcher
          isOpen={showTripTypeSwitcher}
          onClose={() => setShowTripTypeSwitcher(false)}
          selectedType={
            viewMode === 'tripsPro'
              ? 'tripsPro'
              : viewMode === 'events'
                ? 'events'
                : viewMode === 'travelRecs'
                  ? 'travelRecs'
                  : 'myTrips'
          }
          onSelectType={handleTripTypeSelect}
          showRecsOption={true}
          recsDisabled={!isDemoMode}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-mobile-screen bg-background font-sans geometric-bg wireframe-overlay">
      {/* Enhanced animated background elements (disabled on mobile portrait) */}
      {!isMobilePortrait && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none animated-bg">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-float"></div>
          <div
            className="absolute top-3/4 right-1/4 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-float"
            style={{ animationDelay: '2s' }}
          ></div>
          <div
            className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-primary/6 rounded-full blur-3xl animate-float"
            style={{ animationDelay: '4s' }}
          ></div>
        </div>
      )}
      <div className="container mx-auto px-4 py-6 max-w-[1600px] relative z-10">
        {/* Desktop floating auth button */}
        {!isMobile && (
          <DesktopHeader
            viewMode={viewMode}
            onCreateTrip={handleCreateTrip}
            onUpgrade={() => setIsUpgradeModalOpen(true)}
            onSettings={(settingsType, activeSection) => {
              if (settingsType === 'advertiser') {
                navigate('/advertiser');
              } else {
                if (settingsType) setSettingsInitialType(settingsType);
                if (activeSection) setSettingsInitialConsumerSection(activeSection);
                setIsSettingsOpen(true);
              }
            }}
          />
        )}

        {/* Mobile auth moved to Settings menu - no floating button needed */}

        {/* Desktop navigation - hidden on mobile, use NativeTabBar instead */}
        <div className="hidden lg:flex w-full flex-col lg:flex-row gap-1.5 sm:gap-3 lg:gap-6 items-stretch mb-3 sm:mb-6">
          <TripViewToggle
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            showRecsTab={true}
            recsTabDisabled={!isDemoMode}
            className="w-full lg:flex-1 h-12 sm:h-16"
          />
          <TripActionBar
            onSettings={() => {
              setSettingsInitialType('consumer');
              setIsSettingsOpen(true);
            }}
            onCreateTrip={handleCreateTrip}
            onSearch={(query: string) => {
              setSearchQuery(query);
              setIsSearchOpen(true);
            }}
            onNotifications={() => {}}
            isNotificationsOpen={isNotificationsOpen}
            setIsNotificationsOpen={setIsNotificationsOpen}
            className="w-full lg:flex-1 h-12 sm:h-16"
          />
        </div>

        {/* Trip Stats Overview with loading state - moved above filters for travel recs */}
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <TripStatsOverview
            stats={getCurrentStats()}
            viewMode={viewMode}
            activeFilter={activeFilter}
            onFilterClick={handleFilterClick}
          />
        </div>

        {/* Travel Recommendations Filters with inline search */}
        {viewMode === 'travelRecs' && (
          <div className="mb-6">
            <RecommendationFilters
              activeFilter={recsFilter}
              onFilterChange={setRecsFilter}
              showInlineSearch={true}
            />
          </div>
        )}

        {/* Search indicator when active */}
        {searchQuery && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-primary/10 backdrop-blur-sm rounded-xl border border-primary/20 animate-fade-in">
            <div className="flex items-center gap-2 flex-1">
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              <span className="text-sm font-medium">
                Active search: <span className="text-primary">"{searchQuery}"</span>
                {activeFilter && activeFilter !== 'total' && (
                  <span className="text-muted-foreground"> + {activeFilter}</span>
                )}
              </span>
            </div>
            <button
              onClick={handleClearSearch}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/10 rounded-lg transition-colors"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          </div>
        )}

        {/* Main Content - Trip Cards with enhanced loading and empty states */}
        <div className="mb-12 animate-fade-in w-full" style={{ animationDelay: '0.2s' }}>
          <TripGrid
            viewMode={viewMode}
            trips={filteredData.trips}
            pendingTrips={filteredData.pendingTrips}
            proTrips={filteredData.proTrips}
            events={filteredData.events}
            loading={tripsLoading}
            onCreateTrip={handleCreateTrip}
            activeFilter={activeFilter}
            myPendingRequests={isDemoMode ? mockMyPendingRequests : myPendingRequests}
            onTripStateChange={handleTripStateChange}
          />
        </div>
      </div>

      {/* PersistentCTABar removed until production-ready MVP launch */}

      {/* Modals */}
      <CreateTripModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />

      <UpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />

      <SettingsMenu
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialConsumerSection={settingsInitialConsumerSection}
        initialSettingsType={settingsInitialType}
        onTripStateChange={handleTripStateChange}
      />

      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        demoType={viewMode === 'events' ? 'events' : 'pro'}
      />

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        resultCount={searchResultCount}
        matchingTrips={trips}
        onTripSelect={handleSearchTripSelect}
      />

      {/* iOS-style bottom tab bar (mobile only) */}
      <NativeTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNewPress={() => setIsCreateModalOpen(true)}
        alertsBadge={0}
        tripTypeLabel={getTripTypeForTabBar()}
        onTripTypePress={() => setShowTripTypeSwitcher(true)}
      />
      <NativeTabBarSpacer />

      {/* Trip type switcher (Instagram-style) - now includes Chravel Recs */}
      <NativeTripTypeSwitcher
        isOpen={showTripTypeSwitcher}
        onClose={() => setShowTripTypeSwitcher(false)}
        selectedType={
          viewMode === 'tripsPro'
            ? 'tripsPro'
            : viewMode === 'events'
              ? 'events'
              : viewMode === 'travelRecs'
                ? 'travelRecs'
                : 'myTrips'
        }
        onSelectType={handleTripTypeSelect}
        showRecsOption={true}
        recsDisabled={!isDemoMode}
      />
    </div>
  );
};

export default Index;
