
import React, { useState, useEffect, useMemo } from 'react';
import { MobileHeader } from '../components/MobileHeader';
import { AuthPromptBanner } from '../components/mobile/AuthPromptBanner';
import { CreateTripModal } from '../components/CreateTripModal';
import { UpgradeModal } from '../components/UpgradeModal';
import { SettingsMenu } from '../components/SettingsMenu';
import { AuthModal } from '../components/AuthModal';
import { TripStatsOverview } from '../components/home/TripStatsOverview';
import { TripViewToggle } from '../components/home/TripViewToggle';
import { DesktopHeader } from '../components/home/DesktopHeader';
import { TripGrid } from '../components/home/TripGrid';
import { RecommendationFilters } from '../components/home/RecommendationFilters';
import { UnauthenticatedLanding } from '../components/UnauthenticatedLanding';
import { DemoModeToggle } from '../components/DemoModeToggle';

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
import { proTripMockData } from '../data/proTripMockData';
import { eventsMockData } from '../data/eventsMockData';
import { tripsData } from '../data/tripsData';
import { calculateTripStats, calculateProTripStats, calculateEventStats, filterItemsByStatus } from '../utils/tripStatsCalculator';
import { useLocation } from 'react-router-dom';
import { useMobilePortrait } from '../hooks/useMobilePortrait';
const Index = () => {
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
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();
  const { isDemoMode } = useDemoMode();
  const isMobilePortrait = useMobilePortrait();
  // Marketing content should always show to unauthenticated users
  const showMarketingContent = !user;

  // Use centralized trip data - only show if demo mode is enabled
  const trips = isDemoMode ? tripsData : [];

  if (import.meta.env.DEV) {
    console.log('Index - proTripMockData IDs:', Object.keys(proTripMockData));
    console.log('Index - eventsMockData IDs:', Object.keys(eventsMockData));
  }

  // Calculate stats for each view mode - gate by demo mode
  const tripStats = calculateTripStats(trips);
  const proTripStats = isDemoMode ? calculateProTripStats(proTripMockData) : calculateProTripStats({});
  const eventStats = isDemoMode ? calculateEventStats(eventsMockData) : calculateEventStats({});

  const getCurrentStats = () => {
    switch (viewMode) {
      case 'myTrips': return tripStats;
      case 'tripsPro': return proTripStats;
      case 'events': return eventStats;
      default: return tripStats;
    }
  };

  // Memoize expensive filtering operations
  const filteredData = useMemo(() => {
    if (!activeFilter || activeFilter === 'total') {
      return {
        trips,
        proTrips: isDemoMode ? proTripMockData : {},
        events: isDemoMode ? eventsMockData : {}
      };
    }

    switch (viewMode) {
      case 'myTrips':
        return {
          trips: filterItemsByStatus(trips, activeFilter),
          proTrips: isDemoMode ? proTripMockData : {},
          events: isDemoMode ? eventsMockData : {}
        };
      case 'tripsPro':
        return {
          trips,
          proTrips: isDemoMode ? Object.fromEntries(
            Object.entries(proTripMockData).filter(([_, trip]) => 
              filterItemsByStatus([trip], activeFilter).length > 0
            )
          ) : {},
          events: isDemoMode ? eventsMockData : {}
        };
      case 'events':
        return {
          trips,
          proTrips: isDemoMode ? proTripMockData : {},
          events: isDemoMode ? Object.fromEntries(
            Object.entries(eventsMockData).filter(([_, event]) => 
              filterItemsByStatus([event], activeFilter).length > 0
            )
          ) : {}
        };
      default:
        return { 
          trips, 
          proTrips: isDemoMode ? proTripMockData : {}, 
          events: isDemoMode ? eventsMockData : {} 
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

  

  // Auto-switch away from travelRecs if user logs in or demo mode is disabled
  useEffect(() => {
    if ((user || !isDemoMode) && viewMode === 'travelRecs') {
      setViewMode('myTrips');
    }
  }, [user, isDemoMode, viewMode]);

  // Open settings to saved recs if requested via query params
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const open = sp.get('openSettings');
    if (open === 'saved-recs') {
      setSettingsInitialConsumerSection('saved-recs');
      setIsSettingsOpen(true);
    }
  }, [location.search]);

  // Show marketing landing when logged out, allow demo mode toggle to show app features
  if (!user) {
    return (
      <div className="min-h-screen min-h-mobile-screen bg-background font-outfit">
        {/* Demo Mode Toggle - Always visible for investors/prospects */}
        <div className="w-full flex justify-center px-4 pt-3">
          <div className="max-w-[200px] w-full">
            <DemoModeToggle />
          </div>
        </div>

        {!isDemoMode ? (
          // Marketing landing content
          <div className="container mx-auto px-4 pt-2 pb-6 max-w-7xl relative z-10">
            <UnauthenticatedLanding 
              onSignIn={() => setIsAuthModalOpen(true)}
              onSignUp={() => setIsAuthModalOpen(true)}
            />

            <div className="mt-6 space-y-8">
              <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <SocialProofSection />
              </div>

              <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <FeatureShowcase />
              </div>

              <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <ReplacesGrid />
              </div>

              <div id="pricing-section" className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
                <PricingSection onSignUp={() => setIsAuthModalOpen(true)} />
              </div>
            </div>
          </div>
        ) : (
          // Demo mode content - full app interface
          <div className="min-h-screen min-h-mobile-screen bg-background font-sans geometric-bg wireframe-overlay">
            <div className="container mx-auto px-4 py-6 max-w-7xl relative z-10">
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

              <div className="w-full animate-fade-in mb-8">
                <TripViewToggle 
                  viewMode={viewMode} 
                  onViewModeChange={handleViewModeChange}
                  onUpgrade={() => setIsUpgradeModalOpen(true)}
                  onSettings={(settingsType, activeSection) => {
                    if (settingsType) setSettingsInitialType(settingsType);
                    if (activeSection) setSettingsInitialConsumerSection(activeSection);
                    setIsSettingsOpen(true);
                  }}
                  showRecsTab={showMarketingContent}
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
      <div className="container mx-auto px-4 py-6 max-w-7xl relative z-10">
        {/* Mobile Header */}
        <MobileHeader
          onCreateTrip={handleCreateTrip}
          onUpgradeToProo={() => setIsUpgradeModalOpen(true)}
          onSettings={() => setIsSettingsOpen(true)}
          onProDashboard={() => {}} // Empty function since Pro Dashboard was removed
          onAuth={() => setIsAuthModalOpen(true)}
          viewMode={viewMode}
        />

        {/* Desktop Header - Full width container */}
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

        {/* Enhanced Toggle with smooth transitions - Full width container */}
        <div className="w-full animate-fade-in mb-8">
          <TripViewToggle 
            viewMode={viewMode} 
            onViewModeChange={handleViewModeChange}
            onUpgrade={() => setIsUpgradeModalOpen(true)}
            onSettings={(settingsType, activeSection) => {
              if (settingsType) setSettingsInitialType(settingsType);
              if (activeSection) setSettingsInitialConsumerSection(activeSection);
              setIsSettingsOpen(true);
            }}
            showRecsTab={showMarketingContent}
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
    </div>
  );
};

export default Index;
