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
import { useEmbeddingGeneration } from '../hooks/useEmbeddingGeneration';
import { LoadingSpinner } from '../components/LoadingSpinner';

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
  const { generateInitialEmbeddings } = useEmbeddingGeneration(proTripId);
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

  // Auto-enable demo mode for Pro pages on first visit
  React.useEffect(() => {
    if (!isDemoMode) {
      enableDemoMode();
    }
  }, [isDemoMode, enableDemoMode]);

  // Show loading spinner while demo mode initializes
  if (!isDemoMode) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading demo content...</p>
        </div>
      </div>
    );
  }

  if (!proTripId) {
    return (
      <ProTripNotFound message="No trip ID provided." />
    );
  }

  if (!(proTripId in proTripMockData)) {
    return (
      <ProTripNotFound 
        message="The requested trip could not be found."
        details={`Trip ID: ${proTripId}`}
        availableIds={Object.keys(proTripMockData)}
      />
    );
  }

  const tripData = proTripMockData[proTripId];

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

  // Generate initial embeddings for RAG when pro trip loads
  React.useEffect(() => {
    if (proTripId && user && isDemoMode) {
      generateInitialEmbeddings();
    }
  }, [proTripId, user, isDemoMode, generateInitialEmbeddings]);

  const broadcasts = tripData.broadcasts || [];
  const links = tripData.links || [];

  const tripContext = {
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
  };

  // Handle export functionality - use same handler as consumer trips
  // Early return for mobile after all hooks are initialized
  if (isMobile) {
    return <MobileProTripDetail />;
  }

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
        console.log('[PRO-EXPORT] Calling export-trip edge function', { proTripId, sections });
        
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

        console.log('[PRO-EXPORT] Edge function response', { 
          status: response.status,
          contentType: response.headers.get('content-type'),
        });

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
          console.log('[PRO-EXPORT] PDF blob created', { size: blob.size });
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
