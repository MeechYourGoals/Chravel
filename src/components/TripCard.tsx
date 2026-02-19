import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  User,
  MoreHorizontal,
  Archive,
  Flame,
  TrendingUp,
  EyeOff,
  FileDown,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { InviteModal } from './InviteModal';
import { ShareTripModal } from './share/ShareTripModal';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { DeleteTripConfirmDialog } from './DeleteTripConfirmDialog';
import { TripExportModal } from './trip/TripExportModal';
import { OptimizedImage } from './OptimizedImage';
import { archiveTrip, hideTrip, deleteTripForMe } from '../services/archiveService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/use-toast';
import { ToastAction } from './ui/toast';
import { Badge } from './ui/badge';
import { gamificationService } from '../services/gamificationService';
import { isConsumerTrip } from '../utils/tripTierDetector';
import { useDemoTripMembersStore } from '../store/demoTripMembersStore';
import { useDemoMode } from '../hooks/useDemoMode';
import { ExportSection } from '@/types/tripExport';
import { demoModeService } from '../services/demoModeService';
import { openOrDownloadBlob } from '../utils/download';
import { orderExportSections } from '../utils/exportSectionOrder';
import { useConsumerSubscription } from '../hooks/useConsumerSubscription';
import { calculateDaysCount } from '../utils/tripStatsUtils';
import { usePrefetchTrip } from '../hooks/usePrefetchTrip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface Participant {
  id: number | string; // Support both numeric IDs (demo) and UUID strings (Supabase)
  name: string;
  avatar: string;
}

// Stable empty array reference - prevents infinite re-renders from Zustand selector
const EMPTY_PARTICIPANTS: Array<{ id: number | string; name: string; avatar?: string }> = [];

interface Trip {
  id: number | string;
  title: string;
  location: string;
  dateRange: string;
  participants: Participant[];
  coverPhoto?: string;
  placesCount?: number;
  peopleCount?: number;
  created_by?: string;
}

interface TripCardProps {
  trip: Trip;
  onArchiveSuccess?: () => void;
  onHideSuccess?: () => void;
  onDeleteSuccess?: () => void;
  onEnterReorderMode?: () => void;
  /** When true, loads cover photo eagerly (for above-the-fold cards) */
  priority?: boolean;
}

export const TripCard = ({
  trip,
  onArchiveSuccess,
  onHideSuccess,
  onDeleteSuccess,
  onEnterReorderMode,
  priority = false,
}: TripCardProps) => {
  const navigate = useNavigate();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const { toast } = useToast();
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  const { tier } = useConsumerSubscription();
  const { prefetch } = usePrefetchTrip();

  // Free users use archive-first (no hard delete) to preserve their trips
  const isFreeUser = tier === 'free';

  // Get added members from the demo store - use stable empty array reference with shallow comparison
  const tripIdStr = trip.id.toString();
  const addedDemoMembers = useDemoTripMembersStore(
    useShallow(state =>
      isDemoMode && state.addedMembers[tripIdStr]
        ? state.addedMembers[tripIdStr]
        : EMPTY_PARTICIPANTS,
    ),
  );

  // ⚡ PERFORMANCE: Prefetch trip data on hover/focus to reduce perceived load time
  const handlePrefetch = useCallback(() => {
    prefetch(tripIdStr);
  }, [prefetch, tripIdStr]);

  const handleViewTrip = () => {
    navigate(`/trip/${trip.id}`);
  };

  const handleArchiveTrip = async () => {
    // Demo mode: session-scoped, non-persistent archive
    if (isDemoMode) {
      demoModeService.archiveTripSession(trip.id.toString());
      toast({
        title: 'Trip archived',
        description: `"${trip.title}" has been archived. View it in the Archived tab.`,
      });
      setShowArchiveDialog(false);
      onArchiveSuccess?.();
      return;
    }

    // Authenticated mode: persist to database
    try {
      await archiveTrip(trip.id.toString(), 'consumer');
      toast({
        title: 'Trip archived',
        description: `"${trip.title}" has been archived. View it in the Archived tab.`,
      });
      setShowArchiveDialog(false);
      onArchiveSuccess?.();
    } catch {
      toast({
        title: 'Failed to archive trip',
        description: 'There was an error archiving your trip. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleHideTrip = async () => {
    // Demo mode: session-scoped, non-persistent hide
    if (isDemoMode) {
      demoModeService.hideTripSession(trip.id.toString());
      toast({
        title: 'Trip hidden',
        description: `"${trip.title}" is now hidden. Enable "Show Hidden Trips" in Settings to view it.`,
      });
      onHideSuccess?.();
      return;
    }

    // Authenticated mode: persist to database
    try {
      await hideTrip(trip.id.toString());
      toast({
        title: 'Trip hidden',
        description: `"${trip.title}" is now hidden. Enable "Show Hidden Trips" in Settings to view it.`,
      });
      onHideSuccess?.();
    } catch {
      toast({
        title: 'Failed to hide trip',
        description: 'There was an error hiding your trip. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Check if current user is the trip creator
  const isCreator = user?.id === trip.created_by;

  const handleDeleteTripForMe = async () => {
    // Demo mode: block delete with toast - demo trips are deletion-proof
    if (isDemoMode) {
      toast({
        title: 'Demo trip',
        description: 'This is a demo trip and cannot be deleted.',
      });
      setShowDeleteDialog(false);
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Not logged in',
        description: 'You must be logged in to manage trips.',
        variant: 'destructive',
      });
      return;
    }

    // For free users who are creators, auto-archive instead of delete
    if (isCreator && isFreeUser) {
      try {
        await archiveTrip(trip.id.toString(), 'consumer');
        toast({
          title: 'Trip archived',
          description: `"${trip.title}" has been archived. Upgrade to restore it anytime!`,
          action: (
            <ToastAction altText="View Plans" onClick={() => navigate('/settings')}>
              View Plans
            </ToastAction>
          ),
        });
        setShowDeleteDialog(false);
        onArchiveSuccess?.();
      } catch {
        toast({
          title: 'Failed to archive trip',
          description: 'There was an error archiving your trip. Please try again.',
          variant: 'destructive',
        });
      }
      return;
    }

    // For paid creators and regular members, proceed with deletion
    setIsDeleting(true);
    try {
      await deleteTripForMe(trip.id.toString(), user.id);
      toast({
        title: 'Trip removed',
        description: `"${trip.title}" has been removed from your account.`,
      });
      setShowDeleteDialog(false);
      onDeleteSuccess?.();
    } catch {
      toast({
        title: 'Failed to remove trip',
        description: 'There was an error removing the trip. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Complete PDF export handler - same logic as in-trip export
  const handleExportPdf = useCallback(
    async (sections: ExportSection[]) => {
      const orderedSections = orderExportSections(sections);
      const tripIdStr = trip.id.toString();
      const isNumericId = !tripIdStr.includes('-'); // UUIDs have dashes, demo IDs don't

      if (import.meta.env.DEV) {
        console.log('[TripCard Export] Starting export', {
          tripId: tripIdStr,
          isNumericId,
          isDemoMode,
          sections,
        });
      }

      toast({
        title: 'Creating Recap',
        description: `Building your trip memories for "${trip.title}"...`,
      });

      try {
        let blob: Blob;

        if (isDemoMode || isNumericId) {
          const mockCalendar = demoModeService.getMockCalendarEvents(tripIdStr);
          const mockAttachments = demoModeService.getMockAttachments(tripIdStr);
          // Demo mode - use mock data from services
          if (import.meta.env.DEV) console.log('[TripCard Export] Using demo mode data');

          const mockPayments = demoModeService.getMockPayments(tripIdStr);
          const mockPolls = demoModeService.getMockPolls(tripIdStr);
          const mockTasks = demoModeService.getMockTasks(tripIdStr);
          const mockPlaces = demoModeService.getMockPlaces(tripIdStr);

          const { generateClientPDF } = await import('../utils/exportPdfClient');
          blob = await generateClientPDF(
            {
              tripId: tripIdStr,
              tripTitle: trip.title,
              destination: trip.location,
              dateRange: trip.dateRange,
              calendar: orderedSections.includes('calendar') ? mockCalendar : undefined, // Demo trips use in-trip calendar view
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
          if (import.meta.env.DEV)
            console.log('[TripCard Export] Fetching real data from Supabase');

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

        if (import.meta.env.DEV)
          console.log('[TripCard Export] PDF generated, blob size:', blob.size);

        // Generate filename
        const sanitizedTitle = trip.title.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `Trip_${sanitizedTitle}_${Date.now()}.pdf`;

        // Download the blob
        await openOrDownloadBlob(blob, filename, { mimeType: 'application/pdf' });

        toast({
          title: 'Recap ready',
          description: `PDF downloaded: ${filename}`,
        });
      } catch (error) {
        toast({
          title: 'Recap failed',
          description:
            error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.',
          variant: 'destructive',
        });
        throw error; // Re-throw so TripExportModal can show error state
      }
    },
    [trip, isDemoMode, toast],
  );

  // Merge base participants with added demo members
  const allParticipants = React.useMemo(() => {
    if (!isDemoMode || addedDemoMembers.length === 0) {
      return trip.participants;
    }
    const existingIds = new Set(trip.participants.map(p => p.id.toString()));
    const newMembers = addedDemoMembers
      .filter(m => !existingIds.has(m.id.toString()))
      .map(m => ({
        id: typeof m.id === 'string' ? parseInt(m.id, 10) || 0 : (m.id as number),
        name: m.name,
        avatar: m.avatar || '',
      }));
    return [...trip.participants, ...newMembers];
  }, [trip.participants, addedDemoMembers, isDemoMode]);

  // Ensure all participants have proper avatar URLs
  const participantsWithAvatars = allParticipants.map((participant, index) => ({
    ...participant,
    avatar:
      participant.avatar ||
      `https://images.unsplash.com/photo-${1649972904349 + index}-6e44c42644a7?w=40&h=40&fit=crop&crop=face`,
  }));

  // Gamification features for consumer trips only
  const isConsumer = isConsumerTrip(trip.id.toString());
  const daysUntil = isConsumer ? gamificationService.getDaysUntilTrip(trip.id.toString()) : 0;
  const momentum = isConsumer ? gamificationService.getTripMomentum(trip.id.toString()) : 'cold';

  return (
    <div
      className="group bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-yellow-500/30 rounded-2xl md:rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl shadow-lg md:shadow-black/20"
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
    >
      {/* Trip Image/Header - Responsive with lazy loading */}
      <div className="relative h-32 md:h-48 bg-gradient-to-br from-yellow-600/20 via-yellow-500/10 to-transparent p-4 md:p-6">
        {trip.coverPhoto && (
          <OptimizedImage
            src={trip.coverPhoto}
            alt={`${trip.title} cover`}
            lazy={!priority}
            priority={priority}
            className="absolute inset-0 opacity-80"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        <div className="relative z-10 flex justify-between items-start h-full">
          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="flex items-start gap-3 mb-2">
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-yellow-300 transition-colors line-clamp-2">
                  {trip.title}
                </h3>
                {/* Trip Status Badges - Hidden on mobile to save space */}
                {isConsumer && (
                  <div className="hidden md:flex gap-2 mt-1 flex-wrap max-h-8 overflow-hidden">
                    {momentum === 'hot' && (
                      <Badge
                        variant="secondary"
                        className="bg-red-500/20 text-red-300 border-red-500/30"
                      >
                        <Flame size={12} className="mr-1" />
                        Hot
                      </Badge>
                    )}
                    {momentum === 'warm' && (
                      <Badge
                        variant="secondary"
                        className="bg-orange-500/20 text-orange-300 border-orange-500/30"
                      >
                        <TrendingUp size={12} className="mr-1" />
                        Active
                      </Badge>
                    )}
                    {daysUntil > 0 && daysUntil <= 7 && (
                      <Badge
                        variant="secondary"
                        className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 animate-pulse"
                      >
                        {daysUntil} {daysUntil === 1 ? 'day' : 'days'} left
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/80 mb-1 md:mb-3 text-sm md:text-base">
              <MapPin size={14} className="md:hidden text-yellow-400" />
              <MapPin size={18} className="hidden md:block text-yellow-400" />
              <span className="font-medium truncate">{trip.location}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-sm md:text-base">
              <Calendar size={14} className="md:hidden text-yellow-400" />
              <Calendar size={18} className="hidden md:block text-yellow-400" />
              <span className="font-medium truncate">{trip.dateRange}</span>
            </div>
          </div>
          {/* Archive menu - works on both mobile and desktop */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-white/60 hover:text-white transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 p-2 hover:bg-white/10 rounded-lg md:rounded-xl">
                <MoreHorizontal size={18} className="md:hidden" />
                <MoreHorizontal size={20} className="hidden md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border-border">
              {onEnterReorderMode && (
                <>
                  <DropdownMenuItem
                    onClick={onEnterReorderMode}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ArrowUpDown className="mr-2 h-4 w-4" />
                    Rearrange
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={() => setShowArchiveDialog(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive Trip
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleHideTrip}
                className="text-muted-foreground hover:text-foreground"
              >
                <EyeOff className="mr-2 h-4 w-4" />
                Hide Trip
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete for me
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Trip Content - Responsive padding */}
      <div className="p-4 md:p-6">
        {/* Quick Stats - Responsive sizing */}
        <div className="flex justify-between items-center md:grid md:grid-cols-3 md:gap-4 mb-4 md:mb-6">
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-white">
              {trip.peopleCount ?? participantsWithAvatars.length}
            </div>
            <div className="text-xs md:text-sm text-gray-400">People</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-white">
              {calculateDaysCount(trip.dateRange)}
            </div>
            <div className="text-xs md:text-sm text-gray-400">Days</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-white">{trip.placesCount ?? 0}</div>
            <div className="text-xs md:text-sm text-gray-400">Places</div>
          </div>
        </div>

        {/* Action Buttons - 2x2 grid: Export/Invite top, View/Share bottom */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          {/* Top Row */}
          <button
            onClick={() => setShowExportModal(true)}
            className="bg-gray-800/50 hover:bg-gray-700/50 text-white py-2.5 md:py-3 px-2 md:px-3 rounded-lg md:rounded-xl transition-all duration-200 font-medium border border-gray-700 hover:border-gray-600 text-xs md:text-sm flex items-center justify-center gap-1.5"
          >
            <FileDown size={14} className="md:hidden" />
            <FileDown size={16} className="hidden md:block" />
            Recap
          </button>

          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-gray-800/50 hover:bg-gray-700/50 text-white py-2.5 md:py-3 px-2 md:px-3 rounded-lg md:rounded-xl transition-all duration-200 font-medium border border-gray-700 hover:border-gray-600 text-xs md:text-sm flex items-center justify-center gap-1.5"
          >
            <User size={14} className="md:hidden" />
            <User size={16} className="hidden md:block" />
            Invite
          </button>

          {/* Bottom Row - View button with prefetch on hover/focus */}
          <button
            onClick={handleViewTrip}
            onMouseEnter={handlePrefetch}
            onFocus={handlePrefetch}
            className="bg-gray-800/50 hover:bg-gray-700/50 text-white py-2.5 md:py-3 px-2 md:px-3 rounded-lg md:rounded-xl transition-all duration-200 font-medium border border-gray-700 hover:border-gray-600 text-xs md:text-sm"
          >
            View
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="bg-gray-800/50 hover:bg-gray-700/50 text-white py-2.5 md:py-3 px-2 md:px-3 rounded-lg md:rounded-xl transition-all duration-200 font-medium border border-gray-700 hover:border-gray-600 text-xs md:text-sm"
          >
            Share
          </button>
        </div>
      </div>

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        tripName={trip.title}
        tripId={trip.id.toString()}
      />

      <ShareTripModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        trip={{
          ...trip,
          participants: participantsWithAvatars,
          peopleCount: trip.peopleCount ?? participantsWithAvatars.length,
        }}
      />

      <ArchiveConfirmDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        onConfirm={handleArchiveTrip}
        tripTitle={trip.title}
        isArchiving={true}
      />

      <DeleteTripConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteTripForMe}
        tripTitle={trip.title}
        isLoading={isDeleting}
        isCreator={isCreator && !isFreeUser}
      />

      <TripExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportPdf}
        tripName={trip.title}
        tripId={trip.id.toString()}
      />
    </div>
  );
};
