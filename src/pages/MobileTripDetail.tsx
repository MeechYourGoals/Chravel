import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Info } from 'lucide-react';
import { MobileTripTabs } from '../components/mobile/MobileTripTabs';
import { MobileErrorBoundary } from '../components/mobile/MobileErrorBoundary';
import { MobileTripInfoDrawer } from '../components/mobile/MobileTripInfoDrawer';
import { MobileHeaderOptionsSheet } from '../components/mobile/MobileHeaderOptionsSheet';
import { TripExportModal } from '../components/trip/TripExportModal';
import { InviteModal } from '../components/InviteModal';
import { DeleteTripConfirmDialog } from '../components/DeleteTripConfirmDialog';
import { deleteTripForMe } from '../services/archiveService';
import { useAuth } from '../hooks/useAuth';
import { useKeyboardHandler } from '../hooks/useKeyboardHandler';
import { hapticService } from '../services/hapticService';
import { useDemoMode } from '../hooks/useDemoMode';
import { useTripMembers } from '../hooks/useTripMembers';
import { getTripById, generateTripMockData, Trip as MockTrip } from '../data/tripsData';
import { tripService } from '../services/tripService';
import { convertSupabaseTripToMock } from '../utils/tripConverter';
import { ExportSection } from '../types/tripExport';
import { openOrDownloadBlob } from '../utils/download';
import { orderExportSections } from '../utils/exportSectionOrder';
import { demoModeService } from '../services/demoModeService';
import { toast } from 'sonner';

export const MobileTripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();

  // ⚡ PERFORMANCE: Load ONLY the single trip we need (not all trips)
  const [trip, setTrip] = useState<MockTrip | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔄 CRITICAL FIX: Fetch real trip members from database for authenticated trips
  const { tripMembers } = useTripMembers(tripId);

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
    adjustViewport: true,
  });

  // ⚡ PERFORMANCE: Load ONLY this trip (not all trips) - matching desktop pattern
  // Parallelized fetch for trip + members (members handled by useTripMembers hook)
  React.useEffect(() => {
    const loadTrip = async () => {
      if (!tripId) {
        setTrip(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      if (isDemoMode) {
        // 🎭 DEMO MODE: Use mock data only - instant load, NO network
        const tripIdNum = parseInt(tripId, 10);

        if (Number.isNaN(tripIdNum)) {
          toast.error('Invalid trip ID format for demo mode');
          setTrip(null);
          setLoading(false);
          return;
        }

        const mockTrip = getTripById(tripIdNum);
        if (!mockTrip) {
          toast.error(`Demo trip ${tripId} not found. Available trips: 1-12`);
        }
        setTrip(mockTrip || null);
        setLoading(false);
        return;
      }
      
      // 🔐 AUTHENTICATED MODE: Query Supabase for single trip
      // Note: useTripMembers hook fetches members in parallel automatically
      try {
        const realTrip = await tripService.getTripById(tripId);
        if (realTrip) {
          setTrip(convertSupabaseTripToMock(realTrip));
        } else {
          setTrip(null);
        }
      } catch (error) {
        console.error('[MobileTripDetail] Failed to load trip:', error);
        setTrip(null);
      }
      setLoading(false);
    };

    loadTrip();
  }, [tripId, isDemoMode]);

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
        : (tripMembers.map(m => ({
            id: m.id as any, // UUID strings for authenticated trips
            name: m.name,
            avatar: m.avatar || '',
            role: 'member',
          })) as any),
    };
  }, [trip, tripDescription, isDemoMode, tripMembers]);

  const mockData = React.useMemo(() => {
    if (!trip) return null;
    return generateTripMockData(trip);
  }, [trip]);

  const basecamp = mockData?.basecamp;

  // PDF Export handler - same logic as TripCard
  const handleExport = useCallback(
    async (sections: ExportSection[]) => {
      const orderedSections = orderExportSections(sections);
      const tripIdStr = tripId || '1';
      const isNumericId = !tripIdStr.includes('-');

      toast.info('Creating Recap', {
        description: `Building your trip memories for "${tripWithUpdatedDescription?.title || 'Trip'}"...`,
      });

      try {
        let blob: Blob;

        if (isDemoMode || isNumericId) {
          const mockCalendar = demoModeService.getMockCalendarEvents(tripIdStr);
          const mockAttachments = demoModeService.getMockAttachments(tripIdStr);
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
              calendar: orderedSections.includes('calendar') ? mockCalendar : undefined,
              payments:
                orderedSections.includes('payments') && mockPayments.length > 0
                  ? {
                      items: mockPayments,
                      total: mockPayments.reduce((sum, p) => sum + p.amount, 0),
                      currency: mockPayments[0]?.currency || 'USD',
                    }
                  : undefined,
              polls: orderedSections.includes('polls') ? mockPolls : undefined,
              tasks: orderedSections.includes('tasks')
                ? mockTasks.map(task => ({
                    title: task.title,
                    description: task.description,
                    completed: task.completed,
                  }))
                : undefined,
              places: orderedSections.includes('places') ? mockPlaces : undefined,
              attachments: orderedSections.includes('attachments') ? mockAttachments : undefined,
            },
            orderedSections,
            { customization: { compress: true, maxItemsPerSection: 100 } },
          );
        } else {
          // Authenticated mode - fetch real data from Supabase
          const { getExportData } = await import('../services/tripExportDataService');
          const realData = await getExportData(tripIdStr, orderedSections);

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
              attachments: realData.attachments,
            },
            orderedSections,
            { customization: { compress: true, maxItemsPerSection: 100 } },
          );
        }

        // Generate filename
        const sanitizedTitle = (tripWithUpdatedDescription?.title || 'Trip').replace(
          /[^a-zA-Z0-9]/g,
          '_',
        );
        const filename = `Trip_${sanitizedTitle}_${Date.now()}.pdf`;

        // Use iOS-compatible download
        await openOrDownloadBlob(blob, filename, { mimeType: 'application/pdf' });

        toast.success('Recap ready', {
          description: `PDF ready: ${filename}`,
        });
      } catch (error) {
        console.error('[MobileTripDetail Export] Error:', error);
        toast.error('Recap failed', {
          description:
            error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.',
        });
        throw error;
      }
    },
    [tripId, tripWithUpdatedDescription, isDemoMode],
  );

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
          url: previewLink,
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

  // Delete Trip For Me handler - removes user's access without deleting trip for others
  const handleDeleteTripForMe = useCallback(async () => {
    if (!user?.id || !tripId) {
      toast.error('You must be logged in to delete a trip');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTripForMe(tripId, user.id);
      toast.success('Trip deleted', {
        description: `"${tripWithUpdatedDescription?.title}" has been removed from your account.`,
      });
      setShowDeleteDialog(false);
      navigate('/');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage === 'CREATOR_CANNOT_DELETE') {
        toast.error('Cannot delete trip', {
          description:
            'As the trip creator, you cannot delete this trip for yourself. Consider archiving it instead.',
        });
      } else {
        toast.error('Failed to delete trip', {
          description: 'There was an error deleting your trip. Please try again.',
        });
      }
    } finally {
      setIsDeleting(false);
    }
  }, [user?.id, tripId, tripWithUpdatedDescription?.title, navigate]);

  // ⚡ PERFORMANCE: Show skeleton UI for perceived instant load
  // This provides immediate visual feedback while data loads
  if (loading) {
    return (
      <MobileErrorBoundary>
        <div className="flex flex-col min-h-screen bg-black">
          {/* Skeleton Header */}
          <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-md border-b border-white/10 mobile-safe-header">
            <div className="px-4 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="w-[44px] h-[44px] rounded-full bg-white/10 animate-pulse" />
                <div className="flex-1 min-w-0 text-center space-y-1.5">
                  <div className="h-4 bg-white/10 rounded w-32 mx-auto animate-pulse" />
                  <div className="h-3 bg-white/10 rounded w-24 mx-auto animate-pulse" />
                </div>
                <div className="w-[44px] h-[44px] rounded-full bg-white/10 animate-pulse" />
              </div>
            </div>
          </div>
          {/* Skeleton Tabs */}
          <div className="sticky z-40 bg-black/95 backdrop-blur-md border-b border-white/10 py-2 px-4">
            <div className="flex gap-2 overflow-hidden">
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="h-[44px] w-20 rounded-lg bg-white/10 animate-pulse flex-shrink-0"
                />
              ))}
            </div>
          </div>
          {/* Skeleton Content */}
          <div className="flex-1 p-4 space-y-3">
            <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
          </div>
        </div>
      </MobileErrorBoundary>
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
          <div className="px-4 py-2">
            <div className="flex items-center justify-between gap-2">
              {/* Back button */}
              <button
                onClick={handleBack}
                className="flex-shrink-0 min-w-[44px] min-h-[44px] p-2 -ml-2 active:scale-95 transition-transform touch-manipulation flex items-center justify-center"
                style={{ touchAction: 'manipulation' }}
              >
                <ArrowLeft size={22} className="text-white" />
              </button>

              {/* Trip info - centered */}
              <div className="flex-1 min-w-0 text-center">
                <h1 className="text-base font-semibold text-white leading-tight truncate">
                  {tripWithUpdatedDescription.title}
                </h1>
                <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                  <span className="truncate">
                    {tripWithUpdatedDescription.location} •{' '}
                    {tripWithUpdatedDescription.participants.length} Chravelers
                  </span>
                  <button
                    onClick={() => {
                      hapticService.light();
                      setShowTripInfo(true);
                    }}
                    className="flex-shrink-0 flex items-center gap-0.5 active:scale-95 transition-transform text-blue-400 hover:text-blue-300"
                    aria-label="View trip details"
                  >
                    <Info size={14} />
                    <span className="font-medium">More</span>
                  </button>
                </div>
              </div>

              {/* Options button */}
              <button
                onClick={() => {
                  hapticService.light();
                  setShowOptionsSheet(true);
                }}
                className="flex-shrink-0 min-w-[44px] min-h-[44px] p-2 -mr-2 active:scale-95 transition-transform touch-manipulation flex items-center justify-center"
                style={{ touchAction: 'manipulation' }}
              >
                <MoreVertical size={22} className="text-white" />
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
          onDelete={() => setShowDeleteDialog(true)}
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

        {/* Delete Trip Confirm Dialog */}
        <DeleteTripConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDeleteTripForMe}
          tripTitle={tripWithUpdatedDescription?.title || 'Trip'}
          isLoading={isDeleting}
        />
      </div>
    </MobileErrorBoundary>
  );
};
