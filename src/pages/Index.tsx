
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
import { DemoModeToggle } from '../components/DemoModeToggle';
import { SearchOverlay } from '../components/home/SearchOverlay';
import { ProfileSetupModal } from '../components/ProfileSetupModal';

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
import { useLocation } from 'react-router-dom';
import { useMobilePortrait } from '../hooks/useMobilePortrait';
import { convertSupabaseTripsToMock, convertSupabaseTripToProTrip, convertSupabaseTripToEvent } from '../utils/tripConverter';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

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
  const [settingsInitialType, setSettingsInitialType] = useState<'consumer' | 'enterprise' | 'events' | 'advertiser'>('consumer');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Debug logging
  console.log('📱 Index Page State:', { 
    isMobile, 
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 'SSR',
    viewMode 
  });
  
  if (isMobile) {
    console.log('✅ MOBILE BRANCH ACTIVE');
  } else {
    console.log('💻 DESKTOP BRANCH ACTIVE');
  }
  const location = useLocation();
  const { isDemoMode } = useDemoMode();
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

  // Search filtering with async handling
  const searchFilteredTrips = useMemo(() => {
    if (!searchQuery.trim()) return allTrips;
    
    // Sync keyword search for immediate filtering
    const lowerQuery = searchQuery.toLowerCase();
    return allTrips.filter(trip => 
      trip.title.toLowerCase().includes(lowerQuery) ||
      trip.location?.toLowerCase().includes(lowerQuery) ||
      trip.description?.toLowerCase().includes(lowerQuery)
    );
  }, [allTrips, searchQuery]);

  const searchFilteredProTrips = useMemo(() => {
    if (!searchQuery.trim() || !isDemoMode) return isDemoMode ? proTripMockData : {};
    
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = Object.fromEntries(
      Object.entries(proTripMockData).filter(([_, trip]) => 
        trip.title.toLowerCase().includes(lowerQuery) ||
        trip.location?.toLowerCase().includes(lowerQuery) ||
        trip.description?.toLowerCase().includes(lowerQuery)
      )
    );
    return filtered;
  }, [searchQuery, isDemoMode]);

  const searchFilteredEvents = useMemo(() => {
    if (!searchQuery.trim() || !isDemoMode) return isDemoMode ? eventsMockData : {};
    
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = Object.fromEntries(
      Object.entries(eventsMockData).filter(([_, event]) => 
        event.title.toLowerCase().includes(lowerQuery) ||
        event.location?.toLowerCase().includes(lowerQuery) ||
        event.description?.toLowerCase().includes(lowerQuery)
      )
    );
    return filtered;
  }, [searchQuery, isDemoMode]);

  const trips = searchFilteredTrips;
  
  // Count total results across all view modes
  const searchResultCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    return searchFilteredTrips.length + 
           Object.keys(searchFilteredProTrips).length + 
           Object.keys(searchFilteredEvents).length;
  }, [searchQuery, searchFilteredTrips, searchFilteredProTrips, searchFilteredEvents]);

  if (import.meta.env.DEV) {
  }

  // Calculate stats for each view mode - gate by demo mode
  const tripStats = calculateTripStats(trips);
  const proTripStats = isDemoMode ? calculateProTripStats(searchFilteredProTrips) : calculateProTripStats({});
  const eventStats = isDemoMode ? calculateEventStats(searchFilteredEvents) : calculateEventStats({});

  const getCurrentStats = () => {
    switch (viewMode) {
      case 'myTrips': return tripStats;
      case 'tripsPro': return proTripStats;
      case 'events': return eventStats;
      default: return tripStats;
    }
  };

  // 🛡️ Memoize expensive filtering operations with defensive guards
  const filteredData = useMemo(() => {
    // Always ensure safe values - never undefined
    let safeTrips = Array.isArray(trips) ? trips : [];
    
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

    if (!activeFilter || activeFilter === 'total') {
      return {
        trips: safeTrips,
        proTrips: safeProTrips,
        events: safeEvents
      };
    }

    switch (viewMode) {
      case 'myTrips':
        return {
          trips: filterItemsByStatus(safeTrips, activeFilter),
          proTrips: safeProTrips,
          events: safeEvents
        };
      case 'tripsPro':
        return {
          trips: safeTrips,
          proTrips: Object.fromEntries(
            Object.entries(safeProTrips).filter(([_, trip]) => 
              filterItemsByStatus([trip], activeFilter).length > 0
            )
          ),
          events: safeEvents
        };
      case 'events':
        return {
          trips: safeTrips,
          proTrips: safeProTrips,
          events: Object.fromEntries(
            Object.entries(safeEvents).filter(([_, event]) => 
              filterItemsByStatus([event], activeFilter).length > 0
            )
          )
        };
      default:
        return { 
          trips: safeTrips, 
          proTrips: safeProTrips, 
          events: safeEvents 
        };
    }
  }, [activeFilter, viewMode, trips, isDemoMode]);

  // Handle view mode changes without artificial delays
  const handleViewModeChange = (newMode: string) => {
    if (newMode === 'upgrade') {
      setIsUpgradeModalOpen(true);
      return;
    }
    setViewMode(newMode);
    setActiveFilter(''); // Reset filter when changing view mode
    setIsLoading(false); // Immediate response
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

  // Check if user needs profile setup on first login
  useEffect(() => {
    if (user && (!user.displayName || user.displayName.trim() === '')) {
      setShowProfileSetup(true);
    } else {
      setShowProfileSetup(false);
    }
  }, [user]);

  // Show marketing landing when logged out, allow demo mode toggle to show app features
  if (!user) {
    return (
      <div className="min-h-screen min-h-mobile-screen bg-background font-outfit">
        {!isDemoMode ? (
          // Marketing landing content - Full-page scrolling experience
          <FullPageLanding 
            onSignUp={() => setIsAuthModalOpen(true)}
          />
        ) : (
          // Demo mode content - full app interface
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
                      if (settingsType) setSettingsInitialType(settingsType);
                      if (activeSection) setSettingsInitialConsumerSection(activeSection);
                      setIsSettingsOpen(true);
                    }}
                  />
                </div>
              )}

              <div className="max-w-[1500px] mx-auto">
                <div className="w-full animate-fade-in">
                  <TripViewToggle 
                    viewMode={viewMode} 
                    onViewModeChange={handleViewModeChange}
                    showRecsTab={true}
                    recsTabDisabled={!isDemoMode}
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

            {showMarketingContent && (viewMode === 'tripsPro' || viewMode === 'events') && (
              <PersistentCTABar
                viewMode={viewMode}
                onScheduleDemo={handleScheduleDemo}
                onSeePricing={handleSeePricing}
              />
            )}
          </div>
        )}

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

        <SearchOverlay
          isOpen={isSearchOpen}
          onClose={() => {
            setIsSearchOpen(false);
            setSearchQuery('');
          }}
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
        {/* Mobile: Demo Toggle + Stacked Bars */}
        {isMobile && (
          <div className="space-y-3 mb-6">
            {/* Debug: Mobile branch active */}
            {/* Demo Mode Toggle - Centered */}
            <div className="flex justify-center">
              <div className="min-w-[120px] max-w-[140px]">
                <DemoModeToggle />
              </div>
            </div>

            {/* Stacked: Action Bar above Toggle */}
            <div className="w-full space-y-3">
              <TripActionBar
                onSettings={() => setIsSettingsOpen(true)}
                onCreateTrip={handleCreateTrip}
                onSearch={() => setIsSearchOpen(true)}
                onNotifications={() => {}}
                className="w-full overflow-x-auto"
              />
              <TripViewToggle 
                viewMode={viewMode} 
                onViewModeChange={handleViewModeChange}
                showRecsTab={true}
                recsTabDisabled={!isDemoMode}
                className="w-full"
              />
            </div>
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
                if (settingsType) setSettingsInitialType(settingsType);
                if (activeSection) setSettingsInitialConsumerSection(activeSection);
                setIsSettingsOpen(true);
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
                onSearch={() => setIsSearchOpen(true)}
                onNotifications={() => {}}
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

      {/* Persistent CTA Bar - Only for Pro/Events views AND unauthenticated users */}
      {showMarketingContent && (viewMode === 'tripsPro' || viewMode === 'events') && (
        <PersistentCTABar
          viewMode={viewMode}
          onScheduleDemo={handleScheduleDemo}
          onSeePricing={handleSeePricing}
        />
      )}

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
    </div>
  );
};

export default Index;
