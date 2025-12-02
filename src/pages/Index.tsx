
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
import { ProfileSetupModal } from '../components/ProfileSetupModal';
import { HeaderAuthButton } from '../components/HeaderAuthButton';
import { MobileSettingsSheet } from '../components/mobile/MobileSettingsSheet';

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
import { proTripMockData } from '../data/proTripMockData';
import { eventsMockData } from '../data/eventsMockData';
import { tripsData } from '../data/tripsData';
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
  const [showProfileSetup, setShowProfileSetup] = useState(false);
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

  // Marketing content should always show to unauthenticated users
  const showMarketingContent = !user;

  // Use centralized trip data - demo data or real user data converted to mock format
  // ✅ FILTER: Only consumer trips in allTrips (Pro/Event filtered separately below)
  const allTrips = isDemoMode 
    ? tripsData 
    : convertSupabaseTripsToMock(userTripsRaw.filter(t => t.trip_type === 'consumer' || !t.trip_type));
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

  if (import.meta.env.DEV) {
  }

  // Calculate stats for each view mode - use filtered data
  const tripStats = calculateTripStats(trips);
  const proTripStats = useMemo(() => {
    if (!isDemoMode) return calculateProTripStats({});
    const filteredPro = filterProTrips(proTripMockData, searchQuery, activeFilter as DateFacet | '');
    return calculateProTripStats(filteredPro);
  }, [isDemoMode, searchQuery, activeFilter]);
  
  const eventStats = useMemo(() => {
    if (!isDemoMode) return calculateEventStats({});
    const filteredEvents = filterEvents(eventsMockData, searchQuery, activeFilter as DateFacet | '');
    return calculateEventStats(filteredEvents);
  }, [isDemoMode, searchQuery, activeFilter]);

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
    
    // Initialize with demo data or empty objects
    let safeProTrips = isDemoMode ? (proTripMockData || {}) : {};
    let safeEvents = isDemoMode ? (eventsMockData || {}) : {};

    // For authenticated users, populate proTrips and events from userTripsRaw
    if (!isDemoMode && userTripsRaw) {
      const proTripsFromDB = userTripsRaw.filter(t => t.trip_type === 'pro');
      const eventsFromDB = userTripsRaw.filter(t => t.trip_type === 'event');
      
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

    return {
      trips: safeTrips,
      proTrips: filteredProTrips,
      events: filteredEvents
    };
  }, [trips, isDemoMode, userTripsRaw, searchQuery, activeFilter]);

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

  // Check if user needs profile setup on first login
  useEffect(() => {
    if (user && (!user.displayName || user.displayName.trim() === '')) {
      setShowProfileSetup(true);
    } else {
      setShowProfileSetup(false);
    }
  }, [user]);

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

            <div className="max-w-[1500px] mx-auto">
              <div className="w-full flex flex-col md:flex-row gap-4 md:gap-6 items-start animate-fade-in">
                <TripViewToggle 
                  viewMode={viewMode} 
                  onViewModeChange={handleViewModeChange}
                  showRecsTab={true}
                  recsTabDisabled={true}
                  className="flex-1"
                />
                <TripActionBar
                  onSettings={() => setIsSettingsOpen(true)}
                  onCreateTrip={handleCreateTrip}
                  onSearch={() => setIsSearchOpen(true)}
                  onNotifications={() => {}}
                  isNotificationsOpen={isNotificationsOpen}
                  setIsNotificationsOpen={setIsNotificationsOpen}
                  className="flex-1"
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

          <ProfileSetupModal 
            isOpen={showProfileSetup} 
            onComplete={() => setShowProfileSetup(false)} 
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

          <div className="max-w-[1500px] mx-auto">
                {/* Side by Side: Toggle (left) + Action Bar (right) */}
                <div className="w-full flex flex-col md:flex-row gap-4 md:gap-6 items-start animate-fade-in">
                  <TripViewToggle 
                    viewMode={viewMode} 
                    onViewModeChange={handleViewModeChange}
                    showRecsTab={true}
                    recsTabDisabled={!isDemoMode}
                    className="flex-1"
                  />
                  <TripActionBar
                    onSettings={() => setIsSettingsOpen(true)}
                    onCreateTrip={handleCreateTrip}
                    onSearch={() => setIsSearchOpen(true)}
                    onNotifications={() => {}}
                    isNotificationsOpen={isNotificationsOpen}
                    setIsNotificationsOpen={setIsNotificationsOpen}
                    className="flex-1"
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

          <ProfileSetupModal 
            isOpen={showProfileSetup} 
            onComplete={() => setShowProfileSetup(false)} 
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
        {/* Mobile: Two Clean Nav Rows */}
        {isMobile && (
          <div className="w-full space-y-3 mb-6">
            {/* Row 1: Trips/Pro/Events/Recs */}
            <TripViewToggle 
              viewMode={viewMode} 
              onViewModeChange={handleViewModeChange}
              showRecsTab={true}
              recsTabDisabled={!isDemoMode}
              className="w-full"
            />
            
            {/* Row 2: Settings/Alerts/+Trip/Search */}
            <TripActionBar
              onSettings={() => setIsMobileSettingsOpen(true)}
              onCreateTrip={handleCreateTrip}
              onSearch={() => setIsSearchOpen(true)}
              onNotifications={() => {}}
              isNotificationsOpen={isNotificationsOpen}
              setIsNotificationsOpen={setIsNotificationsOpen}
              className="w-full"
            />
          </div>
        )}

        {/* Desktop: Header + Side-by-Side Bars */}
        {!isMobile && (
          <div className="w-full space-y-4 mb-6">
            {/* Debug: Desktop branch active */}
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

            {/* Side by Side: Toggle (left) + Action Bar (right) */}
            <div className="w-full flex flex-row gap-6 items-start animate-fade-in">
              <TripViewToggle 
                viewMode={viewMode} 
                onViewModeChange={handleViewModeChange}
                showRecsTab={true}
                recsTabDisabled={!isDemoMode}
                className="flex-1"
              />
              <TripActionBar
                onSettings={() => {
                  setSettingsInitialType('consumer');
                  setIsSettingsOpen(true);
                }}
                onCreateTrip={handleCreateTrip}
                onSearch={(query: string) => {
                  if (query) {
                    setIsSearchOpen(true);
                  }
                }}
                onNotifications={() => {}}
                isNotificationsOpen={isNotificationsOpen}
                setIsNotificationsOpen={setIsNotificationsOpen}
                className="flex-1"
              />
            </div>
          </div>
        )}

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
            proTrips={filteredData.proTrips}
            events={filteredData.events}
            loading={isLoading}
            onCreateTrip={handleCreateTrip}
            activeFilter={recsFilter}
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

      <ProfileSetupModal 
        isOpen={showProfileSetup} 
        onComplete={() => setShowProfileSetup(false)} 
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
