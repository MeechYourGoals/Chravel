
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Settings, MoreHorizontal, Archive, EyeOff, UserPlus, Trash2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { EventData } from '../types/events';
import { useTripVariant } from '../contexts/TripVariantContext';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { DeleteTripConfirmDialog } from './DeleteTripConfirmDialog';
import { InviteModal } from './InviteModal';
import { useEvents } from '../hooks/useEvents';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { getPeopleCountValue, formatPeopleCount, calculateDaysCount, calculateEventPlacesCount } from '../utils/tripStatsUtils';
import { getInitials } from '../utils/avatarUtils';
import { TravelerTooltip } from './ui/traveler-tooltip';
import { useDemoTripMembersStore } from '../store/demoTripMembersStore';
import { useDemoMode } from '../hooks/useDemoMode';
import { getProTripColor } from '../utils/proTripColors';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

// Stable empty array reference - prevents infinite re-renders from Zustand selector
const EMPTY_PARTICIPANTS: Array<{id: number | string; name: string; avatar?: string}> = [];

interface EventCardProps {
  event: EventData;
  onArchiveSuccess?: () => void;
  onHideSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export const EventCard = ({ event, onArchiveSuccess, onHideSuccess, onDeleteSuccess }: EventCardProps) => {
  const navigate = useNavigate();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { accentColors } = useTripVariant();
  const { isDemoMode } = useDemoMode();
  const { archiveTrip, hideTrip, deleteTripForMe } = useEvents();
  
  // Get color for this event - uses saved color if available, otherwise deterministic fallback
  const eventColor = getProTripColor(event.id, (event as any).card_color);
  
  // Get added members from the demo store - use stable empty array reference with shallow comparison
  const eventIdStr = event.id.toString();
  const addedDemoMembers = useDemoTripMembersStore(
    useShallow((state) => isDemoMode && state.addedMembers[eventIdStr] 
      ? state.addedMembers[eventIdStr] 
      : EMPTY_PARTICIPANTS)
  );
  
  // Calculate updated people count including added members
  const totalPeopleCount = React.useMemo(() => {
    let baseCount = getPeopleCountValue(event);
    // Ensure at least 1 person (creator) is counted
    if (baseCount === 0) baseCount = 1;

    return formatPeopleCount(baseCount + addedDemoMembers.length);
  }, [event, addedDemoMembers]);

  const handleViewEvent = () => {
    navigate(`/event/${event.id}`);
  };

  const handleArchiveEvent = async () => {
    try {
      await archiveTrip(event.id);
      toast({
        title: "Event archived",
        description: `"${event.title}" has been archived. View it in the Archived tab.`,
      });
      setShowArchiveDialog(false);
      onArchiveSuccess?.();
    } catch (error) {
      toast({
        title: "Failed to archive event",
        description: "There was an error archiving your event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleHideEvent = async () => {
    try {
      await hideTrip(event.id);
      toast({
        title: "Event hidden",
        description: `"${event.title}" is now hidden. Enable "Show Hidden Trips" in Settings to view it.`,
      });
      onHideSuccess?.();
    } catch (error) {
      toast({
        title: "Failed to hide event",
        description: "There was an error hiding your event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEventForMe = async () => {
    if (!user?.id) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to manage trips.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteTripForMe({ tripId: event.id.toString(), userId: user.id });
      toast({
        title: "Event removed",
        description: `"${event.title}" has been removed from your account.`,
      });
      setShowDeleteDialog(false);
      onDeleteSuccess?.();
    } catch (error) {
      toast({
        title: "Failed to remove event",
        description: "There was an error removing the event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`bg-gradient-to-br ${eventColor.cardGradient} backdrop-blur-xl border border-white/20 hover:border-white/40 rounded-3xl overflow-hidden transition-all duration-300 shadow-lg hover:scale-[1.02] relative group`}>
      {/* Header */}
      <div className={`relative h-48 bg-gradient-to-br from-${accentColors.primary}/20 to-${accentColors.secondary}/20 p-6`}>
        {/* Cover photo overlay if available */}
        {(event as any).coverPhoto ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: `url(${(event as any).coverPhoto})` }}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        <div className="relative z-10 flex justify-between items-start h-full">
          {/* Event Info */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-end">
            <h3 className="text-2xl font-bold text-white mb-2 line-clamp-2">
              {event.title}
            </h3>
            <div className="flex items-center gap-2 text-white/80 mb-2">
              <MapPin size={16} className={`text-${accentColors.primary}`} />
              <span className="font-medium">{event.location}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Calendar size={16} className={`text-${accentColors.primary}`} />
              <span className="font-medium">{event.dateRange}</span>
            </div>
          </div>

          {/* Menu Button - inline in header flex layout */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 p-2 rounded-xl shrink-0">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background border-border">
              <DropdownMenuItem
                onClick={() => setShowArchiveDialog(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive Event
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleHideEvent}
                className="text-muted-foreground hover:text-foreground"
              >
                <EyeOff className="mr-2 h-4 w-4" />
                Hide Event
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

      {/* Content */}
      <div className="p-6">
        {/* Stats Grid - People, Days, Places */}
        <div className="grid grid-cols-3 gap-4 mb-6 bg-black/20 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users size={14} className={`text-${accentColors.primary}`} />
              <span className="text-xs text-white/60 uppercase tracking-wide">People</span>
            </div>
            <div className="text-lg font-bold text-white">{totalPeopleCount}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Calendar size={14} className={`text-${accentColors.primary}`} />
              <span className="text-xs text-white/60 uppercase tracking-wide">Days</span>
            </div>
            <div className="text-lg font-bold text-white">{calculateDaysCount(event.dateRange)}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MapPin size={14} className={`text-${accentColors.primary}`} />
              <span className="text-xs text-white/60 uppercase tracking-wide">Places</span>
            </div>
            <div className="text-lg font-bold text-white">{calculateEventPlacesCount(event)}</div>
          </div>
        </div>

        {/* Team Members */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users size={18} className={`text-${accentColors.primary}`} />
              <span className="text-white font-medium">Organizers</span>
            </div>
            <span className="text-gray-400 text-sm">{event.participants.length} members</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex -space-x-3">
              {event.participants.slice(0, 4).map((participant, index) => (
                <TravelerTooltip key={participant.id} name={`${participant.name} - ${participant.role}`}>
                  <div
                    className="relative w-10 h-10 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-sm font-semibold text-black border-2 border-gray-900 hover:scale-110 transition-transform duration-200 hover:border-yellow-400 cursor-pointer"
                    style={{ zIndex: event.participants.length - index }}
                  >
                    {getInitials(participant.name)}
                  </div>
                </TravelerTooltip>
              ))}
            </div>
            {event.participants.length > 4 && (
              <div className="w-10 h-10 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-sm font-medium text-white">
                +{event.participants.length - 4}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Side by Side */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <button
            onClick={handleViewEvent}
            className="bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white font-medium py-2.5 md:py-3 px-3 rounded-lg md:rounded-xl transition-all duration-200 text-xs md:text-sm"
          >
            View Event
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className={`bg-gradient-to-r ${accentColors.gradient} hover:opacity-90 text-white font-semibold py-2.5 md:py-3 px-3 rounded-lg md:rounded-xl transition-all duration-300 shadow-lg hover:shadow-lg flex items-center justify-center gap-2 text-xs md:text-sm`}
          >
            <UserPlus size={16} />
            Invite
          </button>
        </div>
      </div>

      <ArchiveConfirmDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        onConfirm={handleArchiveEvent}
        tripTitle={event.title}
        isArchiving={true}
      />

      <DeleteTripConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteEventForMe}
        tripTitle={event.title}
        isLoading={isDeleting}
      />

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        tripName={event.title}
        tripId={event.id}
        tripType="event"
      />
    </div>
  );
};
