import React, { useState, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { MessageInbox } from '../components/MessageInbox';
import { TripDetailHeader } from '../components/trip/TripDetailHeader';
import { TripDetailModals } from '../components/trip/TripDetailModals';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor';

// 🚀 OPTIMIZATION: Lazy load heavy components for faster initial render
const TripHeader = lazy(() =>
  import('../components/TripHeader').then(module => ({
    default: module.TripHeader,
  })),
);

const TripDetailContent = lazy(() =>
  import('../components/trip/TripDetailContent').then(module => ({
    default: module.TripDetailContent,
  })),
);

import { TripExportModal } from '../components/trip/TripExportModal';
import { useAuth } from '../hooks/useAuth';
import { generateTripMockData, Trip as MockTrip } from '../data/tripsData';
import { useTripMembers } from '../hooks/useTripMembers';
import { useTripDetailData } from '../hooks/useTripDetailData';
import { Message } from '../types/messages';
import { ExportSection } from '../types/tripExport';
import { openOrDownloadBlob } from '../utils/download';
import { orderExportSections } from '../utils/exportSectionOrder';
import { toast } from 'sonner';
import { demoModeService } from '../services/demoModeService';
import { useDemoMode } from '../hooks/useDemoMode';
import { useQueryClient } from '@tanstack/react-query';
import { tripKeys } from '@/lib/queryKeys';

/**
 * TripDetailDesktop Component
 *
 * 🖥️ Desktop-only implementation of trip detail page
 * 🔒 ALL hooks are called unconditionally at the top (Rules of Hooks compliant)
 * 🎯 Demo mode uses ONLY mock data from tripsData.ts
 * 🔄 Authenticated mode queries Supabase via TanStack Query
 */
export const TripDetailDesktop = () => {
  usePerformanceMonitor('TripDetailDesktop');
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();

  // ⚡ PERFORMANCE: Use unified hook for parallel data fetching with TanStack Query cache
  // 🔄 FIX: Also get isMembersLoading to prevent "0 members" flash during loading
  // 🔒 FIX: Get tripError/membersError/isAuthLoading to distinguish errors from not-found
  const {
    trip,
    tripMembers,
    tripCreatorId,
    isLoading: loading,
    isMembersLoading,
    isAuthLoading,
    tripError,
  } = useTripDetailData(tripId);

  // 🔄 Keep useTripMembers for member management actions (canRemoveMembers, removeMember, leaveTrip)
  const { canRemoveMembers, removeMember, leaveTrip } = useTripMembers(tripId);

  // State hooks - all called unconditionally
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
  // ⚡ PERFORMANCE: Trip data now loaded via useTripDetailData hook with TanStack Query
  // This enables cache hits from prefetching and progressive rendering

  // Initialize description state when trip is loaded
  React.useEffect(() => {
    if (trip && !tripDescription) {
      setTripDescription(trip.description);
    }
  }, [trip, tripDescription]);

  // Auto-scroll to chat on page load for desktop
  React.useEffect(() => {
    if (!loading && trip) {
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
  }, [loading, trip]);

  // 🔒 FIX: REMOVED dangerous cache cleanup on unmount
  // This was causing race conditions where queries were removed during navigation.
  // React Query's built-in garbage collection handles cache cleanup safely.
  // Keeping this comment for documentation.

  // Handle trip updates from edit modal
  const handleTripUpdate = (updates: Partial<MockTrip>) => {
    setTripData(prev => ({ ...prev, ...updates }));

    // Update specific states for backward compatibility
    if (updates.title) setTripData(prev => ({ ...prev, title: updates.title }));
    if (updates.description) setTripDescription(updates.description);
  };

  // ⚡ OPTIMIZATION: Memoize trip data to prevent regeneration on every render
  // 🔄 CRITICAL FIX: Merge real trip members for authenticated trips
  // 🔄 FIX: For authenticated trips, trip.participants is always [] (loaded separately via trip_members)
  // So we must use tripMembers directly and rely on loading state to prevent "0" flash
  const tripWithUpdatedData = React.useMemo(() => {
    if (!trip) return null;

    // For demo mode, trip.participants is populated from static mock data
    // For authenticated mode, participants come from tripMembers (trip.participants is always [])
    const resolvedParticipants = isDemoMode
      ? trip.participants
      : tripMembers.map(m => ({
          id: m.id as string | number,
          name: m.name,
          avatar: m.avatar || '',
          role: 'member',
        }));

    return {
      ...trip,
      title: tripData.title || trip.title,
      location: tripData.location || trip.location,
      dateRange: tripData.dateRange || trip.dateRange,
      description: tripDescription || trip.description,
      participants: resolvedParticipants,
    };
  }, [
    trip,
    tripData.title,
    tripData.location,
    tripData.dateRange,
    tripDescription,
    isDemoMode,
    tripMembers,
  ]);

  // Generate dynamic mock data based on the trip - MEMOIZED for performance
  const mockData = React.useMemo(() => {
    if (!tripWithUpdatedData) {
      return null;
    }
    return generateTripMockData(tripWithUpdatedData);
  }, [tripWithUpdatedData]);

  const basecamp = mockData?.basecamp;

  // ⚡ OPTIMIZATION: Memoize trip context to prevent child re-renders
  // 🔄 PHASE 3: Merge real trip_members into participants for authenticated trips
  const tripContext = React.useMemo(() => {
    // Derive values from mockData inside useMemo to prevent re-render cycles
    const mockBroadcasts = mockData?.broadcasts ?? [];
    const mockLinks = mockData?.links ?? [];
    const mockItinerary = mockData?.itinerary ?? [];

    return {
      id: tripId || '1',
      title: tripWithUpdatedData?.title ?? '',
      location: tripWithUpdatedData?.location ?? '',
      dateRange: tripWithUpdatedData?.dateRange ?? '',
      basecamp,
      calendar: mockItinerary,
      broadcasts: mockBroadcasts,
      links: mockLinks,
      messages: [] as Message[], // Messages handled by unified messaging service
      collaborators: isDemoMode
        ? (tripWithUpdatedData?.participants ?? [])
        : tripMembers.map(m => ({ id: m.id, name: m.name, avatar: m.avatar })),
      itinerary: mockItinerary,
      isPro: false,
    };
  }, [tripId, tripWithUpdatedData, basecamp, mockData, isDemoMode, tripMembers]);

  // ⚡ OPTIMIZATION: Show skeleton UI for perceived instant load
  // 🔒 CRITICAL: Show skeleton during auth loading OR trip loading (not "Trip Not Found")
  // Don't block on members loading - show trip immediately, members load in background
  if (loading || isAuthLoading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-6 py-4 pb-8 max-w-7xl">
          {/* Skeleton Header Navigation */}
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 w-32 bg-white/10 rounded-lg animate-pulse" />
            <div className="flex gap-2">
              <div className="h-10 w-10 bg-white/10 rounded-full animate-pulse" />
              <div className="h-10 w-10 bg-white/10 rounded-full animate-pulse" />
            </div>
          </div>
          {/* Skeleton Cover Photo */}
          <div className="mb-8 animate-pulse">
            <div className="h-64 bg-white/5 rounded-3xl mb-4" />
            <div className="h-8 bg-white/5 rounded w-1/3 mb-2" />
            <div className="h-4 bg-white/5 rounded w-1/4" />
          </div>
          {/* Skeleton Tabs */}
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-10 w-24 bg-white/10 rounded-xl animate-pulse" />
            ))}
          </div>
          {/* Skeleton Content */}
          <div className="space-y-4">
            <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-20 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // 🔒 FIX: Handle AUTH_REQUIRED error - show "Please log in" instead of "Trip Not Found"
  if (tripError?.message === 'AUTH_REQUIRED') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <LogIn className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">Please Log In</h1>
          <p className="text-gray-400 mb-6">You need to be signed in to view this trip.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate(`/auth?mode=signin&returnTo=/trip/${tripId}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 🔒 Handle other fetch errors - show retry option
  if (tripError) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-3xl font-bold text-white mb-4">Couldn't Load Trip</h1>
          <p className="text-gray-400 mb-6">
            {tripError.message.includes('permission')
              ? "You don't have access to this trip."
              : 'There was a problem loading this trip. Please try again.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId!) });
                queryClient.invalidateQueries({ queryKey: tripKeys.members(tripId!) });
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/')}
              className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-colors"
            >
              Back to My Trips
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 🔒 SAFETY CHECK: Before showing "Trip Not Found", verify user is actually authenticated
  // If not authenticated, this is really an auth issue, not a missing trip
  if (!tripWithUpdatedData) {
    // Check if user is not logged in - if so, show login prompt instead of "Trip Not Found"
    const isAuthenticated = Boolean(user?.id || session?.user?.id);
    if (!isAuthenticated) {
      if (import.meta.env.DEV) {
        console.warn(
          '[TripDetailDesktop] No trip AND no user - showing login prompt instead of Trip Not Found',
        );
      }
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <LogIn className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-4">Please Log In</h1>
            <p className="text-gray-400 mb-6">You need to be signed in to view this trip.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate(`/auth?mode=signin&returnTo=/trip/${tripId}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/')}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    // User IS logged in but trip not found - genuinely doesn't exist
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-4xl font-bold text-white mb-4">Trip Not Found</h1>
          <p className="text-gray-400 mb-6">
            The trip you're looking for doesn't exist or has been deleted.
          </p>
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

  // Handle export functionality
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
      const isMockTrip = tripId && /^\d+$/.test(tripId);
      let blob: Blob;

      if (isMockTrip) {
        const mockCalendar = demoModeService.getMockCalendarEvents(tripId || '1');
        const mockAttachments = demoModeService.getMockAttachments(tripId || '1');
        // ⚡ OPTIMIZATION: Use synchronous mock data methods (no await needed)
        const mockPayments = demoModeService.getMockPayments(tripId || '1');
        const mockPolls = demoModeService.getMockPolls(tripId || '1');
        const mockMembers = demoModeService.getMockMembers(tripId || '1');
        const mockTasks = demoModeService.getMockTasks(tripId || '1');
        const mockPlaces = demoModeService.getMockPlaces(tripId || '1');

        // Get session basecamp if set, otherwise use existing basecamp
        const sessionBasecamp = demoModeService.getSessionTripBasecamp(tripId || '1');
        const actualBasecamp = sessionBasecamp || basecamp;

        // Lazy load PDF generation (only when export is clicked)
        const { generateClientPDF } = await import('../utils/exportPdfClient');
        blob = await generateClientPDF(
          {
            tripId: tripId || '1',
            tripTitle: tripWithUpdatedData.title,
            destination: tripWithUpdatedData.location,
            dateRange: tripWithUpdatedData.dateRange,
            description: tripWithUpdatedData.description,
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
            places: orderedSections.includes('places')
              ? [
                  // Trip Basecamp first (from session or trip-specific data)
                  ...(actualBasecamp
                    ? [
                        {
                          name: `📍 Trip Base Camp: ${actualBasecamp.name || 'Main Location'}`,
                          url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(actualBasecamp.address)}`,
                          description: actualBasecamp.address,
                          votes: 0,
                        },
                      ]
                    : []),
                  // Trip-specific places from tripSpecificMockDataService
                  ...mockPlaces,
                ]
              : undefined,
            roster: orderedSections.includes('roster')
              ? mockMembers.map(m => ({
                  name: m.display_name,
                  email: undefined,
                  role: m.role,
                }))
              : undefined,
            attachments: orderedSections.includes('attachments') ? mockAttachments : undefined,
          },
          orderedSections,
          {
            customization: {
              compress: true,
              maxItemsPerSection: 100,
            },
            onProgress: progress => {
              if (progress.stage === 'rendering') {
                toast.info(`${progress.message} (${progress.current}/${progress.total})`);
              }
            },
          },
        );
      } else {
        // Fetch real data for Supabase trips
        const { getExportData } = await import('../services/tripExportDataService');
        const realData = await getExportData(tripId || '', orderedSections);

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
            attachments: realData.attachments,
          },
          orderedSections,
          {
            customization: {
              compress: true,
              maxItemsPerSection: 100,
            },
            onProgress: progress => {
              if (progress.stage === 'rendering') {
                toast.info(`${progress.message} (${progress.current}/${progress.total})`);
              }
            },
          },
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
        sections,
      });
      toast.error(
        error instanceof Error ? `Recap failed: ${error.message}` : 'Failed to create recap',
      );
      throw error;
    }
  };

  // Desktop experience
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-6 py-4 pb-8 max-w-7xl">
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
        <Suspense
          fallback={
            <div className="mb-8 animate-pulse">
              <div className="h-64 bg-white/5 rounded-3xl mb-4"></div>
              <div className="h-8 bg-white/5 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-white/5 rounded w-1/4"></div>
            </div>
          }
        >
          <TripHeader
            trip={tripWithUpdatedData}
            onDescriptionUpdate={setTripDescription}
            onTripUpdate={handleTripUpdate}
            onShowExport={() => setShowExportModal(true)}
            // ⚡ PERFORMANCE: Pass preloaded member data to avoid duplicate fetches
            preloadedTripCreatorId={tripCreatorId}
            preloadedCanRemoveMembers={canRemoveMembers}
            preloadedRemoveMember={removeMember}
            preloadedLeaveTrip={leaveTrip}
            // 🔄 FIX: Pass loading state to prevent "0 members" flash
            isMembersLoading={isMembersLoading}
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
