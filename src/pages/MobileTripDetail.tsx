import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Info } from 'lucide-react';
import { MobileTripTabs } from '../components/mobile/MobileTripTabs';
import { MobileErrorBoundary } from '../components/mobile/MobileErrorBoundary';
import { MobileTripInfoDrawer } from '../components/mobile/MobileTripInfoDrawer';
import { useAuth } from '../hooks/useAuth';
import { useKeyboardHandler } from '../hooks/useKeyboardHandler';
import { hapticService } from '../services/hapticService';

import { getTripById, generateTripMockData } from '../data/tripsData';

export const MobileTripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');
  const [tripDescription, setTripDescription] = useState<string>('');
  const [showTripInfo, setShowTripInfo] = useState(false);

  // Keyboard handling for mobile inputs
  useKeyboardHandler({
    preventZoom: true,
    adjustViewport: true
  });

  // Get trip data
  const tripIdNum = tripId ? parseInt(tripId, 10) : null;
  const trip = tripIdNum ? getTripById(tripIdNum) : null;
  
  React.useEffect(() => {
    if (trip && !tripDescription) {
      setTripDescription(trip.description);
    }
  }, [trip, tripDescription]);
  
  const tripWithUpdatedDescription = trip ? {
    ...trip,
    description: tripDescription || trip.description
  } : null;
  
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

  const mockData = generateTripMockData(trip);
  const basecamp = mockData.basecamp;

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
      <div className="min-h-screen bg-black pb-20">
      {/* Mobile Header - Sticky */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ArrowLeft size={24} className="text-white" />
          </button>
          
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold text-white truncate px-2">
              {trip.title}
            </h1>
            <p className="text-xs text-gray-400 truncate px-2">
              {trip.location} • {trip.participants.length} travelers
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                hapticService.light();
                setShowTripInfo(true);
              }}
              className="p-2 active:scale-95 transition-transform"
            >
              <Info size={20} className="text-white" />
            </button>
            <button
              onClick={() => hapticService.light()}
              className="p-2 -mr-2 active:scale-95 transition-transform"
            >
              <MoreVertical size={24} className="text-white" />
            </button>
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
