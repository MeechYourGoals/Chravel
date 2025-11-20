
import React, { useState, Suspense, lazy, memo } from 'react';
import { useParams } from 'react-router-dom';
import { MessageInbox } from '../components/MessageInbox';
import { TripDetailHeader } from '../components/trip/TripDetailHeader';
import { TripDetailModals } from '../components/trip/TripDetailModals';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

// 🚀 OPTIMIZATION: Lazy load heavy components for faster initial render
const TripHeader = lazy(() => 
  import('../components/TripHeader').then(module => ({
    default: module.TripHeader
  }))
);

const TripDetailContent = lazy(() =>
  import('../components/trip/TripDetailContent').then(module => ({
    default: module.TripDetailContent
  }))
);
import { TripExportModal } from '../components/trip/TripExportModal';
import { useAuth } from '../hooks/useAuth';
import { getTripById, generateTripMockData, Trip as MockTrip } from '../data/tripsData';
import { tripService } from '../services/tripService';
import { Message } from '../types/messages';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/use-mobile';
import { MobileTripDetail } from './MobileTripDetail';
import { ExportSection } from '../types/tripExport';
import { supabase } from '../integrations/supabase/client';
// Lazy load PDF utils to reduce initial bundle size (~100KB)
// import { generateClientPDF } from '../utils/exportPdfClient';
import { openOrDownloadBlob } from '../utils/download';
import { toast } from 'sonner';
import { demoModeService } from '../services/demoModeService';
import { useDemoMode } from '../hooks/useDemoMode';
import { convertSupabaseTripToMock } from '../utils/tripConverter';

const TripDetail = () => {
  usePerformanceMonitor('TripDetail');
  const isMobile = useIsMobile();
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode, isLoading: demoModeLoading } = useDemoMode();
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
  const [trip, setTrip] = useState<MockTrip | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔄 CRITICAL: Wait for demo mode to initialize before loading trip data
  React.useEffect(() => {
    const loadTrip = async () => {
      if (!tripId) {
        setLoading(false);
        return;
      }

      // Don't attempt to load data if demo mode is still initializing
      if (demoModeLoading) {
        return;
      }

      setLoading(true);
      if (isDemoMode) {
        const tripIdNum = parseInt(tripId, 10);
        const mockTrip = getTripById(tripIdNum);
        if (!mockTrip) {
          console.error(`TripDetail: Trip not found in mock data: ${tripId}`);
        }
        setTrip(mockTrip);
      } else {
        const realTrip = await tripService.getTripById(tripId);
        if (realTrip) {
          setTrip(convertSupabaseTripToMock(realTrip));
        } else {
          console.error(`TripDetail: Trip not found in Supabase: ${tripId}`);
          setTrip(null);
        }
      }
      setLoading(false);
    };

    loadTrip();
  }, [tripId, isDemoMode, demoModeLoading]);
  
  // Initialize description state when trip is loaded
  React.useEffect(() => {
    if (trip && !tripDescription) {
      setTripDescription(trip.description);
    }
  }, [trip, tripDescription]);

  // Auto-scroll to chat on page load for desktop (called before any conditional returns)
  React.useEffect(() => {
    if (!isMobile && !loading && trip) {
      const scrollToChat = () => {
        setTimeout(() => {
          const chatElement = document.querySelector('[data-chat-container]');
          if (chatElement) {
            chatElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      };
      scrollToChat();
    }
  }, [isMobile, loading, trip]);

  // Handle trip updates from edit modal - adapter to convert Supabase format to mock format
  const handleTripUpdate = (updates: Partial<MockTrip>) => {
    setTripData(prev => ({ ...prev, ...updates }));
    
    // Update specific states for backward compatibility
    if (updates.title) setTripData(prev => ({ ...prev, title: updates.title }));
    if (updates.description) setTripDescription(updates.description);
  };
  
  // Loading state
  // Show loading while demo mode initializes or trip data loads
  if (demoModeLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // 🚀 CRITICAL: Mobile redirect MUST happen before any desktop-specific useMemo hooks
  // This prevents errors when trip is null and useMemo tries to access trip properties
  if (isMobile) {
    return <MobileTripDetail />;
  }
  
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

  // Generate dynamic mock data based on the trip - MEMOIZED for performance
  // 🛡️ SAFETY: Use tripWithUpdatedData (guaranteed non-null after check above)
  const mockData = React.useMemo(() =>
    generateTripMockData(tripWithUpdatedData),
    [tripWithUpdatedData?.id]
  );
  const basecamp = mockData.basecamp;

  // Messages are now handled by unified messaging service
  const tripMessages: Message[] = [];

  // Use generated mock data
  const mockBroadcasts = mockData.broadcasts;
  const mockLinks = mockData.links;
  const mockItinerary = mockData.itinerary;

  // Build comprehensive trip context - MEMOIZED to prevent unnecessary re-renders
  // 🛡️ SAFETY: Use tripWithUpdatedData (guaranteed non-null after check above)
  const tripContext = React.useMemo(() => ({
    id: tripId || '1',
    title: tripWithUpdatedData.title,
    location: tripWithUpdatedData.location,
    dateRange: tripWithUpdatedData.dateRange,
    basecamp,
    calendar: mockItinerary,
    broadcasts: mockBroadcasts,
    links: mockLinks,
    messages: tripMessages,
    collaborators: tripWithUpdatedData.participants,
    itinerary: mockItinerary,
    isPro: false
  }), [tripId, tripWithUpdatedData.title, tripWithUpdatedData.location, tripWithUpdatedData.dateRange, basecamp, mockItinerary, mockBroadcasts, mockLinks, tripMessages, tripWithUpdatedData.participants]);

  // Handle export functionality - always use client-side generation
  const handleExport = async (sections: ExportSection[]) => {
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

      // Check if this is a mock trip (numeric ID 1-12) or real trip (UUID)
      toast.info('Generating PDF...');
      const isMockTrip = tripId && /^\d+$/.test(tripId);
      let blob: Blob;

      if (isMockTrip) {
        // Use mock data for demo trips
        const mockPayments = await demoModeService.getMockPayments(tripId || '1');
        const mockPolls = await demoModeService.getMockPolls(tripId || '1');
        const mockMembers = await demoModeService.getMockMembers(tripId || '1');

        // Lazy load PDF generation (only when export is clicked)
        const { generateClientPDF } = await import('../utils/exportPdfClient');
        blob = await generateClientPDF(
          {
            tripId: tripId || '1',
            tripTitle: tripWithUpdatedData.title,
            destination: tripWithUpdatedData.location,
            dateRange: tripWithUpdatedData.dateRange,
            description: tripWithUpdatedData.description,
            calendar: mockItinerary,
            payments: mockPayments.length > 0 ? {
              items: mockPayments,
              total: mockPayments.reduce((sum, p) => sum + p.amount, 0),
              currency: mockPayments[0]?.currency || 'USD'
            } : undefined,
            polls: mockPolls,
            roster: mockMembers.map(m => ({
              name: m.display_name,
              email: undefined,
              role: m.role
            })),
          },
          sections,
          {
            customization: {
              compress: true,
              maxItemsPerSection: 100,
            },
            onProgress: (progress) => {
              if (progress.stage === 'rendering') {
                toast.info(`${progress.message} (${progress.current}/${progress.total})`);
              }
            }
          }
        );
      } else {
        // Fetch real data for Supabase trips
        const { getExportData } = await import('../services/tripExportDataService');
        const realData = await getExportData(tripId || '', sections);

        // Lazy load PDF generation (only when export is clicked)
        const { generateClientPDF } = await import('../utils/exportPdfClient');
        blob = await generateClientPDF(
          {
            tripId: tripId || '',
            tripTitle: realData.trip.title,
            destination: realData.trip.destination,
            dateRange: realData.trip.dateRange,
            description: realData.trip.description,
            calendar: realData.calendar,
            payments: realData.payments,
            polls: realData.polls,
            tasks: realData.tasks,
            places: realData.places,
            roster: realData.roster,
          },
          sections,
          {
            customization: {
              compress: true,
              maxItemsPerSection: 100,
            },
            onProgress: (progress) => {
              if (progress.stage === 'rendering') {
                toast.info(`${progress.message} (${progress.current}/${progress.total})`);
              }
            }
          }
        );
      }

      // Download or open the PDF with cross-platform handling
      const filename = `Trip_${tripWithUpdatedData.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
      await openOrDownloadBlob(blob, filename, { preOpenedWindow, mimeType: 'application/pdf' });
      
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('Export error details:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        tripId,
        sections
      });
      toast.error(
        error instanceof Error 
          ? `Export failed: ${error.message}` 
          : 'Failed to export PDF'
      );
      throw error;
    }
  };

  // Desktop experience (mobile already handled at top of component)
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
        <Suspense fallback={
          <div className="mb-8 animate-pulse">
            <div className="h-64 bg-white/5 rounded-3xl mb-4"></div>
            <div className="h-8 bg-white/5 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-white/5 rounded w-1/4"></div>
          </div>
        }>
          <TripHeader 
            trip={tripWithUpdatedData} 
            onDescriptionUpdate={setTripDescription}
            onTripUpdate={handleTripUpdate}
            onShowExport={() => setShowExportModal(true)}
          />
        </Suspense>

        {/* Main Content */}
        <Suspense fallback={<LoadingSpinner className="my-12" />}>
          <TripDetailContent
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onShowTripsPlusModal={() => setShowTripsPlusModal(true)}
            tripId={tripId || '1'}
            tripName={tripWithUpdatedData.title}
            basecamp={basecamp}
          />
        </Suspense>
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
