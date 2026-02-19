import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Users,
  Settings,
  UserPlus,
  MoreHorizontal,
  Archive,
  EyeOff,
  Trash2,
  FileDown,
  Share2,
} from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { EventData } from '../types/events';
import { useTripVariant } from '../contexts/TripVariantContext';
import {
  calculatePeopleCount,
  calculateDaysCount,
  calculateEventPlacesCount,
  getPeopleCountValue,
} from '../utils/tripStatsUtils';
import { InviteModal } from './InviteModal';
import { ShareTripModal } from './share/ShareTripModal';
import { TripExportModal } from './trip/TripExportModal';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { DeleteTripConfirmDialog } from './DeleteTripConfirmDialog';
import { useEvents } from '../hooks/useEvents';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { getProTripColor } from '../utils/proTripColors';
import { getExportData } from '../services/tripExportDataService';
import { generateClientPDF } from '../utils/exportPdfClient';
import { orderExportSections } from '../utils/exportSectionOrder';
import { ExportSection } from '../types/tripExport';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface MobileEventCardProps {
  event: EventData;
  onArchiveSuccess?: () => void;
  onHideSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export const MobileEventCard = ({
  event,
  onArchiveSuccess,
  onHideSuccess,
  onDeleteSuccess,
}: MobileEventCardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { accentColors } = useTripVariant();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { archiveTrip, hideTrip, deleteTripForMe } = useEvents();

  // Get color for this event - uses saved color if available, otherwise deterministic fallback
  const eventColor = getProTripColor(event.id, (event as any).card_color);

  const handleViewEvent = () => {
    navigate(`/event/${event.id}`);
  };

  const handleExportPdf = useCallback(async (sections: ExportSection[]) => {
    const orderedSections = orderExportSections(sections);
    const exportData = await getExportData(event.id.toString(), orderedSections);

    const blob = await generateClientPDF(
      {
        tripId: event.id.toString(),
        tripTitle: exportData.trip.title,
        destination: exportData.trip.destination,
        dateRange: exportData.trip.dateRange,
        description: exportData.trip.description,
        calendar: exportData.calendar,
        payments: exportData.payments,
        polls: exportData.polls,
        tasks: exportData.tasks,
        places: exportData.places,
        roster: exportData.roster,
        broadcasts: exportData.broadcasts,
        attachments: exportData.attachments,
        agenda: exportData.agenda,
        lineup: exportData.lineup,
      },
      orderedSections,
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportData.trip.title.replace(/[^a-zA-Z0-9]/g, '_')}_Recap.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [event.id]);

  const handleArchiveEvent = async () => {
    try {
      await archiveTrip(event.id);
      toast({
        title: 'Event archived',
        description: `"${event.title}" has been archived. View it in the Archived tab.`,
      });
      setShowArchiveDialog(false);
      onArchiveSuccess?.();
    } catch (error) {
      toast({
        title: 'Failed to archive event',
        description: 'There was an error archiving your event. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleHideEvent = async () => {
    try {
      await hideTrip(event.id);
      toast({
        title: 'Event hidden',
        description: `"${event.title}" is now hidden. Enable "Show Hidden Trips" in Settings to view it.`,
      });
      onHideSuccess?.();
    } catch (error) {
      toast({
        title: 'Failed to hide event',
        description: 'There was an error hiding your event. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteEventForMe = async () => {
    if (!user?.id) {
      toast({
        title: 'Not logged in',
        description: 'You must be logged in to manage trips.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTripForMe({ tripId: event.id.toString(), userId: user.id });
      toast({
        title: 'Event removed',
        description: `"${event.title}" has been removed from your account.`,
      });
      setShowDeleteDialog(false);
      onDeleteSuccess?.();
    } catch (error) {
      toast({
        title: 'Failed to remove event',
        description: 'There was an error removing the event. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Build share trip data for ShareTripModal
  const shareTripData = {
    id: event.id,
    title: event.title,
    location: event.location,
    dateRange: event.dateRange,
    participants: [] as Array<{ id: number | string; name: string; avatar: string }>,
    coverPhoto: (event as any).coverPhoto,
    peopleCount: getPeopleCountValue(event),
  };

  if (!isMobile) return null;

  return (
    <div
      className={`bg-gradient-to-br ${eventColor.cardGradient} backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden transition-all duration-300 shadow-lg hover:scale-[1.02] group relative`}
    >
      {/* Mobile Header */}
      <div
        className={`relative h-36 bg-gradient-to-br from-${accentColors.primary}/10 to-${accentColors.secondary}/10 p-4`}
      >
        {/* Cover photo overlay if available */}
        {(event as any).coverPhoto ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-15"
            style={{ backgroundImage: `url(${(event as any).coverPhoto})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        <div className="relative z-10 flex justify-between items-start h-full">
          {/* Event Info */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-end">
            <div className="inline-block bg-black/20 backdrop-blur-sm px-2 py-1 rounded-lg mb-2 self-start">
              <span className="text-xs font-medium text-white">{event.category}</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{event.title}</h3>
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <MapPin size={14} className={`text-${accentColors.primary}`} />
              <span className="font-medium truncate">{event.location}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <Calendar size={14} className={`text-${accentColors.primary}`} />
              <span className="font-medium">{event.dateRange}</span>
            </div>
          </div>

          {/* Menu Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 p-2 rounded-xl shrink-0">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border-border">
              <DropdownMenuItem onClick={() => setShowArchiveDialog(true)}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleHideEvent}>
                <EyeOff className="mr-2 h-4 w-4" />
                Hide
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete for me
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="p-4">
        {/* Stats Grid - People, Days, Places */}
        <div className="grid grid-cols-3 gap-3 mb-4 bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users size={12} className={`text-${accentColors.primary}`} />
              <span className="text-xs text-white/60 uppercase tracking-wide">People</span>
            </div>
            <div className="text-sm font-bold text-white">{calculatePeopleCount(event)}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar size={12} className={`text-${accentColors.primary}`} />
              <span className="text-xs text-white/60 uppercase tracking-wide">Days</span>
            </div>
            <div className="text-sm font-bold text-white">
              {calculateDaysCount(event.dateRange)}
            </div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MapPin size={12} className={`text-${accentColors.primary}`} />
              <span className="text-xs text-white/60 uppercase tracking-wide">Places</span>
            </div>
            <div className="text-sm font-bold text-white">{event.placesCount != null ? (event.placesCount > 0 ? event.placesCount.toString() : '—') : calculateEventPlacesCount(event)}</div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {event.tags.slice(0, 2).map((tag, index) => (
            <span
              key={index}
              className="bg-white/10 backdrop-blur-sm px-2 py-1 rounded-md text-xs text-white"
            >
              {tag}
            </span>
          ))}
          {event.tags.length > 2 && (
            <span className="bg-white/10 backdrop-blur-sm px-2 py-1 rounded-md text-xs text-white">
              +{event.tags.length - 2}
            </span>
          )}
        </div>

        {/* Organizer Display */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={14} className={`text-${accentColors.primary}`} />
              <span className="text-sm text-gray-300 font-medium">Organizer</span>
            </div>
            <span className="text-xs text-gray-300 font-medium truncate max-w-[55%] text-right">
              {event.organizer_display_name || '—'}
            </span>
          </div>
        </div>

        {/* Group Chat Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings size={14} className="text-gray-400" />
            <span className="text-gray-400 text-sm">Group Chat</span>
          </div>
          <span
            className={`text-sm font-medium ${event.groupChatEnabled ? 'text-green-400' : 'text-gray-500'}`}
          >
            {event.groupChatEnabled ? 'On' : 'Off'}
          </span>
        </div>

        {/* Action Buttons - 2x2 Grid matching TripCard/ProTripCard */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="bg-black/30 hover:bg-black/40 text-white py-3 rounded-xl transition-all duration-200 font-medium border border-white/20 hover:border-white/30 text-sm flex items-center justify-center gap-2"
          >
            <FileDown size={16} />
            Recap
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-black/30 hover:bg-black/40 text-white py-3 rounded-xl transition-all duration-200 font-medium border border-white/20 hover:border-white/30 text-sm flex items-center justify-center gap-2"
          >
            <UserPlus size={16} />
            Invite
          </button>
          <button
            onClick={handleViewEvent}
            className="bg-black/30 hover:bg-black/40 text-white font-medium py-3 rounded-xl transition-all duration-200 text-sm border border-white/20 hover:border-white/30 flex items-center justify-center gap-2"
          >
            View Event
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="bg-black/30 hover:bg-black/40 text-white py-3 rounded-xl transition-all duration-200 font-medium border border-white/20 hover:border-white/30 text-sm flex items-center justify-center gap-2"
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        tripName={event.title}
        tripId={event.id}
        tripType="event"
      />

      <TripExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExportPdf}
        tripName={event.title}
        tripId={event.id.toString()}
        tripType="event"
      />

      <ShareTripModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        trip={shareTripData}
      />

      <ArchiveConfirmDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        onConfirm={handleArchiveEvent}
        tripTitle={event.title}
        isArchiving
      />

      <DeleteTripConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteEventForMe}
        tripTitle={event.title}
        isLoading={isDeleting}
      />
    </div>
  );
};
