import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Info } from 'lucide-react';
import { MobileTripTabs } from '../components/mobile/MobileTripTabs';
import { MobileErrorBoundary } from '../components/mobile/MobileErrorBoundary';
import { MobileTripInfoDrawer } from '../components/mobile/MobileTripInfoDrawer';
import { useAuth } from '../hooks/useAuth';
import { useKeyboardHandler } from '../hooks/useKeyboardHandler';
import { hapticService } from '../services/hapticService';
import { useDemoMode } from '../hooks/useDemoMode';
import { useTrips } from '../hooks/useTrips';
import { useTripMembers } from '../hooks/useTripMembers';
import { convertSupabaseTripToEvent } from '../utils/tripConverter';
import { eventsMockData } from '../data/eventsMockData';

export const MobileEventDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user: _user } = useAuth(); // Prefixed as unused but kept for future auth needs
  const { isDemoMode, isLoading: demoModeLoading } = useDemoMode();

  // ✅ FIXED: Always call useTrips hook (Rules of Hooks requirement)
  const { trips: userTrips, loading: tripsLoading } = useTrips();

  // 🔄 CRITICAL FIX: Fetch real trip members from database for authenticated trips
  const { tripMembers, loading: membersLoading } = useTripMembers(eventId);

  // Persist activeTab in sessionStorage to survive orientation changes
  const getInitialTab = () => {
    if (typeof window === 'undefined') return 'chat';
    const storedTab = sessionStorage.getItem(`event_${eventId}_activeTab`);
    return storedTab || 'chat';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [tripDescription, setTripDescription] = useState<string>('');
  const [showTripInfo, setShowTripInfo] = useState(false);
  const headerRef = React.useRef<HTMLDivElement>(null);

  // Persist activeTab changes to sessionStorage
  React.useEffect(() => {
    if (eventId) {
      sessionStorage.setItem(`event_${eventId}_activeTab`, activeTab);
    }
  }, [activeTab, eventId]);
 
  // Keyboard handling for mobile inputs
  useKeyboardHandler({
    preventZoom: true,
    adjustViewport: true
  });

  // ✅ Calculate eventData with useMemo - MUST be before any conditional returns
  const eventData = useMemo(() => {
    if (!eventId) return null;
    
    if (isDemoMode) {
      return eventsMockData[eventId] || null;
    }
    
    // Authenticated mode: find event from user's trips (Supabase data)
    const eventTrip = userTrips?.find(t => t.id === eventId && t.trip_type === 'event');
    if (!eventTrip) return null;
    
    // Convert Supabase trip to full EventData format
    return convertSupabaseTripToEvent(eventTrip);
  }, [eventId, isDemoMode, userTrips]);

  // Set trip description when eventData loads
  React.useEffect(() => {
    if (eventData && !tripDescription) {
      setTripDescription(eventData.description || '');
    }
  }, [eventData, tripDescription]);
  
  // Measure header height and expose as CSS var for sticky offsets
  React.useEffect(() => {
    const setHeaderHeightVar = () => {
      const h = headerRef.current?.offsetHeight || 73;
      document.documentElement.style.setProperty('--mobile-header-h', `${h}px`);
    };
    const debounce = (fn: () => void, delay = 100) => {
      let t: ReturnType<typeof setTimeout>;
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

  // ⚡ Loading and error states AFTER all hooks
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

  if (!eventId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Not Found</h1>
          <p className="text-gray-400 mb-6">No event ID provided.</p>
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
  
  if (tripsLoading && !isDemoMode) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!eventData) {
    const errorMessage = isDemoMode 
      ? "This demo event doesn't exist."
      : "This event doesn't exist or you don't have access.";
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Event Not Found</h1>
          <p className="text-gray-400 mb-2">{errorMessage}</p>
          {isDemoMode && <p className="text-xs text-gray-500 mb-6">Event ID: {eventId}</p>}
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
  
  // 🔄 MOBILE FIX: Merge real trip members for authenticated trips (matching desktop behavior)
  const trip = {
    id: parseInt(eventId.replace(/\D/g, '') || '1'),
    title: eventData.title,
    location: eventData.location,
    dateRange: eventData.dateRange,
    description: tripDescription || eventData.description || '',
    // Merge real trip members for authenticated trips instead of empty array
    participants: isDemoMode
      ? eventData.participants.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar
        }))
      : tripMembers.map(m => ({
          id: m.id as any, // UUID strings for authenticated trips
          name: m.name,
          avatar: m.avatar || '',
          role: 'member'
        })) as any
  };

  const basecamp = {
    name: 'Event Headquarters',
    address: `${eventData.location}, Main Venue`
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
              {eventData.title}
            </h1>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <span>{eventData.location} • {eventData.participants.length} attendees</span>
              <button
                onClick={() => {
                  hapticService.light();
                  setShowTripInfo(true);
                }}
                className="flex items-center gap-1 active:scale-95 transition-transform text-blue-400 hover:text-blue-300"
                aria-label="View event details"
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
        tripId={eventId}
        basecamp={basecamp}
        variant="event"
        eventData={eventData}
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
        category={'category' in eventData ? (eventData as any).category : undefined}
      />
      </div>
    </MobileErrorBoundary>
  );
};
