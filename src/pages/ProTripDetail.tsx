import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { TripHeader } from '../components/TripHeader';
import { MessageInbox } from '../components/MessageInbox';
import { ProTripDetailHeader } from '../components/pro/ProTripDetailHeader';
import { ProTripDetailContent } from '../components/pro/ProTripDetailContent';
import { TripDetailModals } from '../components/trip/TripDetailModals';
import { TripExportModal } from '../components/trip/TripExportModal';
import { TripVariantProvider } from '../contexts/TripVariantContext';
import { useAuth } from '../hooks/useAuth';
import { useDemoMode } from '../hooks/useDemoMode';
import { proTripMockData } from '../data/proTripMockData';
import { ProTripNotFound } from '../components/pro/ProTripNotFound';
import { ExportSection } from '../types/tripExport';

import { ProTripCategory } from '../types/proCategories';

const ProTripDetail = () => {
  const { proTripId } = useParams<{ proTripId?: string }>();
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

  // Gate demo content
  if (!isDemoMode) {
    return (
      <ProTripNotFound 
        message="Demo Mode is disabled"
        details="Turn on Demo Mode to view sample professional trips and explore all features."
      />
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
        `https://jmjiyekmxwsxkfnqwyaa.supabase.co/functions/v1/export-trip?tripId=${proTripId}&${params}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tripId: proTripId,
            sections,
            layout,
            privacyRedaction,
            paper,
            // Pass trip data from frontend (for mock trips that don't exist in DB)
            tripData: {
              title: tripData.title,
              destination: tripData.location,
              startDate: tripData.dateRange,
              endDate: '',
              description: tripData.description,
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
      a.download = `Trip_${tripData.title.replace(/[^a-z0-9]/gi, '_')}_${layout}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
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

        <TripHeader
          trip={{
            id: parseInt(tripData.id) || 0,
            title: tripData.title,
            location: tripData.location,
            dateRange: tripData.dateRange,
            description: tripData.description || '',
            participants: tripData.participants,
            trip_type: 'pro'
          }}
          category={tripData.proTripCategory as ProTripCategory}
          tags={tripData.tags}
          onCategoryChange={() => {}}
          onShowExport={() => setShowExportModal(true)}
        />

        <ProTripDetailContent
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onShowTripsPlusModal={() => setShowTripsPlusModal(true)}
          tripId={proTripId}
          basecamp={basecamp}
          tripData={tripData}
          selectedCategory={tripData.proTripCategory as ProTripCategory}
        />

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

        {/* Export Modal */}
        <TripExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
          tripName={tripData.title}
          tripId={proTripId || 'unknown'}
        />
      </div>
    </TripVariantProvider>
  );
};

export default ProTripDetail;
