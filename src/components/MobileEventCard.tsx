
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Settings, UserPlus, MoreHorizontal, Archive, EyeOff, Trash2 } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { EventData } from '../types/events';
import { useTripVariant } from '../contexts/TripVariantContext';
import { calculatePeopleCount, calculateDaysCount, calculateEventPlacesCount } from '../utils/tripStatsUtils';
import { getInitials } from '../utils/avatarUtils';
import { TravelerTooltip } from './ui/traveler-tooltip';
import { InviteModal } from './InviteModal';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { DeleteTripConfirmDialog } from './DeleteTripConfirmDialog';
import { useEvents } from '../hooks/useEvents';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { getProTripColor } from '../utils/proTripColors';
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

export const MobileEventCard = ({ event, onArchiveSuccess, onHideSuccess, onDeleteSuccess }: MobileEventCardProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { accentColors } = useTripVariant();
  const [showInviteModal, setShowInviteModal] = useState(false);
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

  if (!isMobile) return null;

  return (
    <div className={`bg-gradient-to-br ${eventColor.cardGradient} backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden transition-all duration-300 shadow-lg hover:scale-[1.02] group relative`}>
      {/* Menu */}
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-white/60 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl">
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
            <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete for me
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Header */}
      <div className={`relative h-36 bg-gradient-to-br from-${accentColors.primary}/10 to-${accentColors.secondary}/10 p-4`}>
        {/* Cover photo overlay if available */}
        {(event as any).coverPhoto ? (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-15"
            style={{ backgroundImage: `url(${(event as any).coverPhoto})` }}
          />
        ) : null}
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div className="flex-1">
            <div className="inline-block bg-black/20 backdrop-blur-sm px-2 py-1 rounded-lg mb-2">
              <span className="text-xs font-medium text-white">{event.category}</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
              {event.title}
            </h3>
            <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
              <MapPin size={14} className={`text-${accentColors.primary}`} />
              <span className="font-medium truncate">{event.location}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <Calendar size={14} className={`text-${accentColors.primary}`} />
              <span className="font-medium">{event.dateRange}</span>
            </div>
          </div>
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
            <div className="text-sm font-bold text-white">{calculateDaysCount(event.dateRange)}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MapPin size={12} className={`text-${accentColors.primary}`} />
              <span className="text-xs text-white/60 uppercase tracking-wide">Places</span>
            </div>
            <div className="text-sm font-bold text-white">{calculateEventPlacesCount(event)}</div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {event.tags.slice(0, 2).map((tag, index) => (
            <span key={index} className="bg-white/10 backdrop-blur-sm px-2 py-1 rounded-md text-xs text-white">
              {tag}
            </span>
          ))}
          {event.tags.length > 2 && (
            <span className="bg-white/10 backdrop-blur-sm px-2 py-1 rounded-md text-xs text-white">
              +{event.tags.length - 2}
            </span>
          )}
        </div>

        {/* Team Members */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users size={14} className={`text-${accentColors.primary}`} />
              <span className="text-sm text-gray-300 font-medium">Organizers</span>
            </div>
            <span className="text-xs text-gray-500">{event.participants.length} members</span>
          </div>
          
          <div className="flex items-center">
            <div className="flex -space-x-2">
              {event.participants.slice(0, 3).map((participant, index) => (
                <TravelerTooltip key={participant.id} name={`${participant.name} - ${participant.role}`}>
                  <div
                    className="relative w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-xs font-semibold text-black border-2 border-gray-900"
                    style={{ zIndex: event.participants.length - index }}
                  >
                    {getInitials(participant.name)}
                  </div>
                </TravelerTooltip>
              ))}
            </div>
            {event.participants.length > 3 && (
              <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-xs font-medium text-white ml-1">
                +{event.participants.length - 3}
              </div>
            )}
          </div>
        </div>

        {/* Group Chat Status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings size={14} className="text-gray-400" />
            <span className="text-gray-400 text-sm">Group Chat</span>
          </div>
          <span className={`text-sm font-medium ${event.groupChatEnabled ? 'text-green-400' : 'text-gray-500'}`}>
            {event.groupChatEnabled ? 'On' : 'Off'}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleViewEvent}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-xl transition-all duration-300 text-sm"
          >
            View Event
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            className={`bg-gradient-to-r ${accentColors.gradient} hover:opacity-90 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-sm`}
          >
            <UserPlus size={16} />
            Invite
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
