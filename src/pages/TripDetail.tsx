
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { TripHeader } from '../components/TripHeader';
import { MessageInbox } from '../components/MessageInbox';
import { TripDetailHeader } from '../components/trip/TripDetailHeader';
import { TripDetailContent } from '../components/trip/TripDetailContent';
import { TripDetailModals } from '../components/trip/TripDetailModals';
import { TripExportModal } from '../components/trip/TripExportModal';
import { useAuth } from '../hooks/useAuth';
import { useDemoMode } from '../hooks/useDemoMode';
import { getTripById, generateTripMockData } from '../data/tripsData';
import { Trip } from '../services/tripService';
import { Message } from '../types/messages';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/use-mobile';
import { MobileTripDetail } from './MobileTripDetail';
import { ExportSection } from '../types/tripExport';
import { supabase } from '../integrations/supabase/client';
import { generateTripPDF } from '../utils/pdfGenerator';
import {
  buildCalendarSection,
  buildPaymentsSection,
  buildPollsSection,
  buildPlacesSection,
  buildTasksSection,
} from '../utils/exportSectionBuilders';

const TripDetail = () => {
  const isMobile = useIsMobile();
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
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

  // Handle export functionality
  const handleExport = async (sections: ExportSection[]) => {
    try {
      if (isDemoMode) {
        // Demo mode: generate sample PDF without API calls
        const formattedSections = [];

        if (sections.includes('calendar')) {
          formattedSections.push(buildCalendarSection([
            {
              id: 'demo-1',
              trip_id: tripId || '1',
              title: 'Team Dinner',
              description: 'Welcome dinner at the hotel restaurant',
              location: 'Hotel Restaurant',
              start_time: new Date().toISOString(),
              end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
              event_category: null,
              created_by: 'demo',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as any,
          ]));
        }

        if (sections.includes('payments')) {
          formattedSections.push(buildPaymentsSection([
            {
              id: 'demo-pay-1',
              trip_id: tripId || '1',
              amount: 500,
              currency: 'USD',
              description: 'Hotel Booking',
              split_count: 4,
              split_participants: ['user1', 'user2', 'user3', 'user4'],
              is_settled: false,
              created_by: 'demo',
              created_at: new Date().toISOString(),
            } as any,
          ]));
        }

        if (sections.includes('polls')) {
          formattedSections.push(buildPollsSection([
            {
              id: 'demo-poll-1',
              trip_id: tripId || '1',
              question: 'Where should we eat tonight?',
              options: [
                { id: '1', text: 'Italian Restaurant', votes: 5 },
                { id: '2', text: 'Sushi Bar', votes: 3 },
              ] as any,
              total_votes: 8,
              status: 'active',
              created_by: 'demo',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              version: 1,
            } as any,
          ]));
        }

        if (sections.includes('places')) {
          formattedSections.push(buildPlacesSection([
            {
              id: 'demo-link-1',
              trip_id: tripId || '1',
              url: 'https://example.com',
              title: 'Central Park',
              description: 'Must-visit landmark',
              category: 'attraction',
              votes: 12,
              created_by: 'demo',
              created_at: new Date().toISOString(),
            } as any,
          ]));
        }

        if (sections.includes('tasks')) {
          formattedSections.push(buildTasksSection([
            {
              id: 'demo-task-1',
              trip_id: tripId || '1',
              title: 'Book flights',
              description: 'Find best deals',
              completed: true,
              completed_at: new Date().toISOString(),
              due_at: null,
              created_by: 'demo',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              version: 1,
            } as any,
          ]));
        }

        await generateTripPDF({
          trip: {
            name: tripWithUpdatedData.title,
            description: tripWithUpdatedData.description,
            destination: tripWithUpdatedData.location,
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          sections: formattedSections,
          metadata: {
            exportedAt: new Date().toISOString(),
            exportedBy: 'demo',
            generatedBy: 'Chravel',
          },
        });
      } else {
        // Production mode: call edge function
        const { data, error } = await supabase.functions.invoke('export-trip-summary', {
          body: {
            tripId: tripId,
            includeSections: sections,
          },
        });

        if (error) {
          throw new Error(error.message || 'Failed to export trip summary');
        }

        if (!data || !data.success) {
          throw new Error('Failed to generate export data');
        }

        const formattedSections = [];

        if (sections.includes('calendar') && data.sections.calendar) {
          formattedSections.push(buildCalendarSection(data.sections.calendar));
        }

        if (sections.includes('payments') && data.sections.payments) {
          formattedSections.push(buildPaymentsSection(data.sections.payments));
        }

        if (sections.includes('polls') && data.sections.polls) {
          formattedSections.push(buildPollsSection(data.sections.polls));
        }

        if (sections.includes('places') && data.sections.places) {
          formattedSections.push(buildPlacesSection(data.sections.places));
        }

        if (sections.includes('tasks') && data.sections.tasks) {
          formattedSections.push(buildTasksSection(data.sections.tasks));
        }

        await generateTripPDF({
          trip: data.trip,
          sections: formattedSections,
          metadata: data.metadata,
        });
      }
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
      />
    </div>
  );
};

export default TripDetail;
