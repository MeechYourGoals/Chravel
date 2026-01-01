import React, { useState, useMemo, useCallback } from 'react';
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
import { useTrips } from '../hooks/useTrips';
import { useTripMembers } from '../hooks/useTripMembers';
import { convertSupabaseTripToEvent } from '../utils/tripConverter';
import { eventsMockData } from '../data/eventsMockData';
import { ExportSection } from '../types/tripExport';
import { openOrDownloadBlob } from '../utils/download';
import { orderExportSections } from '../utils/exportSectionOrder';
import { demoModeService } from '../services/demoModeService';
import { toast } from 'sonner';

export const MobileEventDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode, isLoading: demoModeLoading } = useDemoMode();

  // ✅ FIXED: Always call useTrips hook (Rules of Hooks requirement)
  const { trips: userTrips, loading: tripsLoading } = useTrips();

  // 🔄 CRITICAL FIX: Fetch real trip members from database for authenticated trips
  const { tripMembers, loading: membersLoading } = useTripMembers(eventId);

  // Persist activeTab in sessionStorage to survive orientation changes
  const getInitialTab = () => {
    if (typeof window === 'undefined') return 'chat';
    const storedTab = sessionStorage.getItem(`event_${eventId}_activeTab`);
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
    if (eventId) {
      sessionStorage.setItem(`event_${eventId}_activeTab`, activeTab);
    }
  }, [activeTab, eventId]);
 
  // Keyboard handling for mobile inputs
  useKeyboardHandler({
    preventZoom: true,
    adjustViewport: true
  });

  // ✅ Calculate eventData with useMemo - MUST be before any conditional returns
  const eventData = useMemo(() => {
    if (!eventId) return null;
    
    if (isDemoMode) {
      return eventsMockData[eventId] || null;
    }
    
    // Authenticated mode: find event from user's trips (Supabase data)
    const eventTrip = userTrips?.find(t => t.id === eventId && t.trip_type === 'event');
    if (!eventTrip) return null;
    
    // Convert Supabase trip to full EventData format
    return convertSupabaseTripToEvent(eventTrip);
  }, [eventId, isDemoMode, userTrips]);

  // Set trip description when eventData loads
  React.useEffect(() => {
    if (eventData && !tripDescription) {
      setTripDescription(eventData.description || '');
    }
  }, [eventData, tripDescription]);
  
  // Measure header height and expose as CSS var for sticky offsets
  React.useEffect(() => {
    const setHeaderHeightVar = () => {
      const h = headerRef.current?.offsetHeight || 73;
      document.documentElement.style.setProperty('--mobile-header-h', `${h}px`);
    };
    const debounce = (fn: () => void, delay = 100) => {
      let t: ReturnType<typeof setTimeout>;
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

  // PDF Export handler
  const handleExport = useCallback(async (sections: ExportSection[]) => {
    const orderedSections = orderExportSections(sections);
    const tripIdStr = eventId || '1';
    const isNumericId = !tripIdStr.includes('-');
    
    toast.info('Creating Recap', {
      description: `Building your event memories for "${eventData?.title || 'Event'}"...`,
    });

    try {
      let blob: Blob;

      if (isDemoMode || isNumericId) {
        const mockCalendar = demoModeService.getMockCalendarEvents(tripIdStr);
        const mockAttachments = demoModeService.getMockAttachments(tripIdStr);
        const mockPayments = demoModeService.getMockPayments(tripIdStr);
        const mockPolls = demoModeService.getMockPolls(tripIdStr);
        const mockTasks = demoModeService.getMockTasks(tripIdStr);
        const mockPlaces = demoModeService.getMockPlaces(tripIdStr);
        
        const { generateClientPDF } = await import('../utils/exportPdfClient');
        blob = await generateClientPDF(
          {
            tripId: tripIdStr,
            tripTitle: eventData?.title || 'Event',
            destination: eventData?.location,
            dateRange: eventData?.dateRange,
            calendar: orderedSections.includes('calendar') ? mockCalendar : undefined,
            payments: orderedSections.includes('payments') && mockPayments.length > 0 ? {
              items: mockPayments,
              total: mockPayments.reduce((sum, p) => sum + p.amount, 0),
              currency: mockPayments[0]?.currency || 'USD'
            } : undefined,
            polls: orderedSections.includes('polls') ? mockPolls : undefined,
            tasks: orderedSections.includes('tasks') ? mockTasks.map(task => ({
              title: task.title,
              description: task.description,
              completed: task.completed
            })) : undefined,
            places: orderedSections.includes('places') ? mockPlaces : undefined,
            attachments: orderedSections.includes('attachments') ? mockAttachments : undefined,
          },
          orderedSections,
          { customization: { compress: true, maxItemsPerSection: 100 } }
        );
      } else {
        const { getExportData } = await import('../services/tripExportDataService');
        const realData = await getExportData(tripIdStr, orderedSections);
        
        if (!realData) {
          throw new Error('Could not fetch event data for export');
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
          { customization: { compress: true, maxItemsPerSection: 100 } }
        );
      }

      const sanitizedTitle = (eventData?.title || 'Event').replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Event_${sanitizedTitle}_${Date.now()}.pdf`;

      await openOrDownloadBlob(blob, filename, { mimeType: 'application/pdf' });

      toast.success('Recap ready', {
        description: `PDF ready: ${filename}`,
      });
    } catch (error) {
      console.error('[MobileEventDetail Export] Error:', error);
      toast.error('Recap failed', {
        description: error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.',
      });
      throw error;
    }
  }, [eventId, eventData, isDemoMode]);

  // Share Trip handler - uses native Web Share API with clipboard fallback
  const handleShare = useCallback(async () => {
    if (!eventData) return;

    const previewLink = `https://p.chravel.app/t/${encodeURIComponent(String(eventId))}`;
    const shareText = `Check out ${eventData.title} - an event in ${eventData.location}! ${eventData.participants.length} attendees are going.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: eventData.title,
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
  }, [eventId, eventData]);

  // Delete Trip For Me handler - removes user's access without deleting event for others
  const handleDeleteTripForMe = useCallback(async () => {
    if (!user?.id || !eventId) {
      toast.error('You must be logged in to delete an event');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTripForMe(eventId, user.id);
      toast.success('Event deleted', {
        description: `"${eventData?.title}" has been removed from your account.`,
      });
      setShowDeleteDialog(false);
      navigate('/');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage === 'CREATOR_CANNOT_DELETE') {
        toast.error('Cannot delete event', {
          description: 'As the event creator, you cannot delete this event for yourself. Consider archiving it instead.',
        });
      } else {
        toast.error('Failed to delete event', {
          description: 'There was an error deleting your event. Please try again.',
        });
      }
    } finally {
      setIsDeleting(false);
    }
  }, [user?.id, eventId, eventData?.title, navigate]);

  // ⚡ Loading and error states AFTER all hooks
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

  if (!eventId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Not Found</h1>
          <p className="text-gray-400 mb-6">No event ID provided.</p>
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
  
  if (tripsLoading && !isDemoMode) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!eventData) {
    const errorMessage = isDemoMode 
      ? "This demo event doesn't exist."
      : "This event doesn't exist or you don't have access.";
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Event Not Found</h1>
          <p className="text-gray-400 mb-2">{errorMessage}</p>
          {isDemoMode && <p className="text-xs text-gray-500 mb-6">Event ID: {eventId}</p>}
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
  
  // 🔄 MOBILE FIX: Merge real trip members for authenticated trips (matching desktop behavior)
  const trip = {
    id: parseInt(eventId.replace(/\D/g, '') || '1'),
    title: eventData.title,
    location: eventData.location,
    dateRange: eventData.dateRange,
    description: tripDescription || eventData.description || '',
    // Merge real trip members for authenticated trips instead of empty array
    participants: isDemoMode
      ? eventData.participants.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar
        }))
      : tripMembers.map(m => ({
          id: m.id as any, // UUID strings for authenticated trips
          name: m.name,
          avatar: m.avatar || '',
          role: 'member'
        })) as any
  };

  const basecamp = {
    name: 'Event Headquarters',
    address: `${eventData.location}, Main Venue`
  };

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
            
            {/* Event info - centered */}
            <div className="flex-1 min-w-0 text-center">
              <h1 className="text-base font-semibold text-white leading-tight truncate">
                {eventData.title}
              </h1>
              <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                <span className="truncate">{eventData.location} • {eventData.participants.length} attendees</span>
                <button
                  onClick={() => {
                    hapticService.light();
                    setShowTripInfo(true);
                  }}
                  className="flex-shrink-0 flex items-center gap-0.5 active:scale-95 transition-transform text-blue-400 hover:text-blue-300"
                  aria-label="View event details"
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
        tripId={eventId}
        basecamp={basecamp}
        variant="event"
        eventData={eventData}
      />

      {/* Trip Info Drawer */}
      <MobileTripInfoDrawer
        trip={trip}
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
        category={'category' in eventData ? (eventData as any).category : undefined}
      />

      {/* Options Sheet (Three-dot menu) */}
      <MobileHeaderOptionsSheet
        isOpen={showOptionsSheet}
        onClose={() => setShowOptionsSheet(false)}
        tripTitle={eventData?.title}
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
        tripName={eventData?.title || 'Event'}
        tripId={eventId || '1'}
      />

      {/* Invite Modal */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        tripName={eventData?.title || 'Event'}
        tripId={eventId}
      />

      {/* Delete Trip Confirm Dialog */}
      <DeleteTripConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteTripForMe}
        tripTitle={eventData?.title || 'Event'}
        isLoading={isDeleting}
      />
      </div>
    </MobileErrorBoundary>
  );
};
