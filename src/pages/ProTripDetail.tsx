import React, { useState, Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { MessageInbox } from '../components/MessageInbox';
import { ProTripDetailHeader } from '../components/pro/ProTripDetailHeader';
import { TripDetailModals } from '../components/trip/TripDetailModals';
import { TripExportModal } from '../components/trip/TripExportModal';
import { TripVariantProvider } from '../contexts/TripVariantContext';
import { useAuth } from '../hooks/useAuth';
import { useDemoMode } from '../hooks/useDemoMode';
import { useIsMobile } from '../hooks/use-mobile';
import { proTripMockData } from '../data/proTripMockData';
import { ProTripNotFound } from '../components/pro/ProTripNotFound';
import { ProTripCategory } from '../types/proCategories';
import { ExportSection } from '../types/tripExport';
import { generateClientPDF } from '../utils/exportPdfClient';
import { openOrDownloadBlob } from '../utils/download';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';
import { MobileProTripDetail } from './MobileProTripDetail';
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

const ProTripDetail = () => {
  const isMobile = useIsMobile();
  const { proTripId } = useParams<{ proTripId?: string }>();
  const { user } = useAuth();
  const { isDemoMode, enableDemoMode } = useDemoMode();
  const [activeTab, setActiveTab] = useState('chat');
  const [showInbox, setShowInbox] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showTripSettings, setShowTripSettings] = useState(false);
  const [showTripsPlusModal, setShowTripsPlusModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  // State for loading authenticated Pro trip data
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<any>(null);

  // Check admin status for Pro trips
  const { isAdmin } = useProTripAdmin(proTripId || '');

  // 🆕 Initialize mock roles and channels for Pro trips IN DEMO MODE ONLY
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

  // Load Pro trip data - from Supabase if authenticated, from mock if demo mode
  React.useEffect(() => {
    const loadProTrip = async () => {
      if (!proTripId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      if (isDemoMode) {
        // Demo mode: use mock data
        if (proTripId in proTripMockData) {
          setTrip(proTripMockData[proTripId]);
        }
        setLoading(false);
      } else {
        // Authenticated mode: load from Supabase
        try {
          const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('id', proTripId)
            .eq('trip_type', 'pro')
            .single();

          if (error) throw error;

          if (data) {
            // Transform Supabase trip to match Pro trip format
            setTrip({
              id: data.id,
              title: data.name,
              location: data.destination || 'TBD',
              dateRange: `${data.start_date || 'TBD'} - ${data.end_date || 'TBD'}`,
              description: data.description || '',
              proTripCategory: 'sports-team', // TODO: get from data
              participants: [], // TODO: fetch from trip_members
              broadcasts: [],
              links: [],
              basecamp_name: data.basecamp_name,
              basecamp_address: data.basecamp_address,
              // Pro-specific fields will be loaded from separate tables
              budget: [],
              schedule: [],
              roster: [],
              roomAssignments: [],
              perDiem: [],
              settlement: [],
              medical: [],
              compliance: [],
              media: [],
              sponsors: [],
              tags: []
            });
          } else {
            setTrip(null);
          }
        } catch (error) {
          console.error('Error loading Pro trip:', error);
          setTrip(null);
        }
        setLoading(false);
      }
    };

    loadProTrip();
  }, [proTripId, isDemoMode]);

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading Pro trip...</p>
        </div>
      </div>
    );
  }

  if (!proTripId) {
    return (
      <ProTripNotFound message="No trip ID provided." />
    );
  }

  // Handle missing trip
  if (!trip) {
    return (
      <ProTripNotFound
        message="The requested Pro trip could not be found."
        details={`Trip ID: ${proTripId}`}
        availableIds={isDemoMode ? Object.keys(proTripMockData) : []}
      />
    );
  }

  const tripData = trip;

  // Transform trip data to match consumer trip structure
  const participants = tripData.participants || [];

  const tripForContext = {
    id: tripData.id,
    name: tripData.title,
    description: tripData.description || '',
    destination: tripData.location,
    start_date: tripData.dateRange?.split(' - ')[0] || '',
    end_date: tripData.dateRange?.split(' - ')[1] || '',
    created_by: isDemoMode ? 'demo-user' : (user?.id || ''),
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

  const tripContext = {
    ...tripForContext,
    basecamp,
    broadcasts,
    links,
    proTripCategory: tripData.proTripCategory,
    budget: tripData.budget || [],
    schedule: tripData.schedule || [],
    roster: tripData.roster || [],
    roomAssignments: tripData.roomAssignments || [],
    perDiem: tripData.perDiem || [],
    settlement: tripData.settlement || [],
    medical: tripData.medical || [],
    compliance: tripData.compliance || [],
    media: tripData.media || [],
    sponsors: tripData.sponsors || []
  };

  // Handle export functionality - use same handler as consumer trips
  // Early return for mobile after all hooks are initialized
  if (isMobile) {
    return <MobileProTripDetail />;
  }

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

      let blob: Blob;

      // Pro trips in demo mode use client-side export
      // Real Pro trips would call the edge function with their UUID
      toast.info('Generating PDF...');
      
      if (isDemoMode) {
        blob = await generateClientPDF(
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
        // Call edge function for real Supabase trips using direct fetch
        
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
          // Try to parse error JSON
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
          
          blob = await generateClientPDF(
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
          // Convert response to Blob
          blob = await response.blob();
        }
      }

      // Download or open the PDF with cross-platform handling
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
              tripData={tripData}
              selectedCategory={tripData.proTripCategory as ProTripCategory}
            />
          </Suspense>

          {/* Pro Admin Dashboard */}
          {proTripId && isAdmin && (
            <div className="mt-8">
              <ProAdminDashboard
                tripId={proTripId}
                tripCreatorId={tripForContext.created_by}
                isAdmin={isAdmin}
              />
            </div>
          )}
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

        {/* Export Modal - Unified for both trip types */}
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

export default ProTripDetail;
