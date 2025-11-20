import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Info } from 'lucide-react';
import { MobileTripTabs } from '../components/mobile/MobileTripTabs';
import { MobileErrorBoundary } from '../components/mobile/MobileErrorBoundary';
import { MobileTripInfoDrawer } from '../components/mobile/MobileTripInfoDrawer';
import { useAuth } from '../hooks/useAuth';
import { useKeyboardHandler } from '../hooks/useKeyboardHandler';
import { hapticService } from '../services/hapticService';
import { proTripMockData } from '../data/proTripMockData';
import { ProTripNotFound } from '../components/pro/ProTripNotFound';
import { useDemoMode } from '../hooks/useDemoMode';
import { useTrips } from '../hooks/useTrips';
import { convertSupabaseTripsToMock } from '../utils/tripConverter';
import { MockRolesService } from '../services/mockRolesService';

export const MobileProTripDetail = () => {
  const { proTripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode, isLoading: demoModeLoading } = useDemoMode();

  // ✅ FIXED: Always call useTrips hook (Rules of Hooks requirement)
  // The hook handles demo mode internally, returning empty arrays when in demo mode
  const { trips: userTrips, loading: tripsLoading } = useTrips();

  const [activeTab, setActiveTab] = useState('chat');
  const [tripDescription, setTripDescription] = useState<string>('');
  const [showTripInfo, setShowTripInfo] = useState(false);
  const headerRef = React.useRef<HTMLDivElement>(null);
 
  // Keyboard handling for mobile inputs
  useKeyboardHandler({
    preventZoom: true,
    adjustViewport: true
  });

  // 🆕 Initialize mock roles and channels ONLY in demo mode
  React.useEffect(() => {
    if (isDemoMode && proTripId && proTripId in proTripMockData) {
      const tripData = proTripMockData[proTripId];
      const existingRoles = MockRolesService.getRolesForTrip(proTripId);
      
      if (!existingRoles) {
        const roles = MockRolesService.seedRolesForTrip(
          proTripId,
          tripData.proTripCategory,
          user?.id || 'demo-user'
        );
        MockRolesService.seedChannelsForRoles(proTripId, roles, user?.id || 'demo-user');
      }
    }
  }, [isDemoMode, proTripId, user?.id]);

  // 🔄 CRITICAL: Wait for demo mode to initialize before attempting data load
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

  if (!proTripId) {
    console.error('MobileProTripDetail: No proTripId provided');
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Trip Not Found</h1>
          <p className="text-gray-400 mb-6">No trip ID provided.</p>
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

  // 🔐 DEMO MODE: Use mock data
  if (isDemoMode && !(proTripId in proTripMockData)) {
    console.error(`MobileProTripDetail: Pro trip not found in mock data: ${proTripId}`);
    console.log('Available Pro trip IDs:', Object.keys(proTripMockData));
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Demo Trip Not Found</h1>
          <p className="text-gray-400 mb-2">The demo trip you're looking for doesn't exist.</p>
          <p className="text-xs text-gray-500 mb-6">Trip ID: {proTripId}</p>
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

  // 🔐 AUTHENTICATED MODE: Fetch from Supabase
  let tripData: any;
  if (isDemoMode) {
    tripData = proTripMockData[proTripId];
  } else {
    // Find Pro trip from Supabase data
    const allTrips = convertSupabaseTripsToMock(userTrips);
    const proTrip = allTrips.find(t => String(t.id) === proTripId && t.trip_type === 'pro');
    
    if (!proTrip) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Pro Trip Not Found</h1>
            <p className="text-gray-400 mb-6">This Pro trip doesn't exist or you don't have access.</p>
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
    
    // Convert to tripData format expected by components
    tripData = {
      id: proTrip.id,
      title: proTrip.title,
      location: proTrip.location,
      dateRange: proTrip.dateRange,
      description: proTrip.description,
      proTripCategory: 'sports', // Default category
      participants: proTrip.participants || []
    };
  }
  
  React.useEffect(() => {
    if (tripData && !tripDescription) {
      setTripDescription(tripData.description || '');
    }
  }, [tripData, tripDescription]);
  
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
  
  const trip = {
    id: parseInt(tripData.id) || 0,
    title: tripData.title,
    location: tripData.location,
    dateRange: tripData.dateRange,
    description: tripDescription || tripData.description || '',
    participants: tripData.participants || []
  };

  const basecamp = {
    name: tripData.basecamp_name || 'Team Base',
    address: tripData.basecamp_address || tripData.location
  };

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
              {tripData.title}
            </h1>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <span>{tripData.location} • {tripData.participants?.length || 0} team members</span>
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
        tripId={proTripId}
        basecamp={basecamp}
        variant="pro"
        participants={(tripData.participants || []).map(p => ({
          id: String(p.id),
          name: p.name,
          role: p.role
        }))}
      />

      {/* Trip Info Drawer */}
      <MobileTripInfoDrawer
        trip={trip}
        isOpen={showTripInfo}
        onClose={() => {
          hapticService.light();
          setShowTripInfo(false);
        }}
        onDescriptionUpdate={setTripDescription}
        category={tripData.proTripCategory}
        tags={tripData.tags}
      />
      </div>
    </MobileErrorBoundary>
  );
};
