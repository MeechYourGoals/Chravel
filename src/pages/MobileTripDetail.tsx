import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Info } from 'lucide-react';
import { MobileTripTabs } from '../components/mobile/MobileTripTabs';
import { MobileErrorBoundary } from '../components/mobile/MobileErrorBoundary';
import { MobileTripInfoDrawer } from '../components/mobile/MobileTripInfoDrawer';
import { MobileHeaderOptionsSheet } from '../components/mobile/MobileHeaderOptionsSheet';
import { TripExportModal } from '../components/trip/TripExportModal';
import { InviteModal } from '../components/InviteModal';
import { useAuth } from '../hooks/useAuth';
import { useKeyboardHandler } from '../hooks/useKeyboardHandler';
import { hapticService } from '../services/hapticService';
import { useTrips } from '../hooks/useTrips';
import { useDemoMode } from '../hooks/useDemoMode';
import { useTripMembers } from '../hooks/useTripMembers';
import { convertSupabaseTripsToMock } from '../utils/tripConverter';
import { tripsData, generateTripMockData } from '../data/tripsData';
import { ExportSection } from '../types/tripExport';
import { openOrDownloadBlob } from '../utils/download';
import { demoModeService } from '../services/demoModeService';
import { toast } from 'sonner';

export const MobileTripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode, isLoading: demoModeLoading } = useDemoMode();

  // ✅ FIXED: Always call useTrips hook (Rules of Hooks requirement)
  // The hook handles demo mode internally, returning empty arrays when in demo mode
  const { trips: userTrips, loading: tripsLoading } = useTrips();

  // 🔄 CRITICAL FIX: Fetch real trip members from database for authenticated trips
  const { tripMembers, loading: membersLoading } = useTripMembers(tripId);

  // Persist activeTab in sessionStorage to survive orientation changes
  const getInitialTab = () => {
    if (typeof window === 'undefined') return 'chat';
    const storedTab = sessionStorage.getItem(`trip_${tripId}_activeTab`);
    return storedTab || 'chat';
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [tripDescription, setTripDescription] = useState<string>('');
  const [showTripInfo, setShowTripInfo] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showOptionsSheet, setShowOptionsSheet] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const headerRef = React.useRef<HTMLDivElement>(null);

  // Persist activeTab changes to sessionStorage
  React.useEffect(() => {
    if (tripId) {
      sessionStorage.setItem(`trip_${tripId}_activeTab`, activeTab);
    }
  }, [activeTab, tripId]);
 
  // Keyboard handling for mobile inputs
  useKeyboardHandler({
    preventZoom: true,
    adjustViewport: true
  });

  // ✅ CRITICAL FIX: Get trip data BEFORE any early returns (Rules of Hooks)
  const allTrips = isDemoMode ? tripsData : convertSupabaseTripsToMock(userTrips);
  const trip = allTrips.find(t => String(t.id) === tripId);

  // ✅ CRITICAL FIX: ALL useEffect hooks MUST be called before any early returns
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
  
  // ✅ CRITICAL FIX: ALL useMemo hooks MUST be called before any early returns
  // 🔄 MOBILE FIX: Merge real trip members for authenticated trips (matching desktop behavior)
  const tripWithUpdatedDescription = React.useMemo(() => {
    if (!trip) return null;
    return {
      ...trip,
      description: tripDescription || trip.description,
      // Merge real trip members for authenticated trips instead of empty array
      participants: isDemoMode
        ? trip.participants
        : tripMembers.map(m => ({
            id: m.id as any, // UUID strings for authenticated trips
            name: m.name,
            avatar: m.avatar || '',
            role: 'member'
          })) as any
    };
  }, [trip, tripDescription, isDemoMode, tripMembers]);

  const mockData = React.useMemo(() => {
    if (!trip) return null;
    return generateTripMockData(trip);
  }, [trip]);
  
  const basecamp = mockData?.basecamp;

  // PDF Export handler - same logic as TripCard
  const handleExport = useCallback(async (sections: ExportSection[]) => {
    const tripIdStr = tripId || '1';
    const isNumericId = !tripIdStr.includes('-');
    
    toast.info('Generating PDF', {
      description: `Creating summary for "${tripWithUpdatedDescription?.title || 'Trip'}"...`,
    });

    try {
      let blob: Blob;

      if (isDemoMode || isNumericId) {
        // Demo mode - use mock data
        const mockPayments = demoModeService.getMockPayments(tripIdStr);
        const mockPolls = demoModeService.getMockPolls(tripIdStr);
        const mockTasks = demoModeService.getMockTasks(tripIdStr);
        const mockPlaces = demoModeService.getMockPlaces(tripIdStr);
        
        const { generateClientPDF } = await import('../utils/exportPdfClient');
        blob = await generateClientPDF(
          {
            tripId: tripIdStr,
            tripTitle: tripWithUpdatedDescription?.title || 'Trip',
            destination: tripWithUpdatedDescription?.location,
            dateRange: tripWithUpdatedDescription?.dateRange,
            calendar: sections.includes('calendar') ? [] : undefined,
            payments: sections.includes('payments') && mockPayments.length > 0 ? {
              items: mockPayments,
              total: mockPayments.reduce((sum, p) => sum + p.amount, 0),
              currency: mockPayments[0]?.currency || 'USD'
            } : undefined,
            polls: sections.includes('polls') ? mockPolls : undefined,
            tasks: sections.includes('tasks') ? mockTasks.map(task => ({
              title: task.title,
              description: task.description,
              completed: task.completed
            })) : undefined,
            places: sections.includes('places') ? mockPlaces : undefined,
          },
          sections,
          { customization: { compress: true, maxItemsPerSection: 100 } }
        );
      } else {
        // Authenticated mode - fetch real data from Supabase
        const { getExportData } = await import('../services/tripExportDataService');
        const realData = await getExportData(tripIdStr, sections);
        
        if (!realData) {
          throw new Error('Could not fetch trip data for export');
        }
        
        const { generateClientPDF } = await import('../utils/exportPdfClient');
        blob = await generateClientPDF(
          {
            tripId: tripIdStr,
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
          { customization: { compress: true, maxItemsPerSection: 100 } }
        );
      }

      // Generate filename
      const sanitizedTitle = (tripWithUpdatedDescription?.title || 'Trip').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Trip_${sanitizedTitle}_${Date.now()}.pdf`;

      // Use iOS-compatible download
      await openOrDownloadBlob(blob, filename, { mimeType: 'application/pdf' });

      toast.success('Export complete', {
        description: `PDF ready: ${filename}`,
      });
    } catch (error) {
      console.error('[MobileTripDetail Export] Error:', error);
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.',
      });
      throw error;
    }
  }, [tripId, tripWithUpdatedDescription, isDemoMode]);

  // Share Trip handler - uses native Web Share API with clipboard fallback
  const handleShare = useCallback(async () => {
    if (!tripWithUpdatedDescription) return;

    const previewLink = `https://p.chravel.app/t/${encodeURIComponent(String(tripId))}`;
    const shareText = `Check out ${tripWithUpdatedDescription.title} - a trip to ${tripWithUpdatedDescription.location}! ${tripWithUpdatedDescription.participants.length} Chravelers are going.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: tripWithUpdatedDescription.title,
          text: shareText,
          url: previewLink
        });
        toast.success('Share sheet opened');
      } catch (error) {
        // User cancelled or error - only show error if not abort
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
          // Fallback to copy
          try {
            await navigator.clipboard.writeText(previewLink);
            toast.success('Share link copied to clipboard');
          } catch {
            toast.error('Failed to share');
          }
        }
      }
    } else {
      // Fallback to clipboard copy
      try {
        await navigator.clipboard.writeText(previewLink);
        toast.success('Share link copied to clipboard');
      } catch {
        toast.error('Failed to copy share link');
      }
    }
  }, [tripId, tripWithUpdatedDescription]);

  if (demoModeLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing...</p>
        </div>
      </div>
    );
  }
  
  // Show loading state while fetching trips
  if (tripsLoading && !isDemoMode) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trip...</p>
        </div>
      </div>
    );
  }

  // Handle missing trip - check after data loaded
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


  const handleBack = () => {
    hapticService.light();
    navigate('/');
  };

  const handleTabChange = (tab: string) => {
    hapticService.light();
    setActiveTab(tab);
  };

  return (
    <MobileErrorBoundary>
      <div className="flex flex-col min-h-screen bg-black">
      {/* Mobile Header - Sticky with iOS safe area */}
      <div
        ref={headerRef}
        className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-white/10 mobile-safe-header"
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handleBack}
              className="min-w-[44px] min-h-[44px] p-3 -ml-2 active:scale-95 transition-transform touch-manipulation flex items-center justify-center"
              style={{ touchAction: 'manipulation' }}
            >
              <ArrowLeft size={24} className="text-white" />
            </button>
            
            <button
              onClick={() => {
                hapticService.light();
                setShowOptionsSheet(true);
              }}
              className="min-w-[44px] min-h-[44px] p-3 -mr-2 active:scale-95 transition-transform touch-manipulation flex items-center justify-center"
              style={{ touchAction: 'manipulation' }}
            >
              <MoreVertical size={24} className="text-white" />
            </button>
          </div>
          
          <div className="text-center px-2">
            <h1 className="text-lg font-semibold text-white leading-tight mb-1.5 break-words">
              {tripWithUpdatedDescription.title}
            </h1>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <span>{tripWithUpdatedDescription.location} • {tripWithUpdatedDescription.participants.length} Chravelers</span>
              <button
                onClick={() => {
                  hapticService.light();
                  setShowTripInfo(true);
                }}
                className="flex items-center gap-1 active:scale-95 transition-transform text-blue-400 hover:text-blue-300"
                aria-label="View trip details"
              >
                <Info size={16} />
                <span className="font-medium">More Details</span>
              </button>
            </div>
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
        onShowExport={() => {
          setShowTripInfo(false);
          // Delay to let drawer close before opening modal
          setTimeout(() => setShowExportModal(true), 200);
        }}
      />

      {/* Options Sheet (Three-dot menu) */}
      <MobileHeaderOptionsSheet
        isOpen={showOptionsSheet}
        onClose={() => setShowOptionsSheet(false)}
        tripTitle={tripWithUpdatedDescription?.title}
        onShare={handleShare}
        onExport={() => setShowExportModal(true)}
        onInvite={() => setShowInviteModal(true)}
      />

      {/* Export Modal */}
      <TripExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        tripName={tripWithUpdatedDescription?.title || 'Trip'}
        tripId={tripId || '1'}
      />

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        tripName={tripWithUpdatedDescription?.title || 'Trip'}
        tripId={tripId}
      />
      </div>
    </MobileErrorBoundary>
  );
};
