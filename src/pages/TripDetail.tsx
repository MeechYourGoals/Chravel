
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { TripHeader } from '../components/TripHeader';
import { MessageInbox } from '../components/MessageInbox';
import { TripDetailHeader } from '../components/trip/TripDetailHeader';
import { TripDetailContent } from '../components/trip/TripDetailContent';
import { TripDetailModals } from '../components/trip/TripDetailModals';
import { TripExportModal } from '../components/trip/TripExportModal';
import { useAuth } from '../hooks/useAuth';
import { getTripById, generateTripMockData } from '../data/tripsData';
import { Trip } from '../services/tripService';
import { Message } from '../types/messages';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/use-mobile';
import { MobileTripDetail } from './MobileTripDetail';
import { ExportSection } from '../types/tripExport';
import { supabase } from '../integrations/supabase/client';

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
  const [showExportModal, setShowExportModal] = useState(false);
  const [tripDescription, setTripDescription] = useState<string>('');
  const [tripData, setTripData] = useState<{
    title?: string;
    location?: string;
    dateRange?: string;
  }>({});

  // Get trip data dynamically based on tripId
  const tripIdNum = tripId ? parseInt(tripId, 10) : null;
  const trip = tripIdNum ? getTripById(tripIdNum) : null;
  
  // Initialize description state when trip is loaded
  React.useEffect(() => {
    if (trip && !tripDescription) {
      setTripDescription(trip.description);
    }
  }, [trip, tripDescription]);

  // Handle trip updates from edit modal
  const handleTripUpdate = (updates: Partial<Trip>) => {
    setTripData(prev => ({ ...prev, ...updates }));
    
    // Update specific states for backward compatibility
    if (updates.name) setTripData(prev => ({ ...prev, title: updates.name }));
    if (updates.description) setTripDescription(updates.description);
  };
  
  // Create trip object with all updates
  const tripWithUpdatedData = trip ? {
    ...trip,
    title: tripData.title || trip.title,
    location: tripData.location || trip.location,
    dateRange: tripData.dateRange || trip.dateRange,
    description: tripDescription || trip.description
  } : null;
  
  // Handle missing trip
  if (!tripWithUpdatedData) {
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
  const tripMessages: Message[] = [];

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

  // Handle export functionality - call edge function directly
  const handleExport = async (
    sections: ExportSection[],
    layout: 'onepager' | 'pro',
    privacyRedaction: boolean,
    paper: 'letter' | 'a4'
  ) => {
    try {
      // Build query params
      const params = new URLSearchParams({
        layout,
        sections: sections.join(','),
        privacy_redaction: privacyRedaction.toString(),
        paper,
      });

      // Call export-trip edge function directly (no auth required)
      const response = await fetch(
        `https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/export-trip?tripId=${tripId}&${params}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tripId,
            sections,
            layout,
            privacyRedaction,
            paper,
            // Pass trip data from frontend (for mock trips that don't exist in DB)
            tripData: {
              title: tripWithUpdatedData.title,
              destination: tripWithUpdatedData.location,
              startDate: tripWithUpdatedData.dateRange,
              endDate: '',
              description: tripWithUpdatedData.description,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Export failed: ${response.status} - ${errorText}`);
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Trip_${tripWithUpdatedData.title.replace(/[^a-z0-9]/gi, '_')}_${layout}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
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
          trip={tripWithUpdatedData} 
          onDescriptionUpdate={setTripDescription}
          onTripUpdate={handleTripUpdate}
          onShowExport={() => setShowExportModal(true)}
        />

        {/* Main Content */}
        <TripDetailContent
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onShowTripsPlusModal={() => setShowTripsPlusModal(true)}
          tripId={tripId || '1'}
          tripName={tripWithUpdatedData.title}
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
        tripName={tripWithUpdatedData.title}
        tripId={tripId || '1'}
        userId={user?.id}
      />

      {/* Export Modal */}
      <TripExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        tripName={tripWithUpdatedData.title}
        tripId={tripId || '1'}
      />
    </div>
  );
};

export default TripDetail;
