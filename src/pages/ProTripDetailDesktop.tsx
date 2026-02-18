import React, { useState, Suspense, lazy, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { MessageInbox } from '../components/MessageInbox';
import { ProTripDetailHeader } from '../components/pro/ProTripDetailHeader';
import { TripDetailModals } from '../components/trip/TripDetailModals';
import { TripExportModal } from '../components/trip/TripExportModal';
import { TripVariantProvider } from '../contexts/TripVariantContext';
import { useAuth } from '../hooks/useAuth';
import { useDemoMode } from '../hooks/useDemoMode';
import { useTrips } from '../hooks/useTrips';
import { convertSupabaseTripToProTrip } from '../utils/tripConverter';
import { proTripMockData } from '../data/proTripMockData';
import { ProTripNotFound } from '../components/pro/ProTripNotFound';
import { ProTripCategory } from '../types/proCategories';
import { ExportSection } from '../types/tripExport';
// ⚡ OPTIMIZATION: PDF generation lazy loaded in handleExport for faster initial render
import { openOrDownloadBlob } from '../utils/download';
import { orderExportSections } from '../utils/exportSectionOrder';
import { toast } from 'sonner';
import { supabase, SUPABASE_PROJECT_URL } from '../integrations/supabase/client';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { useProTripAdmin } from '../hooks/useProTripAdmin';
import { MockRolesService } from '../services/mockRolesService';
import { useTripMembers } from '../hooks/useTripMembers';
import { demoModeService } from '../services/demoModeService';
import { ProTripData, ProParticipant } from '../types/pro';

// 🚀 OPTIMIZATION: Lazy load heavy components for faster initial render
const TripHeader = lazy(() =>
  import('../components/TripHeader').then(module => ({
    default: module.TripHeader,
  })),
);

const ProTripDetailContent = lazy(() =>
  import('../components/pro/ProTripDetailContent').then(module => ({
    default: module.ProTripDetailContent,
  })),
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
  const { isAdmin: _isAdmin } = useProTripAdmin(proTripId || '');

  // Unified data: useTripMembers for both real-time updates and consistent behavior with mobile
  const { tripMembers, loading: membersLoading } = useTripMembers(proTripId);

  // ✅ Calculate tripData with useMemo - MUST be before any conditional returns
  const tripData = useMemo(() => {
    if (!proTripId) return null;

    if (isDemoMode) {
      return proTripId in proTripMockData ? proTripMockData[proTripId] : null;
    }

    // Find Pro trip from Supabase data
    const supabaseTrip = userTrips.find(t => t.id === proTripId && t.trip_type === 'pro');
    if (!supabaseTrip) return null;

    // Convert to ProTripData format
    const convertedTrip = convertSupabaseTripToProTrip(supabaseTrip);

    const proParticipants: ProParticipant[] = tripMembers.map(m => ({
      id: m.id,
      userId: m.id,
      name: m.name,
      avatar: m.avatar,
      role: m.role || 'member',
      email: '',
      credentialLevel: 'Guest' as const,
      permissions: [],
    }));

    return {
      ...convertedTrip,
      participants: proParticipants,
      roster: proParticipants,

      enabled_features: supabaseTrip.enabled_features || [
        'chat',
        'calendar',
        'concierge',
        'media',
        'payments',
        'places',
        'polls',
        'tasks',
      ],
    } as ProTripData;
  }, [isDemoMode, proTripId, userTrips, tripMembers]);

  // Initialize mock roles and channels ONLY in demo mode
  React.useEffect(() => {
    if (isDemoMode && proTripId && proTripId in proTripMockData) {
      const mockTripData = proTripMockData[proTripId];
      const existingRoles = MockRolesService.getRolesForTrip(proTripId);

      if (!existingRoles) {
        const roles = MockRolesService.seedRolesForTrip(
          proTripId,
          mockTripData.proTripCategory,
          user?.id || 'demo-user',
        );
        MockRolesService.seedChannelsForRoles(proTripId, roles, user?.id || 'demo-user');
      }
    }
  }, [isDemoMode, proTripId, user?.id]);

  // ⚡ Memoize derived data - MUST be before any conditional returns
  const tripContext = React.useMemo(() => {
    if (!tripData) return null;

    // Get actual creator ID from Supabase trip data in authenticated mode
    const supabaseTrip = userTrips.find(t => t.id === tripData.id);
    const actualCreatorId = isDemoMode ? 'demo-user' : supabaseTrip?.created_by || user?.id || '';

    const trip = {
      id: tripData.id,
      name: tripData.title,
      description: tripData.description || '',
      destination: tripData.location,
      start_date: tripData.dateRange?.split(' - ')[0] || '',
      end_date: tripData.dateRange?.split(' - ')[1] || '',
      created_by: actualCreatorId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_archived: false,
      trip_type: 'pro' as const,
    };

    const basecamp = {
      name: tripData.basecamp_name || '',
      address: tripData.basecamp_address || '',
    };

    const broadcasts = tripData.broadcasts || [];
    const links = tripData.links || [];

    return {
      ...trip,
      basecamp,
      broadcasts,
      links,
      participants: tripData.participants || [],
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
      sponsors: tripData.sponsors,
    };
  }, [tripData, userTrips, isDemoMode, user?.id]);

  // Auto-scroll to chat on page load (chat-first viewport)
  React.useEffect(() => {
    if (!tripData) return;
    const scrollToChat = () => {
      setTimeout(() => {
        const chatElement = document.querySelector('[data-chat-container]');
        if (chatElement) {
          chatElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    };

    scrollToChat();
  }, [tripData]);

  // ⚡ Loading states AFTER all hooks
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
    return <ProTripNotFound message="No trip ID provided." />;
  }

  // Handle trip not found case - AFTER all hooks
  if (!tripData || !tripContext) {
    const errorMessage = isDemoMode
      ? 'The requested trip could not be found in demo data.'
      : "This Pro trip doesn't exist or you don't have access.";
    return (
      <ProTripNotFound
        message={errorMessage}
        details={isDemoMode ? `Trip ID: ${proTripId}` : undefined}
        availableIds={isDemoMode ? Object.keys(proTripMockData) : undefined}
      />
    );
  }

  // Derived data for rendering
  const _participants = tripData.participants || [];
  // Get actual creator ID from Supabase trip data in authenticated mode
  const supabaseTrip = userTrips.find(t => t.id === tripData.id);
  const actualCreatorId = isDemoMode ? 'demo-user' : supabaseTrip?.created_by || user?.id || '';

  const trip = {
    id: tripData.id,
    name: tripData.title,
    description: tripData.description || '',
    destination: tripData.location,
    start_date: tripData.dateRange?.split(' - ')[0] || '',
    end_date: tripData.dateRange?.split(' - ')[1] || '',
    created_by: actualCreatorId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_archived: false,
    trip_type: 'pro' as const,
  };
  const basecamp = {
    name: tripData.basecamp_name || '',
    address: tripData.basecamp_address || '',
  };
  const _broadcasts = tripData.broadcasts || [];
  const _links = tripData.links || [];

  const handleExport = async (sections: ExportSection[]) => {
    const orderedSections = orderExportSections(sections);
    try {
      // Pre-open a window on iOS Safari to avoid popup blocking for blob URLs
      let preOpenedWindow: Window | null = null;
      try {
        const ua = navigator.userAgent || '';
        const isIOS =
          /iPad|iPhone|iPod/.test(ua) ||
          (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
        if (isIOS && isSafari) {
          preOpenedWindow = window.open('', '_blank');
          if (preOpenedWindow) {
            preOpenedWindow.document.write(
              '<html><head><title>Creating your Recap…</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
                '<body style="font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial; padding: 16px; color: #e5e7eb; background: #111827">' +
                '<div>Creating your Recap…</div></body></html>',
            );
          }
        }
      } catch {
        // Non-fatal; continue without pre-open
      }

      toast.info('Creating Recap...');
      let blob: Blob;

      if (isDemoMode) {
        // Lazy load PDF generation (only when export is clicked)
        const { generateClientPDF } = await import('../utils/exportPdfClient');
        // Build export data with conditional section inclusion
        const exportData: Record<string, unknown> = {
          tripId: proTripId || '',
          tripTitle: tripData.title,
          destination: tripData.location,
          dateRange: tripData.dateRange,
          description: tripData.description || '',
        };

        // Map Calendar if selected
        if (orderedSections.includes('calendar')) {
          exportData.calendar =
            tripData.schedule?.map(s => ({
              title: s.title || 'Event',
              start_time: s.startTime || new Date().toISOString(),
              location: s.location,
              description: s.notes,
            })) || [];
        }

        // Map Payments if selected
        if (orderedSections.includes('payments')) {
          if (tripData.settlement && tripData.settlement.length > 0) {
            exportData.payments = {
              items: tripData.settlement.map(p => ({
                description: p.venue || 'Payment',
                amount: p.finalPayout || 0,
                currency: 'USD',
                split_count: 1,
                is_settled: p.status === 'paid',
                created_at: p.date,
              })),
              total: tripData.settlement.reduce((sum, p) => sum + (p.finalPayout || 0), 0),
              currency: 'USD',
            };
          }
        }

        // Map Tasks if selected
        if (orderedSections.includes('tasks')) {
          exportData.tasks =
            tripData.tasks?.map(t => ({
              title: t.title,
              description: t.description,
              completed: t.completed,
              due_date: t.due_at,
              assigned_to: t.assigned_to,
            })) || [];
        }

        // Map Polls if selected
        if (orderedSections.includes('polls')) {
          exportData.polls =
            tripData.polls?.map(p => ({
              question: p.question,
              options: p.options,
              total_votes: p.total_votes,
              status: p.status,
            })) || [];
        }

        // Map Places/Links if selected
        if (orderedSections.includes('places')) {
          exportData.places =
            tripData.links?.map(link => ({
              name: link.title,
              url: link.url,
              description: link.description,
              votes: 0,
            })) || [];
        }

        // Map Broadcasts if selected (Pro/Events only)
        if (orderedSections.includes('broadcasts')) {
          exportData.broadcasts =
            tripData.broadcasts?.map(b => ({
              message: b.message,
              priority: b.priority,
              timestamp: b.timestamp,
              sender: 'Tour Manager',
              read_count: b.readBy?.length || 0,
            })) || [];
        }

        // Map Roster if selected
        if (orderedSections.includes('roster')) {
          exportData.roster =
            tripData.roster?.map(r => ({
              name: r.name,
              email: r.email,
              role: r.role,
            })) || [];
        }

        if (orderedSections.includes('attachments')) {
          exportData.attachments = demoModeService.getMockAttachments(proTripId || '1');
        }

        blob = await generateClientPDF(exportData as any, orderedSections);
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token || '';

        const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/export-trip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            tripId: proTripId,
            sections: orderedSections,
            layout: 'pro',
            paper: 'letter',
            privacyRedaction: true,
          }),
        });

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

          // Use shared export data service (same as mobile) to fetch real DB data
          const { getExportData } = await import('../services/tripExportDataService');
          const realData = await getExportData(proTripId || '', orderedSections);
          const { generateClientPDF: fallbackPDF } = await import('../utils/exportPdfClient');
          blob = await fallbackPDF(
            {
              tripId: proTripId || '',
              tripTitle: realData.trip.title || tripData.title,
              destination: realData.trip.destination || tripData.location,
              dateRange: realData.trip.dateRange || tripData.dateRange,
              description: realData.trip.description || tripData.description || '',
              calendar: realData.calendar || [],
              payments: realData.payments,
              polls: realData.polls,
              tasks: realData.tasks,
              places: realData.places,
              roster: realData.roster || [],
              broadcasts: (realData as any).broadcasts,
              attachments: (realData as any).attachments,
            },
            orderedSections,
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
        sections,
      });
      toast.error(
        error instanceof Error ? `Recap failed: ${error.message}` : 'Failed to create recap',
      );
      throw error;
    }
  };

  return (
    <TripVariantProvider variant="pro">
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-6 py-4 pb-8 max-w-7xl">
          <ProTripDetailHeader
            tripContext={tripContext}
            showInbox={showInbox}
            onToggleInbox={() => setShowInbox(!showInbox)}
            onShowInvite={() => setShowInvite(true)}
            onShowTripSettings={() => setShowTripSettings(true)}
            onShowAuth={() => setShowAuth(true)}
          />

          {showInbox && <MessageInbox />}

          <Suspense
            fallback={
              <div className="mb-8 animate-pulse">
                <div className="h-8 bg-white/5 rounded w-2/3 mb-4"></div>
                <div className="flex gap-2 mb-4">
                  <div className="h-6 bg-white/5 rounded w-24"></div>
                  <div className="h-6 bg-white/5 rounded w-24"></div>
                </div>
                <div className="h-32 bg-white/5 rounded"></div>
              </div>
            }
          >
            <TripHeader
              trip={{
                id: tripData.id,
                title: tripData.title,
                location: tripData.location,
                dateRange: tripData.dateRange,
                description: tripData.description || '',
                participants: tripData.participants,
                created_by: actualCreatorId,
                trip_type: 'pro',
                coverPhoto: tripData.coverPhoto,
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
                trip_type: 'pro',
              }}
              selectedCategory={tripData.proTripCategory as ProTripCategory}
              trip={trip}
              tripCreatorId={trip.created_by}
              isLoadingRoster={!isDemoMode && membersLoading}
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
