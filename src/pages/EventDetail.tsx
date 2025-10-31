import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { TripHeader } from '../components/TripHeader';
import { MessageInbox } from '../components/MessageInbox';
import { TripDetailHeader } from '../components/trip/TripDetailHeader';
import { EventDetailContent } from '../components/events/EventDetailContent';
import { TripDetailModals } from '../components/trip/TripDetailModals';
import { TripVariantProvider } from '../contexts/TripVariantContext';
import { useAuth } from '../hooks/useAuth';
import { useIsMobile } from '../hooks/use-mobile';
import { eventsMockData } from '../data/eventsMockData';
import { ProTripNotFound } from '../components/pro/ProTripNotFound';
import { TripContext } from '../types/tripContext';
import { Message } from '../types/messages';
import { MobileEventDetail } from './MobileEventDetail';


const EventDetail = () => {
  const isMobile = useIsMobile();

  // Early return for mobile
  if (isMobile) {
    return <MobileEventDetail />;
  }
  const { eventId } = useParams<{ eventId?: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');
  const [showInbox, setShowInbox] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [showTripsPlusModal, setShowTripsPlusModal] = useState(false);
  const [tripDescription, setTripDescription] = useState<string>('');

  console.log('EventDetail - eventId from params:', eventId);
  console.log('EventDetail - available mock data keys:', Object.keys(eventsMockData));

  if (!eventId) {
    return (
      <ProTripNotFound message="No event ID provided." />
    );
  }

  if (!(eventId in eventsMockData)) {
    return (
      <ProTripNotFound 
        message="The requested event could not be found."
        details={`Event ID: ${eventId}`}
        availableIds={Object.keys(eventsMockData)}
      />
    );
  }

  const eventData = eventsMockData[eventId];

  // Enhanced trip data with event-specific features
  const trip = {
    id: parseInt(eventId.replace(/\D/g, '') || '1'),
    title: eventData.title,
    location: eventData.location,
    dateRange: eventData.dateRange,
    description: tripDescription || eventData.description || `Professional ${eventData.category.toLowerCase()} event in ${eventData.location}`,
    participants: eventData.participants.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar
    }))
  };

  // Initialize description state when event data is loaded
  React.useEffect(() => {
    if (eventData.description && !tripDescription) {
      setTripDescription(eventData.description);
    }
  }, [eventData.description, tripDescription]);

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

  // Enhanced trip context with event-specific features
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
      events: day.events
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
    broadcasts: mockBroadcasts,
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
          <TripHeader 
            trip={trip} 
            onDescriptionUpdate={setTripDescription}
          />

          {/* Enhanced Event Content */}
          <EventDetailContent
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onShowTripsPlusModal={() => setShowTripsPlusModal(true)}
            tripId={eventId}
            basecamp={basecamp}
            eventData={eventData}
            tripContext={tripContext}
          />
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
