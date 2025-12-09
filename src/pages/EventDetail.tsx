import React, { useState, Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { MessageInbox } from '../components/MessageInbox';
import { TripDetailHeader } from '../components/trip/TripDetailHeader';
import { TripDetailModals } from '../components/trip/TripDetailModals';
import { LoadingSpinner } from '../components/LoadingSpinner';

// 🚀 OPTIMIZATION: Lazy load heavy components for faster initial render
const TripHeader = lazy(() =>
  import('../components/TripHeader').then(module => ({
    default: module.TripHeader
  }))
);

const EventDetailContent = lazy(() =>
  import('../components/events/EventDetailContent').then(module => ({
    default: module.EventDetailContent
  }))
);
import { TripVariantProvider } from '../contexts/TripVariantContext';
import { useAuth } from '../hooks/useAuth';
import { useIsMobile } from '../hooks/use-mobile';
import { useDemoMode } from '../hooks/useDemoMode';
import { useTrips } from '../hooks/useTrips';
import { eventsMockData } from '../data/eventsMockData';
import { ProTripNotFound } from '../components/pro/ProTripNotFound';
import { TripContext } from '../types/tripContext';
import { Message } from '../types/messages';
import { MobileEventDetail } from './MobileEventDetail';
import { useEmbeddingGeneration } from '../hooks/useEmbeddingGeneration';
import { convertSupabaseTripToEvent } from '../utils/tripConverter';
import { useTripMembers } from '../hooks/useTripMembers';


const EventDetail = () => {
  const isMobile = useIsMobile();
  const { eventId } = useParams<{ eventId?: string }>();
  const { generateInitialEmbeddings } = useEmbeddingGeneration(eventId);
  const { user } = useAuth();
  const { isDemoMode, isLoading: demoModeLoading } = useDemoMode();
  const { trips: userTrips, loading: tripsLoading } = useTrips();
  // 🔄 Fetch real trip members from database for authenticated events
  const { tripMembers, loading: membersLoading } = useTripMembers(eventId);
  const [activeTab, setActiveTab] = useState('chat');
  const [showInbox, setShowInbox] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [showTripsPlusModal, setShowTripsPlusModal] = useState(false);
  const [tripDescription, setTripDescription] = useState<string>('');

  // Determine event data availability - handle both demo and authenticated modes
  const eventNotFound = isDemoMode && eventId && !(eventId in eventsMockData);
  
  // Get event data from appropriate source
  const eventData = React.useMemo(() => {
    if (!eventId) return null;
    
    // Demo mode: use mock data
    if (isDemoMode) {
      return eventNotFound ? null : eventsMockData[eventId];
    }
    
    // Authenticated mode: find event from user's trips
    const eventTrip = userTrips?.find(t => t.id === eventId && t.trip_type === 'event');
    if (!eventTrip) return null;
    
    // Convert Supabase trip to EventData format
    return convertSupabaseTripToEvent(eventTrip);
  }, [eventId, isDemoMode, eventNotFound, userTrips]);

  // Initialize description state when event data is loaded
  // ✅ FIXED: All hooks must be called unconditionally before any returns
  React.useEffect(() => {
    if (eventData?.description && !tripDescription) {
      setTripDescription(eventData.description);
    }
  }, [eventData?.description, tripDescription]);

  // Generate initial embeddings for RAG when event loads
  React.useEffect(() => {
    if (eventId && user) {
      generateInitialEmbeddings();
    }
  }, [eventId, user, generateInitialEmbeddings]);

  // 🆕 Auto-scroll to chat on page load (chat-first viewport)
  React.useEffect(() => {
    // Only scroll if we're showing the main content (not loading/error/mobile)
    if (demoModeLoading || !eventId || eventNotFound || !isDemoMode || isMobile) return;
    
    const scrollToChat = () => {
      setTimeout(() => {
        const chatElement = document.querySelector('[data-chat-container]');
        if (chatElement) {
          chatElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    };

    scrollToChat();
  }, [demoModeLoading, eventId, eventNotFound, isDemoMode, isMobile]);

  // ⚡ OPTIMIZATION: Show loading spinner instantly before expensive operations
  if (demoModeLoading || (tripsLoading && !isDemoMode)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!eventId) {
    return (
      <ProTripNotFound message="No event ID provided." />
    );
  }

  // 🔐 DEMO MODE: Show mock events not found
  if (isDemoMode && eventNotFound) {
    return (
      <ProTripNotFound 
        message="The requested demo event could not be found."
        details={`Event ID: ${eventId}`}
        availableIds={Object.keys(eventsMockData)}
      />
    );
  }

  // Event data not found (either mode)
  if (!eventData) {
    const errorMessage = isDemoMode 
      ? "This demo event doesn't exist."
      : "This event doesn't exist or you don't have access.";
    return (
      <ProTripNotFound 
        message={errorMessage}
        details={isDemoMode ? `Event ID: ${eventId}` : undefined}
        availableIds={isDemoMode ? Object.keys(eventsMockData) : undefined}
      />
    );
  }

  // Enhanced trip data with event-specific features
  // 🔄 Merge real trip members for authenticated events
  // Get actual creator ID from Supabase trip data in authenticated mode
  const eventTrip = userTrips?.find(t => t.id === eventId);
  const actualCreatorId = isDemoMode ? 'demo-user' : (eventTrip?.created_by || user?.id || '');
  
  const trip = {
    id: parseInt(eventId.replace(/\D/g, '') || '1'),
    title: eventData.title,
    location: eventData.location,
    dateRange: eventData.dateRange,
    description: tripDescription || eventData.description || `Professional ${eventData.category.toLowerCase()} event in ${eventData.location}`,
    created_by: actualCreatorId,
    participants: isDemoMode 
      ? eventData.participants.map((p: any) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar
        }))
      : tripMembers.map(m => ({
          id: m.id,
          name: m.name,
          avatar: m.avatar || ''
        }))
  };

  // Mock basecamp data for Events
  const basecamp = {
    name: "Event Headquarters",
    address: `${eventData.location}, Main Venue`
  };

  // Messages are now handled by unified messaging service
  const tripMessages: Message[] = [];

  // Mock data for Event context - same structure as standard trips
  const mockBroadcasts = [
    { id: 1, senderName: "Event Coordinator", content: `${eventData.category} schedule confirmed for all attendees`, timestamp: "2025-01-15T15:30:00Z" },
    { id: 2, senderName: "Operations", content: `Welcome to ${eventData.title} - check your itinerary for updates`, timestamp: "2025-01-15T10:00:00Z" }
  ];

  const mockLinks = [
    { id: '1', title: "Official Event Website", url: "https://event-official.com/info", category: "Information", votes: 0, addedBy: "System", addedAt: new Date().toISOString() },
    { id: '2', title: "Venue Information", url: "https://venues.com/events", category: "Venue", votes: 0, addedBy: "System", addedAt: new Date().toISOString() },
    { id: '3', title: "Networking Hub", url: "https://networking.events.com", category: "Networking", votes: 0, addedBy: "System", addedAt: new Date().toISOString() }
  ];

  // Early return for mobile after all hooks are initialized
  if (isMobile) {
    return <MobileEventDetail />;
  }

  const tripContext: TripContext = {
    tripId: eventId,
    title: eventData.title,
    location: eventData.location,
    dateRange: eventData.dateRange,
    participants: trip.participants.map(p => ({
      id: p.id.toString(),
      name: p.name,
      role: 'attendee'
    })),
    itinerary: eventData.itinerary.map((day, index) => ({
      id: index.toString(),
      title: `Day ${index + 1}`,
      date: day.date,
      events: day.events as any // Mock data for demo - type assertion for simplified event structure
    })),
    accommodation: basecamp.name,
    currentDate: new Date().toISOString().split('T')[0],
    upcomingEvents: eventData.itinerary
      .flatMap(day => 
        day.events.map(event => ({
          id: `${day.date}-${event.title}`,
          title: event.title,
          date: day.date,
          time: event.time,
          location: event.location
        }))
      )
      .slice(0, 5),
    recentUpdates: mockBroadcasts.map(b => ({
      id: b.id.toString(),
      type: 'broadcast',
      message: b.content,
      timestamp: b.timestamp
    })),
    basecamp,
    isPro: false,
    broadcasts: mockBroadcasts as any, // Mock data for demo - type assertion for simplified broadcast structure
    links: mockLinks
  };

  return (
    <TripVariantProvider variant="events">
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Top Navigation - same as standard trips */}
          <TripDetailHeader
            tripContext={tripContext}
            showInbox={showInbox}
            onToggleInbox={() => setShowInbox(!showInbox)}
            onShowInvite={() => setShowInvite(true)}
            onShowTripSettings={() => setShowTripSettings(true)}
            onShowAuth={() => setShowAuth(true)}
          />

          {/* Message Inbox - same as standard trips */}
          {showInbox && user && (
            <div className="mb-8">
              <MessageInbox />
            </div>
          )}

          {/* Trip Header */}
          <Suspense fallback={
            <div className="mb-8 animate-pulse">
              <div className="h-8 bg-white/5 rounded w-2/3 mb-4"></div>
              <div className="h-4 bg-white/5 rounded w-1/2 mb-2"></div>
              <div className="h-32 bg-white/5 rounded"></div>
            </div>
          }>
            <TripHeader 
              trip={trip} 
              onDescriptionUpdate={setTripDescription}
            />
          </Suspense>

          {/* Enhanced Event Content */}
          <Suspense fallback={<LoadingSpinner className="my-12" />}>
            <EventDetailContent
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onShowTripsPlusModal={() => setShowTripsPlusModal(true)}
              tripId={eventId}
              basecamp={basecamp}
              eventData={eventData}
              tripContext={tripContext}
            />
          </Suspense>
        </div>

        {/* All the same modals as standard trips */}
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
          tripName={eventData.title}
          tripId={eventId}
          userId={user?.id}
        />
      </div>
    </TripVariantProvider>
  );
};

export default EventDetail;
