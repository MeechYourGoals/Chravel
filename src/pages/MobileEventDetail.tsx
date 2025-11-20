import React, { useState } from 'react';
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
import { convertSupabaseTripsToMock } from '../utils/tripConverter';
import { eventsMockData } from '../data/eventsMockData';
import { ProTripNotFound } from '../components/pro/ProTripNotFound';

export const MobileEventDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode, isLoading: demoModeLoading } = useDemoMode();

  // 🎯 CRITICAL: Demo mode NEVER calls useTrips - complete isolation from Supabase
  const { trips: userTrips, loading: tripsLoading } = !isDemoMode
    ? useTrips()
    : { trips: [], loading: false, initializing: false, createTrip: async () => null, updateTrip: async () => false, archiveTrip: async () => false, refreshTrips: async () => {} };

  const [activeTab, setActiveTab] = useState('chat');
  const [tripDescription, setTripDescription] = useState<string>('');
  const [showTripInfo, setShowTripInfo] = useState(false);
  const headerRef = React.useRef<HTMLDivElement>(null);
 
  // Keyboard handling for mobile inputs
  useKeyboardHandler({
    preventZoom: true,
    adjustViewport: true
  });

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

  // Not found - handle early
  if (!eventId) {
    console.error('MobileEventDetail: No eventId provided');
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
  
  // Show loading state while fetching trips
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
  
  // Get event data - use demo data in demo mode, Supabase trips when authenticated
  let eventData: any;
  if (isDemoMode) {
    eventData = eventsMockData[eventId];
    if (!eventData) {
      console.error(`MobileEventDetail: Event not found in mock data: ${eventId}`);
      console.log('Available event IDs:', Object.keys(eventsMockData));
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Event Not Found</h1>
            <p className="text-gray-400 mb-2">This demo event doesn't exist.</p>
            <p className="text-xs text-gray-500 mb-6">Event ID: {eventId}</p>
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
  } else {
    // Authenticated mode: find Event from Supabase data
    const allTrips = convertSupabaseTripsToMock(userTrips);
    const event = allTrips.find(t => String(t.id) === eventId && t.trip_type === 'event');
    
    if (!event) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Event Not Found</h1>
            <p className="text-gray-400 mb-6">This event doesn't exist or you don't have access.</p>
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
    
    // Convert to eventData format expected by components
    eventData = {
      id: event.id,
      title: event.title,
      location: event.location,
      dateRange: event.dateRange,
      description: event.description,
      participants: event.participants || []
    };
  }
  
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
    id: parseInt(eventId.replace(/\D/g, '') || '1'),
    title: eventData.title,
    location: eventData.location,
    dateRange: eventData.dateRange,
    description: tripDescription || eventData.description || '',
    participants: eventData.participants.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar
    }))
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
        category={eventData.category}
      />
      </div>
    </MobileErrorBoundary>
  );
};
