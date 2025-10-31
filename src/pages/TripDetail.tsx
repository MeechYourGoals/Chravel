
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
import { generateClientPDF } from '../utils/exportPdfClient';
import { openOrDownloadBlob } from '../utils/download';
import { toast } from 'sonner';
import { demoModeService } from '../services/demoModeService';
import { useEmbeddingGeneration } from '../hooks/useEmbeddingGeneration';

const TripDetail = () => {
  const isMobile = useIsMobile();
  const { tripId } = useParams();
  const { generateInitialEmbeddings } = useEmbeddingGeneration(tripId);
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

  // Generate initial embeddings for RAG when trip loads
  React.useEffect(() => {
    if (tripId && user) {
      generateInitialEmbeddings();
    }
  }, [tripId, user, generateInitialEmbeddings]);

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

  // Handle export functionality - detect mock trips and use appropriate export method
  const handleExport = async (sections: ExportSection[]) => {
    // Detect mock trip IDs (numeric vs UUID)
    const isMockTrip = tripId && /^\d+$/.test(tripId);

    try {
      // Pre-open a window on iOS Safari to avoid popup blocking for blob URLs
      let preOpenedWindow: Window | null = null;
      try {
        const ua = navigator.userAgent || '';
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
        if (isIOS && isSafari) {
          preOpenedWindow = window.open('', '_blank');
          if (preOpenedWindow) {
            preOpenedWindow.document.write(
              '<html><head><title>Generating PDF…</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
              '<body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial; padding: 16px; color: #e5e7eb; background: #111827">' +
              '<div>Generating PDF…</div></body></html>'
            );
          }
        }
      } catch {
        // Non-fatal; continue without pre-open
      }

      let blob: Blob;

      if (isMockTrip) {
        // Use client-side export for mock trips
        toast.info('Generating demo PDF with mock data...');

        // Fetch mock data for this trip
        const mockPayments = await demoModeService.getMockPayments(tripId || '1');
        const mockPolls = await demoModeService.getMockPolls(tripId || '1');
        const mockMembers = await demoModeService.getMockMembers(tripId || '1');

        blob = await generateClientPDF(
          {
            tripId: tripId || '1',
            tripTitle: tripWithUpdatedData.title,
            destination: tripWithUpdatedData.location,
            dateRange: tripWithUpdatedData.dateRange,
            description: tripWithUpdatedData.description,
            mockData: {
              payments: mockPayments,
              polls: mockPolls,
              roster: mockMembers,
            },
          },
          sections
        );
      } else {
        // Call edge function for real Supabase trips
        const { data, error } = await supabase.functions.invoke('export-trip', {
          body: {
            tripId,
            sections,
          }
        });

        if (error) {
          // If edge function fails, fallback to client export
          console.error(`Edge function failed: ${error.message}, using client fallback`);
          toast.error(`Live export failed, generating a limited offline PDF.`);

          // Fetch mock data for fallback
          const mockPayments = await demoModeService.getMockPayments(tripId || '1');
          const mockPolls = await demoModeService.getMockPolls(tripId || '1');
          const mockMembers = await demoModeService.getMockMembers(tripId || '1');

          blob = await generateClientPDF(
            {
              tripId: tripId || '1',
              tripTitle: tripWithUpdatedData.title,
              destination: tripWithUpdatedData.location,
              dateRange: tripWithUpdatedData.dateRange,
              description: tripWithUpdatedData.description,
              mockData: {
                payments: mockPayments,
                polls: mockPolls,
                roster: mockMembers,
              },
            },
            sections
          );
        } else {
          blob = data;
        }
      }

      // Download or open the PDF with cross-platform handling
      const filename = `Trip_${tripWithUpdatedData.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
      await openOrDownloadBlob(blob, filename, { preOpenedWindow, mimeType: 'application/pdf' });
      
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export PDF');
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
