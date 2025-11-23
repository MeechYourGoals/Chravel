import React, { useState, Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { MessageInbox } from '../components/MessageInbox';
import { ProTripDetailHeader } from '../components/pro/ProTripDetailHeader';
import { TripDetailModals } from '../components/trip/TripDetailModals';
import { TripExportModal } from '../components/trip/TripExportModal';
import { TripVariantProvider } from '../contexts/TripVariantContext';
import { useAuth } from '../hooks/useAuth';
import { useDemoMode } from '../hooks/useDemoMode';
import { useTrips } from '../hooks/useTrips';
import { convertSupabaseTripsToMock } from '../utils/tripConverter';
import { proTripMockData } from '../data/proTripMockData';
import { ProTripNotFound } from '../components/pro/ProTripNotFound';
import { ProTripCategory } from '../types/proCategories';
import { ExportSection } from '../types/tripExport';
// ⚡ OPTIMIZATION: PDF generation lazy loaded in handleExport for faster initial render
import { openOrDownloadBlob } from '../utils/download';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ProAdminDashboard } from '../components/pro/admin/ProAdminDashboard';
import { useProTripAdmin } from '../hooks/useProTripAdmin';
import { MockRolesService } from '../services/mockRolesService';

// 🚀 OPTIMIZATION: Lazy load heavy components for faster initial render
const TripHeader = lazy(() =>
  import('../components/TripHeader').then(module => ({
    default: module.TripHeader
  }))
);

const ProTripDetailContent = lazy(() =>
  import('../components/pro/ProTripDetailContent').then(module => ({
    default: module.ProTripDetailContent
  }))
);

/**
 * ProTripDetailDesktop Component
 * 
 * 🎯 Purpose: Desktop-only Pro trip detail view with full functionality
 * 🔒 Safety: All desktop logic isolated from mobile to prevent hook order issues
 */
export const ProTripDetailDesktop = () => {
  const { proTripId } = useParams<{ proTripId?: string }>();
  const { user } = useAuth();
  const { isDemoMode, isLoading: demoModeLoading } = useDemoMode();
  
  // ✅ FIXED: Always call useTrips hook for authenticated mode data
  const { trips: userTrips, loading: tripsLoading } = useTrips();
  const [activeTab, setActiveTab] = useState('chat');
  const [showInbox, setShowInbox] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [showTripsPlusModal, setShowTripsPlusModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Check admin status for Pro trips
  const { isAdmin } = useProTripAdmin(proTripId || '');

  // 🆕 Initialize mock roles and channels ONLY in demo mode
  React.useEffect(() => {
    if (isDemoMode && proTripId && proTripId in proTripMockData) {
      const tripData = proTripMockData[proTripId];
      const existingRoles = MockRolesService.getRolesForTrip(proTripId);
      
      if (!existingRoles) {
        const roles = MockRolesService.seedRolesForTrip(
          proTripId,
          tripData.proTripCategory,
          user?.id || 'demo-user'
        );
        MockRolesService.seedChannelsForRoles(proTripId, roles, user?.id || 'demo-user');
      }
    }
  }, [isDemoMode, proTripId, user?.id]);

  // ⚡ OPTIMIZATION: Show loading spinner instantly before expensive operations
  if (demoModeLoading || (tripsLoading && !isDemoMode)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing...</p>
        </div>
      </div>
    );
  }

  if (!proTripId) {
    console.error('ProTripDetail: No proTripId provided');
    return (
      <ProTripNotFound message="No trip ID provided." />
    );
  }

  // ✅ Fetch trip data based on mode
  let tripData: any;
  
  if (isDemoMode) {
    // 🔐 DEMO MODE: Use mock data
    if (!(proTripId in proTripMockData)) {
      console.error(`ProTripDetail: Pro trip not found in mock data: ${proTripId}`);
      console.log('Available Pro trip IDs:', Object.keys(proTripMockData));
      return (
        <ProTripNotFound 
          message="The requested trip could not be found in demo data."
          details={`Trip ID: ${proTripId}`}
          availableIds={Object.keys(proTripMockData)}
        />
      );
    }
    tripData = proTripMockData[proTripId];
  } else {
    // 🔐 AUTHENTICATED MODE: Fetch from Supabase
    console.log('[ProTripDetail] Searching for Pro trip:', proTripId);
    console.log('[ProTripDetail] Available trips:', userTrips.map(t => ({ id: t.id, type: t.trip_type })));
    
    // ✅ FILTER: Find Pro trip directly from userTrips array by ID and trip_type
    const supabaseTrip = userTrips.find(t => t.id === proTripId && t.trip_type === 'pro');

    if (!supabaseTrip) {
      console.error('[ProTripDetail] Pro trip not found or not Pro type');
      return (
        <ProTripNotFound
          message="Pro trip not found"
          details="This Pro trip doesn't exist or you don't have access."
        />
      );
    }

    // Convert to mock format for UI compatibility
    const proTrip = convertSupabaseTripsToMock([supabaseTrip])[0];

    // Convert to tripData format expected by components
    tripData = {
      id: proTrip.id,
      title: proTrip.title,
      location: proTrip.location,
      dateRange: proTrip.dateRange,
      description: proTrip.description,
      // ✅ FIX: Default category for authenticated trips (will be customizable in creation modal)
      proTripCategory: 'Sports – Pro, Collegiate, Youth',
      participants: proTrip.participants || [],
      basecamp_name: supabaseTrip?.basecamp_name || '',
      basecamp_address: supabaseTrip?.basecamp_address || '',
      enabled_features: supabaseTrip?.enabled_features || ['chat', 'calendar', 'concierge', 'media', 'payments', 'places', 'polls', 'tasks'],
      trip_type: supabaseTrip?.trip_type || 'pro',
      broadcasts: [],
      links: [],
      schedule: [],
      roster: [],
      tasks: [],
      polls: []
    };
  }

  // Transform trip data to match consumer trip structure
  const participants = tripData.participants || [];

  const trip = {
    id: tripData.id,
    name: tripData.title,
    description: tripData.description || '',
    destination: tripData.location,
    start_date: tripData.dateRange.split(' - ')[0],
    end_date: tripData.dateRange.split(' - ')[1],
    created_by: 'demo-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_archived: false,
    trip_type: 'pro' as const
  };

  const basecamp = {
    name: tripData.basecamp_name || '',
    address: tripData.basecamp_address || ''
  };

  const broadcasts = tripData.broadcasts || [];
  const links = tripData.links || [];

  // ⚡ OPTIMIZATION: Memoize trip context to prevent child re-renders
  const tripContext = React.useMemo(() => ({
    ...trip,
    basecamp,
    broadcasts,
    links,
    proTripCategory: tripData.proTripCategory,
    budget: tripData.budget,
    schedule: tripData.schedule,
    roster: tripData.roster,
    roomAssignments: tripData.roomAssignments,
    perDiem: tripData.perDiem,
    settlement: tripData.settlement,
    medical: tripData.medical,
    compliance: tripData.compliance,
    media: tripData.media,
    sponsors: tripData.sponsors
  }), [trip, basecamp, broadcasts, links, tripData]);

  // 🆕 Auto-scroll to chat on page load (chat-first viewport)
  React.useEffect(() => {
    const scrollToChat = () => {
      setTimeout(() => {
        const chatElement = document.querySelector('[data-chat-container]');
        if (chatElement) {
          chatElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    };

    scrollToChat();
  }, []);

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

      toast.info('Generating PDF...');
      let blob: Blob;
      
      if (isDemoMode) {
        // Lazy load PDF generation (only when export is clicked)
        const { generateClientPDF } = await import('../utils/exportPdfClient');
        // Build export data with conditional section inclusion
        const exportData: any = {
          tripId: proTripId || '',
          tripTitle: tripData.title,
          destination: tripData.location,
          dateRange: tripData.dateRange,
          description: tripData.description || '',
        };

        // Map Calendar if selected
        if (sections.includes('calendar')) {
          exportData.calendar = tripData.schedule?.map(s => ({
            title: s.title || 'Event',
            start_time: s.startTime || new Date().toISOString(),
            location: s.location,
            description: s.notes
          })) || [];
        }

        // Map Payments if selected
        if (sections.includes('payments')) {
          if (tripData.settlement && tripData.settlement.length > 0) {
            exportData.payments = {
              items: tripData.settlement.map(p => ({
                description: p.venue || 'Payment',
                amount: p.finalPayout || 0,
                currency: 'USD',
                split_count: 1,
                is_settled: p.status === 'paid',
                created_at: p.date
              })),
              total: tripData.settlement.reduce((sum, p) => sum + (p.finalPayout || 0), 0),
              currency: 'USD'
            };
          }
        }

        // Map Tasks if selected
        if (sections.includes('tasks')) {
          exportData.tasks = tripData.tasks?.map(t => ({
            title: t.title,
            description: t.description,
            completed: t.completed,
            due_date: t.due_at,
            assigned_to: t.assigned_to
          })) || [];
        }

        // Map Polls if selected
        if (sections.includes('polls')) {
          exportData.polls = tripData.polls?.map(p => ({
            question: p.question,
            options: p.options,
            total_votes: p.total_votes,
            status: p.status
          })) || [];
        }

        // Map Places/Links if selected
        if (sections.includes('places')) {
          exportData.places = tripData.links?.map(link => ({
            name: link.title,
            url: link.url,
            description: link.description,
            votes: 0
          })) || [];
        }

        // Map Broadcasts if selected (Pro/Events only)
        if (sections.includes('broadcasts')) {
          exportData.broadcasts = tripData.broadcasts?.map(b => ({
            message: b.message,
            priority: b.priority,
            timestamp: b.timestamp,
            sender: 'Tour Manager',
            read_count: b.readBy?.length || 0
          })) || [];
        }

        // Map Roster if selected
        if (sections.includes('roster')) {
          exportData.roster = tripData.roster?.map(r => ({
            name: r.name,
            email: r.email,
            role: r.role
          })) || [];
        }

        blob = await generateClientPDF(exportData, sections);
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token || '';
        
        const response = await fetch(
          `https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/export-trip`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptaml5ZWtteHdzeGtmbnF3eWFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjEwMDgsImV4cCI6MjA2OTQ5NzAwOH0.SAas0HWvteb9TbYNJFDf8Itt8mIsDtKOK6QwBcwINhI',
            },
            body: JSON.stringify({
              tripId: proTripId,
              sections,
              layout: 'pro',
              paper: 'letter',
              privacyRedaction: true,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          let errorMsg = 'Export failed';
          try {
            const errorJson = JSON.parse(errorText);
            errorMsg = errorJson.error || errorMsg;
          } catch {
            errorMsg = errorText || errorMsg;
          }
          
          console.error('[PRO-EXPORT] Edge function failed:', errorMsg);
          toast.error('Live export failed, generating offline PDF.');
          
          // Lazy load PDF generation for fallback
          const { generateClientPDF: fallbackPDF } = await import('../utils/exportPdfClient');
          blob = await fallbackPDF(
            {
              tripId: proTripId || '',
              tripTitle: tripData.title,
              destination: tripData.location,
              dateRange: tripData.dateRange,
              description: tripData.description || '',
              calendar: tripData.schedule?.map(s => ({
                title: s.title || 'Event',
                start_time: s.startTime || new Date().toISOString(),
                location: s.location,
                description: s.notes
              })) || [],
              payments: tripData.settlement && tripData.settlement.length > 0 ? {
                items: tripData.settlement.map(p => ({
                  description: p.venue || 'Payment',
                  amount: p.finalPayout || 0,
                  currency: 'USD',
                  split_count: 1,
                  is_settled: p.status === 'paid'
                })),
                total: tripData.settlement.reduce((sum, p) => sum + (p.finalPayout || 0), 0),
                currency: 'USD'
              } : undefined,
              roster: tripData.roster?.map(r => ({
                name: r.name,
                email: r.email,
                role: r.role
              })) || [],
            },
            sections
          );
        } else {
          blob = await response.blob();
        }
      }

      const filename = `Trip_${tripData.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
      await openOrDownloadBlob(blob, filename, { preOpenedWindow, mimeType: 'application/pdf' });
      
      toast.success('PDF exported successfully!');
    } catch (error) {
      console.error('[PRO-EXPORT] Export error details:', {
        error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        proTripId,
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

  return (
    <TripVariantProvider variant="pro">
      <div className="min-h-screen bg-black text-white">
        <ProTripDetailHeader
          tripContext={tripContext}
          showInbox={showInbox}
          onToggleInbox={() => setShowInbox(!showInbox)}
          onShowInvite={() => setShowInvite(true)}
          onShowTripSettings={() => setShowTripSettings(true)}
          onShowAuth={() => setShowAuth(true)}
        />

        {showInbox && (
          <MessageInbox />
        )}

        <div className="container mx-auto px-6 py-8 max-w-7xl">
          <Suspense fallback={
            <div className="mb-8 animate-pulse">
              <div className="h-8 bg-white/5 rounded w-2/3 mb-4"></div>
              <div className="flex gap-2 mb-4">
                <div className="h-6 bg-white/5 rounded w-24"></div>
                <div className="h-6 bg-white/5 rounded w-24"></div>
              </div>
              <div className="h-32 bg-white/5 rounded"></div>
            </div>
          }>
            <TripHeader
              trip={{
                id: parseInt(tripData.id) || 0,
                title: tripData.title,
                location: tripData.location,
                dateRange: tripData.dateRange,
                description: tripData.description || '',
                participants: tripData.participants
              }}
              category={tripData.proTripCategory as ProTripCategory}
              tags={tripData.tags}
              onCategoryChange={() => {}}
              onShowExport={() => setShowExportModal(true)}
            />
          </Suspense>

          <Suspense fallback={<LoadingSpinner className="my-12" />}>
            <ProTripDetailContent
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onShowTripsPlusModal={() => setShowTripsPlusModal(false)}
              tripId={proTripId}
              basecamp={basecamp}
              tripData={{
                ...tripData,
                enabled_features: tripData.enabled_features,
                trip_type: 'pro'
              }}
              selectedCategory={tripData.proTripCategory as ProTripCategory}
              trip={trip}
              tripCreatorId={trip.created_by}
            />
        </Suspense>
      </div>

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
          tripName={tripData.title}
          tripId={proTripId}
          userId={user?.id}
        />

        <TripExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          tripName={tripData.title}
          tripId={proTripId || ''}
        />
      </div>
    </TripVariantProvider>
  );
};
