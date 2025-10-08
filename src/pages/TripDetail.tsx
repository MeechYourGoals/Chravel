
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { TripHeader } from '../components/TripHeader';
import { MessageInbox } from '../components/MessageInbox';
import { TripDetailHeader } from '../components/trip/TripDetailHeader';
import { TripDetailContent } from '../components/trip/TripDetailContent';
import { TripDetailModals } from '../components/trip/TripDetailModals';
import { useAuth } from '../hooks/useAuth';
import { getTripById, generateTripMockData } from '../data/tripsData';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/use-mobile';
import { MobileTripDetail } from './MobileTripDetail';

const TripDetail = () => {
  const isMobile = useIsMobile();
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');
  const [showInbox, setShowInbox] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [showTripsPlusModal, setShowTripsPlusModal] = useState(false);
  const [tripDescription, setTripDescription] = useState<string>('');

  // Get trip data dynamically based on tripId
  const tripIdNum = tripId ? parseInt(tripId, 10) : null;
  const trip = tripIdNum ? getTripById(tripIdNum) : null;
  
  // Initialize description state when trip is loaded
  React.useEffect(() => {
    if (trip && !tripDescription) {
      setTripDescription(trip.description);
    }
  }, [trip, tripDescription]);
  
  // Create trip object with updated description
  const tripWithUpdatedDescription = trip ? {
    ...trip,
    description: tripDescription || trip.description
  } : null;
  
  // Handle missing trip
  if (!tripWithUpdatedDescription) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Trip Not Found</h1>
          <p className="text-gray-400 mb-6">The trip you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-colors"
          >
            Back to My Trips
          </button>
        </div>
      </div>
    );
  }

  // Generate dynamic mock data based on the trip
  const mockData = generateTripMockData(trip);
  const basecamp = mockData.basecamp;

  // Messages are now handled by unified messaging service
  const tripMessages: any[] = [];

  // Use generated mock data
  const mockBroadcasts = mockData.broadcasts;
  const mockLinks = mockData.links;
  const mockItinerary = mockData.itinerary;

  // Build comprehensive trip context
  const tripContext = {
    id: tripId || '1',
    title: trip.title,
    location: trip.location,
    dateRange: trip.dateRange,
    basecamp,
    calendar: mockItinerary,
    broadcasts: mockBroadcasts,
    links: mockLinks,
    messages: tripMessages,
    collaborators: trip.participants,
    itinerary: mockItinerary,
    isPro: false
  };

  // Mobile-first conditional render - Zero impact on desktop
  if (isMobile) {
    return <MobileTripDetail />;
  }

  // Desktop experience remains completely unchanged
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Top Navigation */}
        <TripDetailHeader
          tripContext={tripContext}
          showInbox={showInbox}
          onToggleInbox={() => setShowInbox(!showInbox)}
          onShowInvite={() => setShowInvite(true)}
          onShowTripSettings={() => setShowTripSettings(true)}
          onShowAuth={() => setShowAuth(true)}
        />

        {/* Message Inbox */}
        {showInbox && user && (
          <div className="mb-8">
            <MessageInbox />
          </div>
        )}

        {/* Trip Header with Cover Photo Upload */}
        <TripHeader 
          trip={tripWithUpdatedDescription} 
          onDescriptionUpdate={setTripDescription}
        />

        {/* Main Content */}
        <TripDetailContent
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onShowTripsPlusModal={() => setShowTripsPlusModal(true)}
          tripId={tripId || '1'}
          tripName={tripWithUpdatedDescription.title}
          basecamp={basecamp}
        />
      </div>

      {/* Modals */}
      <TripDetailModals
        showSettings={showSettings}
        onCloseSettings={() => setShowSettings(false)}
        showInvite={showInvite}
        onCloseInvite={() => setShowInvite(false)}
        showAuth={showAuth}
        onCloseAuth={() => setShowAuth(false)}
        showTripSettings={showTripSettings}
        onCloseTripSettings={() => setShowTripSettings(false)}
        showTripsPlusModal={showTripsPlusModal}
        onCloseTripsPlusModal={() => setShowTripsPlusModal(false)}
        tripName={tripWithUpdatedDescription.title}
        tripId={tripId || '1'}
        userId={user?.id}
      />
    </div>
  );
};

export default TripDetail;
