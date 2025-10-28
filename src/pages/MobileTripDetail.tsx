import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Info, FileText } from 'lucide-react';
import { MobileTripTabs } from '../components/mobile/MobileTripTabs';
import { MobileErrorBoundary } from '../components/mobile/MobileErrorBoundary';
import { MobileTripInfoDrawer } from '../components/mobile/MobileTripInfoDrawer';
import { TripExportModal } from '../components/trip/TripExportModal';
import { useAuth } from '../hooks/useAuth';
import { useKeyboardHandler } from '../hooks/useKeyboardHandler';
import { hapticService } from '../services/hapticService';
import { supabase } from '../integrations/supabase/client';
import { generateTripPDF } from '../utils/pdfGenerator';
import { ExportSection } from '../types/tripExport';
import {
  buildCalendarSection,
  buildPaymentsSection,
  buildPollsSection,
  buildPlacesSection,
  buildTasksSection,
} from '../utils/exportSectionBuilders';

import { getTripById, generateTripMockData } from '../data/tripsData';

export const MobileTripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');
  const [tripDescription, setTripDescription] = useState<string>('');
  const [showTripInfo, setShowTripInfo] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const headerRef = React.useRef<HTMLDivElement>(null);
 
  // Keyboard handling for mobile inputs
  useKeyboardHandler({
    preventZoom: true,
    adjustViewport: true
  });

  // Get trip data
  const tripIdNum = tripId ? parseInt(tripId, 10) : null;
  const trip = tripIdNum ? getTripById(tripIdNum) : null;
  
  React.useEffect(() => {
    if (trip && !tripDescription) {
      setTripDescription(trip.description);
    }
  }, [trip, tripDescription]);
  
  // Measure header height and expose as CSS var for sticky offsets
  React.useEffect(() => {
    const setHeaderHeightVar = () => {
      const h = headerRef.current?.offsetHeight || 73;
      document.documentElement.style.setProperty('--mobile-header-h', `${h}px`);
    };
    const debounce = (fn: () => void, delay = 100) => {
      let t: any;
      return () => {
        clearTimeout(t);
        t = setTimeout(fn, delay);
      };
    };
    const handler = debounce(setHeaderHeightVar, 100);
    setHeaderHeightVar();
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler);
    };
  }, []);
  
  const tripWithUpdatedDescription = trip ? {
    ...trip,
    description: tripDescription || trip.description
  } : null;
  
  if (!tripWithUpdatedDescription) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Trip Not Found</h1>
          <p className="text-gray-400 mb-6">The trip you're looking for doesn't exist.</p>
          <button
            onClick={() => {
              hapticService.light();
              navigate('/');
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl transition-colors active:scale-95"
          >
            Back to My Trips
          </button>
        </div>
      </div>
    );
  }

  const mockData = generateTripMockData(trip);
  const basecamp = mockData.basecamp;

  const handleBack = () => {
    hapticService.light();
    navigate('/');
  };

  const handleTabChange = (tab: string) => {
    hapticService.light();
    setActiveTab(tab);
  };

  const handleExportPDF = async (
    sections: ExportSection[], 
    layout: 'onepager' | 'pro', 
    privacyRedaction: boolean, 
    paper: 'letter' | 'a4'
  ) => {
    try {
      // Mock mode check
      const isDemoMode = !user;

      if (isDemoMode) {
        // Generate demo data
        const formattedSections = [];

        if (sections.includes('calendar')) {
          formattedSections.push(buildCalendarSection([
            {
              id: 'demo-event-1',
              trip_id: tripId || '1',
              title: 'Welcome Dinner',
              description: 'Group dinner at hotel restaurant',
              start_time: new Date().toISOString(),
              end_time: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
              location: tripWithUpdatedDescription.location,
              created_by: 'demo',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              version: 1,
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
            name: tripWithUpdatedDescription.title,
            description: tripWithUpdatedDescription.description,
            destination: tripWithUpdatedDescription.location,
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
            layout: layout,
            privacyRedaction: privacyRedaction,
            paper: paper,
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

  return (
    <MobileErrorBoundary>
      <div className="flex flex-col min-h-screen bg-black">
      {/* Mobile Header - Sticky */}
      <div ref={headerRef} className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 active:scale-95 transition-transform"
          >
            <ArrowLeft size={24} className="text-white" />
          </button>
          
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold text-white truncate px-2">
              {trip.title}
            </h1>
            <p className="text-xs text-gray-400 truncate px-2">
              {trip.location} • {trip.participants.length} travelers
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                hapticService.light();
                setShowExportModal(true);
              }}
              className="p-2 active:scale-95 transition-transform"
              title="Export PDF"
            >
              <FileText size={20} className="text-white" />
            </button>
            <button
              onClick={() => {
                hapticService.light();
                setShowTripInfo(true);
              }}
              className="flex items-center gap-1.5 p-2 active:scale-95 transition-transform md:hidden"
            >
              <Info size={20} className="text-white" />
              <span className="text-sm text-white font-medium">More details</span>
            </button>
            <button
              onClick={() => hapticService.light()}
              className="p-2 -mr-2 active:scale-95 transition-transform"
            >
              <MoreVertical size={24} className="text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Tabs - Swipeable */}
      <MobileTripTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tripId={tripId || '1'}
        basecamp={basecamp}
      />

      {/* Trip Info Drawer */}
      <MobileTripInfoDrawer
        trip={tripWithUpdatedDescription}
        isOpen={showTripInfo}
        onClose={() => {
          hapticService.light();
          setShowTripInfo(false);
        }}
        onDescriptionUpdate={setTripDescription}
      />

      {/* Export PDF Modal */}
      <TripExportModal
        isOpen={showExportModal}
        onClose={() => {
          hapticService.light();
          setShowExportModal(false);
        }}
        onExport={handleExportPDF}
        tripName={tripWithUpdatedDescription.title}
        tripId={tripId || ''}
      />
      </div>
    </MobileErrorBoundary>
  );
};
