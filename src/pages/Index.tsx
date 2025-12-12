
import React, { useState, useEffect, useMemo } from 'react';

import { AuthPromptBanner } from '../components/mobile/AuthPromptBanner';
import { CreateTripModal } from '../components/CreateTripModal';
import { UpgradeModal } from '../components/UpgradeModal';
import { SettingsMenu } from '../components/SettingsMenu';
import { AuthModal } from '../components/AuthModal';
import { TripStatsOverview } from '../components/home/TripStatsOverview';
import { TripViewToggle } from '../components/home/TripViewToggle';
import { DesktopHeader } from '../components/home/DesktopHeader';
import { TripActionBar } from '../components/home/TripActionBar';
import { TripGrid } from '../components/home/TripGrid';
import { RecommendationFilters } from '../components/home/RecommendationFilters';
import { UnauthenticatedLanding } from '../components/UnauthenticatedLanding';
import { FullPageLanding } from '../components/landing/FullPageLanding';
import { DemoModeSelector } from '../components/DemoModeSelector';
import { SearchOverlay } from '../components/home/SearchOverlay';
import { HeaderAuthButton } from '../components/HeaderAuthButton';
import { MobileSettingsSheet } from '../components/mobile/MobileSettingsSheet';
import { MobileTopBar } from '../components/mobile/MobileTopBar';

// New conversion components
import { PersistentCTABar } from '../components/conversion/PersistentCTABar';
import { ReplacesGrid } from '../components/conversion/ReplacesGrid';
import { SocialProofSection } from '../components/conversion/SocialProofSection';
import { FeatureShowcase } from '../components/conversion/FeatureShowcase';
import { PricingSection } from '../components/conversion/PricingSection';
import { DemoModal } from '../components/conversion/DemoModal';

import { useAuth } from '../hooks/useAuth';
import { useIsMobile } from '../hooks/use-mobile';
import { useDemoMode } from '../hooks/useDemoMode';
import { useTrips } from '../hooks/useTrips';
import { useMyPendingTrips } from '../hooks/useMyPendingTrips';
import { proTripMockData } from '../data/proTripMockData';
import { eventsMockData } from '../data/eventsMockData';
import { tripsData } from '../data/tripsData';
import { mockMyPendingRequests } from '../mockData/pendingRequestsMock';
import { calculateTripStats, calculateProTripStats, calculateEventStats, filterItemsByStatus } from '../utils/tripStatsCalculator';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMobilePortrait } from '../hooks/useMobilePortrait';
import { convertSupabaseTripsToMock, convertSupabaseTripToProTrip, convertSupabaseTripToEvent } from '../utils/tripConverter';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';
import { filterTrips, filterProTrips, filterEvents, type DateFacet } from '../utils/semanticTripFilter';
import { X } from 'lucide-react';

const Index = () => {
  usePerformanceMonitor('Index');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [isPricingSectionVisible, setIsPricingSectionVisible] = useState(false);
  const [viewMode, setViewMode] = useState('myTrips');
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [recsFilter, setRecsFilter] = useState('all');
  const [settingsInitialConsumerSection, setSettingsInitialConsumerSection] = useState<string | undefined>(undefined);
  const [settingsInitialType, setSettingsInitialType] = useState<'consumer' | 'enterprise' | 'events'>('consumer');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { demoView, isDemoMode } = useDemoMode();
  const isMobilePortrait = useMobilePortrait();

  // ✅ FIXED: Always call useTrips hook (Rules of Hooks requirement)
  // The hook handles demo mode internally, returning empty arrays when in demo mode
  const { trips: userTripsRaw, loading: tripsLoading } = useTrips();

  // Fetch pending join requests for the current user (for "Requests" counter)
  const { pendingTrips: myPendingRequests } = useMyPendingTrips();

  // Marketing content should always show to unauthenticated users
  const showMarketingContent = !user;

  // Use centralized trip data - demo data or real user data converted to mock format
  // ✅ FILTER: Only consumer trips in allTrips (Pro/Event filtered separately below)
  // ✅ FILTER: Exclude archived trips from main list (they have their own section)
  // ✅ SEPARATE: Pending trips from active trips
  const { activeTrips: allTrips, pendingTrips } = useMemo(() => {
    if (isDemoMode) {
      return {
        activeTrips: tripsData.filter(t => !t.archived),
        pendingTrips: []
      };
    }
    const converted = convertSupabaseTripsToMock(
      userTripsRaw.filter(t => 
        (t.trip_type === 'consumer' || !t.trip_type) && !t.is_archived
      )
    );
    // Separate pending trips from active trips
    const active = converted.filter(t => (t as any).membership_status !== 'pending');
    const pending = converted.filter(t => (t as any).membership_status === 'pending');
    return {
      activeTrips: active,
      pendingTrips: pending
    };
  }, [isDemoMode, userTripsRaw]);
  
  // Unified semantic search + date facet filtering
  const trips = useMemo(() => {
    return filterTrips(allTrips, searchQuery, activeFilter as DateFacet | '');
  }, [allTrips, searchQuery, activeFilter]);

  // Count total results for current view mode
  const searchResultCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    
    // Get appropriate data based on demo mode
    const safeProTrips = isDemoMode ? proTripMockData : {};
    const safeEvents = isDemoMode ? eventsMockData : {};
    
    // For authenticated users, populate from userTripsRaw
    if (!isDemoMode && userTripsRaw) {
      const proTripsFromDB = userTripsRaw.filter(t => t.trip_type === 'pro');
      const eventsFromDB = userTripsRaw.filter(t => t.trip_type === 'event');
      
      const proCount = proTripsFromDB.reduce((acc, trip) => {
        acc[trip.id] = convertSupabaseTripToProTrip(trip);
        return acc;
      }, {} as Record<string, any>);
      
      const eventCount = eventsFromDB.reduce((acc, trip) => {
        acc[trip.id] = convertSupabaseTripToEvent(trip);
        return acc;
      }, {} as Record<string, any>);
      
      const filteredPro = filterProTrips(proCount, searchQuery, activeFilter as DateFacet | '');
      const filteredEvents = filterEvents(eventCount, searchQuery, activeFilter as DateFacet | '');
      
      return trips.length + Object.keys(filteredPro).length + Object.keys(filteredEvents).length;
    }
    
    // Demo mode counts
    const filteredPro = filterProTrips(safeProTrips, searchQuery, activeFilter as DateFacet | '');
    const filteredEvents = filterEvents(safeEvents, searchQuery, activeFilter as DateFacet | '');
    
    return trips.length + Object.keys(filteredPro).length + Object.keys(filteredEvents).length;
  }, [searchQuery, trips.length, isDemoMode, userTripsRaw, activeFilter]);

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
      ? Object.fromEntries(Object.entries(proTripMockData || {}).filter(([_, trip]) => !trip.archived))
      : {};
    
    if (!isDemoMode && userTripsRaw) {
      const proTripsFromDB = userTripsRaw.filter(t => t.trip_type === 'pro' && !t.is_archived);
      if (proTripsFromDB.length > 0) {
        safeProTrips = proTripsFromDB.reduce((acc, trip) => {
          acc[trip.id] = convertSupabaseTripToProTrip(trip);
          return acc;
        }, {} as Record<string, any>);
      }
    }
    
    // Stats should show total counts, not filtered counts
    // Only apply date filter when calculating stats for that specific filter
    return calculateProTripStats(safeProTrips, requestsCounts.pro);
  }, [isDemoMode, userTripsRaw, requestsCounts.pro]);
  
  const eventStats = useMemo(() => {
    // Get unfiltered events data (excluding archived)
    let safeEvents = isDemoMode 
      ? Object.fromEntries(Object.entries(eventsMockData || {}).filter(([_, event]) => !event.archived))
      : {};
    
    if (!isDemoMode && userTripsRaw) {
      const eventsFromDB = userTripsRaw.filter(t => t.trip_type === 'event' && !t.is_archived);
      if (eventsFromDB.length > 0) {
        safeEvents = eventsFromDB.reduce((acc, trip) => {
          acc[trip.id] = convertSupabaseTripToEvent(trip);
          return acc;
        }, {} as Record<string, any>);
      }
    }
    
    // Stats should show total counts, not filtered counts
    return calculateEventStats(safeEvents, requestsCounts.event);
  }, [isDemoMode, userTripsRaw, requestsCounts.event]);

  const getCurrentStats = () => {
    switch (viewMode) {
      case 'myTrips': return tripStats;
      case 'tripsPro': return proTripStats;
      case 'events': return eventStats;
      default: return tripStats;
    }
  };

  // 🛡️ Unified filtering with semantic search + date facets
  const filteredData = useMemo(() => {
    // Always ensure safe values
    const safeTrips = Array.isArray(trips) ? trips : [];
    const safePendingTrips = Array.isArray(pendingTrips) ? pendingTrips : [];
    
    // Initialize with demo data or empty objects
    let safeProTrips = isDemoMode ? (proTripMockData || {}) : {};
    let safeEvents = isDemoMode ? (eventsMockData || {}) : {};

    // For authenticated users, populate proTrips and events from userTripsRaw
    // ✅ FILTER: Exclude archived trips from main list
    if (!isDemoMode && userTripsRaw) {
      const proTripsFromDB = userTripsRaw.filter(t => t.trip_type === 'pro' && !t.is_archived);
      const eventsFromDB = userTripsRaw.filter(t => t.trip_type === 'event' && !t.is_archived);
      
      if (proTripsFromDB.length > 0) {
        safeProTrips = proTripsFromDB.reduce((acc, trip) => {
          acc[trip.id] = convertSupabaseTripToProTrip(trip);
          return acc;
        }, {} as Record<string, any>);
      }
      
      if (eventsFromDB.length > 0) {
        safeEvents = eventsFromDB.reduce((acc, trip) => {
          acc[trip.id] = convertSupabaseTripToEvent(trip);
          return acc;
        }, {} as Record<string, any>);
      }
    }

    // Apply unified semantic filter (already includes search + date facet)
    // trips are already filtered above, now filter pro trips and events
    const filteredProTrips = filterProTrips(safeProTrips, searchQuery, activeFilter as DateFacet | '');
    const filteredEvents = filterEvents(safeEvents, searchQuery, activeFilter as DateFacet | '');
    // Filter pending trips by search query
    const filteredPendingTrips = filterTrips(safePendingTrips, searchQuery, activeFilter as DateFacet | '');

    return {
      trips: safeTrips,
      pendingTrips: filteredPendingTrips,
      proTrips: filteredProTrips,
      events: filteredEvents
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

  const handleCreateTrip = () => {
    setIsCreateModalOpen(true);
  };

  const handleScheduleDemo = () => {
    setIsDemoModalOpen(true);
  };

  const handleSeePricing = () => {
    setIsPricingSectionVisible(true);
    // Scroll to pricing section
    const pricingSection = document.querySelector('#pricing-section');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  
  
  // Removed auto-switch - Chravel Recs now always visible with conditional interactivity

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
  useEffect(() => {
    if (user) {
      const pendingInviteCode = sessionStorage.getItem('chravel_pending_invite_code');
      if (pendingInviteCode) {
        sessionStorage.removeItem('chravel_pending_invite_code');
        navigate(`/join/${pendingInviteCode}`, { replace: true });
      }
    }
  }, [user, navigate]);

  // Show marketing landing when logged out, allow demo mode selector to control view
  if (!user) {
    // OFF: Show marketing page only
    if (demoView === 'off') {
      return (
        <div className="min-h-screen min-h-mobile-screen bg-background font-outfit">
          <FullPageLanding 
            onSignUp={() => setIsAuthModalOpen(true)}
          />
          
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />
        </div>
      );
    }

    // HOME (marketing state): Show authenticated user experience WITHOUT mock data
    // This renders the app interface as if logged in, but with empty/default state
    if (demoView === 'marketing') {
      return (
        <div className="min-h-screen min-h-mobile-screen bg-background font-sans geometric-bg wireframe-overlay">
          <div className="container mx-auto px-4 py-6 max-w-[1600px] relative z-10">
            {/* Desktop Header */}
            {!isMobile && (
              <div className="w-full">
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
              </div>
            )}

          {/* Mobile Top Bar for login/demo controls */}
          {isMobile && <MobileTopBar onSettingsPress={() => setIsMobileSettingsOpen(true)} />}

          <div className="max-w-[1500px] mx-auto" style={{ paddingTop: isMobile ? '64px' : '0' }}>
            {/* CSS-first responsive: stacks on mobile, side-by-side on lg+ */}
            <div className="w-full flex flex-col lg:flex-row gap-3 lg:gap-6 items-stretch mb-6">
              <TripViewToggle 
                viewMode={viewMode} 
                onViewModeChange={handleViewModeChange}
                showRecsTab={true}
                recsTabDisabled={true}
                className="w-full lg:flex-1 h-16"
                requireAuth={true}
                onAuthRequired={() => setIsAuthModalOpen(true)}
              />
              <TripActionBar
                onSettings={() => isMobile ? setIsMobileSettingsOpen(true) : setIsSettingsOpen(true)}
                onCreateTrip={handleCreateTrip}
                onSearch={() => setIsSearchOpen(true)}
                onNotifications={() => {}}
                isNotificationsOpen={isNotificationsOpen}
                setIsNotificationsOpen={setIsNotificationsOpen}
                className="w-full lg:flex-1 h-16"
                requireAuth={true}
                onAuthRequired={() => setIsAuthModalOpen(true)}
              />
            </div>

              {!isMobile && (
                <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <TripStatsOverview 
                    stats={getCurrentStats()} 
                    viewMode={viewMode} 
                    activeFilter={activeFilter}
                    onFilterClick={handleFilterClick}
                  />
                </div>
              )}

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
                />
              </div>
            </div>
          </div>

          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />

          <CreateTripModal 
            isOpen={isCreateModalOpen} 
            onClose={() => setIsCreateModalOpen(false)} 
          />

          <UpgradeModal 
            isOpen={isUpgradeModalOpen} 
            onClose={() => setIsUpgradeModalOpen(false)} 
          />

          <SettingsMenu 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            initialConsumerSection={settingsInitialConsumerSection}
            initialSettingsType={settingsInitialType}
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


          <MobileSettingsSheet
            isOpen={isMobileSettingsOpen}
            onClose={() => setIsMobileSettingsOpen(false)}
            onOpenFullSettings={() => {
              setIsMobileSettingsOpen(false);
              setIsSettingsOpen(true);
            }}
          />
        </div>
      );
    }

    // MOCK (app-preview state): Show full app interface WITH mock data
    return (
      <div className="min-h-screen min-h-mobile-screen bg-background font-sans geometric-bg wireframe-overlay">
        <div className="container mx-auto px-4 py-6 max-w-[1600px] relative z-10">
          {/* Desktop Header */}
          {!isMobile && (
            <div className="w-full">
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
            </div>
          )}

          {/* Mobile Top Bar for login/demo controls */}
          {isMobile && <MobileTopBar onSettingsPress={() => setIsMobileSettingsOpen(true)} />}

          <div className="max-w-[1500px] mx-auto" style={{ paddingTop: isMobile ? '64px' : '0' }}>
                {/* CSS-first responsive: stacks on mobile, side-by-side on lg+ */}
                <div className="w-full flex flex-col lg:flex-row gap-3 lg:gap-6 items-stretch mb-6">
                  <TripViewToggle 
                    viewMode={viewMode} 
                    onViewModeChange={handleViewModeChange}
                    showRecsTab={true}
                    recsTabDisabled={!isDemoMode}
                    className="w-full lg:flex-1 h-16"
                  />
                  <TripActionBar
                    onSettings={() => isMobile ? setIsMobileSettingsOpen(true) : setIsSettingsOpen(true)}
                    onCreateTrip={handleCreateTrip}
                    onSearch={() => setIsSearchOpen(true)}
                    onNotifications={() => {}}
                    isNotificationsOpen={isNotificationsOpen}
                    setIsNotificationsOpen={setIsNotificationsOpen}
                    className="w-full lg:flex-1 h-16"
                  />
                </div>

                {!isMobile && (
                  <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <TripStatsOverview 
                      stats={getCurrentStats()} 
                      viewMode={viewMode} 
                      activeFilter={activeFilter}
                      onFilterClick={handleFilterClick}
                    />
                  </div>
                )}

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
                  />
                </div>
              </div>
            </div>

          {/* PersistentCTABar removed until production-ready MVP launch */}

          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
          />

          <CreateTripModal 
            isOpen={isCreateModalOpen} 
            onClose={() => setIsCreateModalOpen(false)} 
          />

          <UpgradeModal 
            isOpen={isUpgradeModalOpen} 
            onClose={() => setIsUpgradeModalOpen(false)} 
          />

          <SettingsMenu 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)} 
            initialConsumerSection={settingsInitialConsumerSection}
            initialSettingsType={settingsInitialType}
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


          <MobileSettingsSheet
            isOpen={isMobileSettingsOpen}
            onClose={() => setIsMobileSettingsOpen(false)}
            onOpenFullSettings={() => {
              setIsMobileSettingsOpen(false);
              setIsSettingsOpen(true);
            }}
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
          <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-accent/8 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-primary/6 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
        </div>
      )}
      <div className="container mx-auto px-4 py-6 max-w-[1600px] relative z-10">
        {/* Desktop Header - only show on desktop */}
        {!isMobile && (
          <div className="w-full mb-4">
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
          </div>
        )}

        {/* Mobile Top Bar for login/demo controls - shows in portrait AND landscape */}
        {isMobile && <MobileTopBar onSettingsPress={() => setIsMobileSettingsOpen(true)} />}

        {/* CSS-first responsive: stacks on mobile, side-by-side on lg+ */}
        {/* pt-16 on mobile accounts for fixed MobileTopBar height */}
        <div className={`w-full flex flex-col lg:flex-row gap-3 lg:gap-6 items-stretch mb-6 ${isMobile ? 'pt-16' : ''}`}>
          <TripViewToggle 
            viewMode={viewMode} 
            onViewModeChange={handleViewModeChange}
            showRecsTab={true}
            recsTabDisabled={!isDemoMode}
            className="w-full lg:flex-1 h-16"
          />
          <TripActionBar
            onSettings={() => isMobile ? setIsMobileSettingsOpen(true) : (setSettingsInitialType('consumer'), setIsSettingsOpen(true))}
            onCreateTrip={handleCreateTrip}
            onSearch={(query: string) => {
              if (query) {
                setIsSearchOpen(true);
              }
            }}
            onNotifications={() => {}}
            isNotificationsOpen={isNotificationsOpen}
            setIsNotificationsOpen={setIsNotificationsOpen}
            className="w-full lg:flex-1 h-16"
          />
        </div>

        {/* Trip Stats Overview with loading state - moved above filters for travel recs */}
        {!isMobile && (
          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <TripStatsOverview 
              stats={getCurrentStats()} 
              viewMode={viewMode} 
              activeFilter={activeFilter}
              onFilterClick={handleFilterClick}
            />
          </div>
        )}

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
            loading={isLoading}
            onCreateTrip={handleCreateTrip}
            activeFilter={activeFilter}
            myPendingRequests={isDemoMode ? mockMyPendingRequests : myPendingRequests}
          />
        </div>


      </div>

      {/* PersistentCTABar removed until production-ready MVP launch */}

      {/* Modals */}
      <CreateTripModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />

      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)} 
      />

      <SettingsMenu 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        initialConsumerSection={settingsInitialConsumerSection}
        initialSettingsType={settingsInitialType}
      />

      <DemoModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        demoType={viewMode === 'events' ? 'events' : 'pro'}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <MobileSettingsSheet
        isOpen={isMobileSettingsOpen}
        onClose={() => setIsMobileSettingsOpen(false)}
        onOpenFullSettings={() => {
          setIsMobileSettingsOpen(false);
          setIsSettingsOpen(true);
        }}
      />
    </div>
  );
};

export default Index;
