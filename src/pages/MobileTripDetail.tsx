import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Info } from 'lucide-react';
import { MobileTripTabs } from '../components/mobile/MobileTripTabs';
import { MobileErrorBoundary } from '../components/mobile/MobileErrorBoundary';
import { MobileTripInfoDrawer } from '../components/mobile/MobileTripInfoDrawer';
import { useAuth } from '../hooks/useAuth';
import { useKeyboardHandler } from '../hooks/useKeyboardHandler';
import { hapticService } from '../services/hapticService';
import { useTrips } from '../hooks/useTrips';
import { useDemoMode } from '../hooks/useDemoMode';
import { useTripMembers } from '../hooks/useTripMembers';
import { convertSupabaseTripsToMock } from '../utils/tripConverter';
import { tripsData, generateTripMockData } from '../data/tripsData';

export const MobileTripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode, isLoading: demoModeLoading } = useDemoMode();

  // ✅ FIXED: Always call useTrips hook (Rules of Hooks requirement)
  // The hook handles demo mode internally, returning empty arrays when in demo mode
  const { trips: userTrips, loading: tripsLoading } = useTrips();

  // 🔄 CRITICAL FIX: Fetch real trip members from database for authenticated trips
  const { tripMembers, loading: membersLoading } = useTripMembers(tripId);

  // Persist activeTab in sessionStorage to survive orientation changes
  const getInitialTab = () => {
    if (typeof window === 'undefined') return 'chat';
    const storedTab = sessionStorage.getItem(`trip_${tripId}_activeTab`);
    return storedTab || 'chat';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [tripDescription, setTripDescription] = useState<string>('');
  const [showTripInfo, setShowTripInfo] = useState(false);
  const headerRef = React.useRef<HTMLDivElement>(null);

  // Persist activeTab changes to sessionStorage
  React.useEffect(() => {
    if (tripId) {
      sessionStorage.setItem(`trip_${tripId}_activeTab`, activeTab);
    }
  }, [activeTab, tripId]);
 
  // Keyboard handling for mobile inputs
  useKeyboardHandler({
    preventZoom: true,
    adjustViewport: true
  });

  // ✅ CRITICAL FIX: Get trip data BEFORE any early returns (Rules of Hooks)
  const allTrips = isDemoMode ? tripsData : convertSupabaseTripsToMock(userTrips);
  const trip = allTrips.find(t => String(t.id) === tripId);

  // ✅ CRITICAL FIX: ALL useEffect hooks MUST be called before any early returns
  React.useEffect(() => {
    if (trip && !tripDescription) {
      setTripDescription(trip.description);
    }
  }, [trip, tripDescription]);
  
  // Measure header height and expose as CSS var for sticky offsets
  React.useEffect(() => {
    const setHeaderHeightVar = () => {
      const h = headerRef.current?.offsetHeight || 73;
      document.documentElement.style.setProperty('--mobile-header-h', `${h}px`);
    };
    const debounce = (fn: () => void, delay = 100) => {
      let t: any;
      return () => {
        clearTimeout(t);
        t = setTimeout(fn, delay);
      };
    };
    const handler = debounce(setHeaderHeightVar, 100);
    setHeaderHeightVar();
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);
  
  // ✅ CRITICAL FIX: ALL useMemo hooks MUST be called before any early returns
  // 🔄 MOBILE FIX: Merge real trip members for authenticated trips (matching desktop behavior)
  const tripWithUpdatedDescription = React.useMemo(() => {
    if (!trip) return null;
    return {
      ...trip,
      description: tripDescription || trip.description,
      // Merge real trip members for authenticated trips instead of empty array
      participants: isDemoMode
        ? trip.participants
        : tripMembers.map(m => ({
            id: m.id as any, // UUID strings for authenticated trips
            name: m.name,
            avatar: m.avatar || '',
            role: 'member'
          })) as any
    };
  }, [trip, tripDescription, isDemoMode, tripMembers]);

  const mockData = React.useMemo(() => {
    if (!trip) return null;
    return generateTripMockData(trip);
  }, [trip]);
  
  const basecamp = mockData?.basecamp;

  // ✅ NOW SAFE: All hooks called unconditionally, early returns come AFTER
  if (demoModeLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing...</p>
        </div>
      </div>
    );
  }
  
  // Show loading state while fetching trips
  if (tripsLoading && !isDemoMode) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trip...</p>
        </div>
      </div>
    );
  }

  // Handle missing trip - check after data loaded
  if (!tripWithUpdatedDescription) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Trip Not Found</h1>
          <p className="text-gray-400 mb-6">The trip you're looking for doesn't exist.</p>
          <button
            onClick={() => {
              hapticService.light();
              navigate('/');
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors active:scale-95"
          >
            Back to My Trips
          </button>
        </div>
      </div>
    );
  }


  const handleBack = () => {
    hapticService.light();
    navigate('/');
  };

  const handleTabChange = (tab: string) => {
    hapticService.light();
    setActiveTab(tab);
  };

  return (
    <MobileErrorBoundary>
      <div className="flex flex-col min-h-screen bg-black">
      {/* Mobile Header - Sticky */}
      <div ref={headerRef} className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-white/10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 active:scale-95 transition-transform"
            >
              <ArrowLeft size={24} className="text-white" />
            </button>
            
            <button
              onClick={() => hapticService.light()}
              className="p-2 -mr-2 active:scale-95 transition-transform"
            >
              <MoreVertical size={24} className="text-white" />
            </button>
          </div>
          
          <div className="text-center px-2">
            <h1 className="text-lg font-semibold text-white leading-tight mb-1.5 break-words">
              {trip.title}
            </h1>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <span>{trip.location} • {trip.participants.length} Chravelers</span>
              <button
                onClick={() => {
                  hapticService.light();
                  setShowTripInfo(true);
                }}
                className="flex items-center gap-1 active:scale-95 transition-transform text-blue-400 hover:text-blue-300"
                aria-label="View trip details"
              >
                <Info size={16} />
                <span className="font-medium">More Details</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Tabs - Swipeable */}
      <MobileTripTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tripId={tripId || '1'}
        basecamp={basecamp}
      />

      {/* Trip Info Drawer */}
      <MobileTripInfoDrawer
        trip={tripWithUpdatedDescription}
        isOpen={showTripInfo}
        onClose={() => {
          hapticService.light();
          setShowTripInfo(false);
        }}
        onDescriptionUpdate={setTripDescription}
      />
      </div>
    </MobileErrorBoundary>
  );
};
