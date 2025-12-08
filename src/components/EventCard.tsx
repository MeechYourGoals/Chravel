
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Settings, MoreHorizontal, Archive, EyeOff, UserPlus } from 'lucide-react';
import { EventData } from '../types/events';
import { useTripVariant } from '../contexts/TripVariantContext';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { InviteModal } from './InviteModal';
import { archiveTrip, hideTrip } from '../services/archiveService';
import { useToast } from '../hooks/use-toast';
import { calculatePeopleCount, calculateDaysCount, calculateEventPlacesCount } from '../utils/tripStatsUtils';
import { getInitials } from '../utils/avatarUtils';
import { TravelerTooltip } from './ui/traveler-tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface EventCardProps {
  event: EventData;
}

export const EventCard = ({ event }: EventCardProps) => {
  const navigate = useNavigate();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { toast } = useToast();
  const { accentColors } = useTripVariant();

  const handleViewEvent = () => {
    navigate(`/event/${event.id}`);
  };

  const handleArchiveEvent = () => {
    archiveTrip(event.id, 'event');
    toast({
      title: "Event archived",
      description: `"${event.title}" has been archived. View it in the Archived tab.`,
    });
  };

  const handleHideEvent = async () => {
    try {
      await hideTrip(event.id);
      toast({
        title: "Event hidden",
        description: `"${event.title}" is now hidden. Enable "Show Hidden Trips" in Settings to view it.`,
      });
    } catch (error) {
      toast({
        title: "Failed to hide event",
        description: "There was an error hiding your event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Technology & Culture': return 'from-purple-500/20 to-purple-600/20 border-purple-500/30';
      case 'Economics & Policy': return 'from-green-500/20 to-green-600/20 border-green-500/30';
      case 'Fintech': return 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30';
      case 'Media & Entertainment': return 'from-pink-500/20 to-pink-600/20 border-pink-500/30';
      case 'Marketing & CX': return 'from-orange-500/20 to-orange-600/20 border-orange-500/30';
      case 'Personal Finance': return 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30';
      case 'Music Awards': return 'from-violet-500/20 to-violet-600/20 border-violet-500/30';
      case 'Startup Showcase': return 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30';
      case 'Creator Economy': return 'from-rose-500/20 to-rose-600/20 border-rose-500/30';
      case 'Film Awards': return 'from-amber-500/20 to-amber-600/20 border-amber-500/30';
      case 'Sports Ceremony': return 'from-indigo-500/20 to-indigo-600/20 border-indigo-500/30';
      default: return 'from-blue-500/20 to-blue-600/20 border-blue-500/30';
    }
  };

  return (
    <div className={`bg-gradient-to-br ${getCategoryColor(event.category)} backdrop-blur-xl border rounded-3xl overflow-hidden transition-all duration-300 shadow-lg hover:scale-[1.02] relative group`}>
      {/* Menu */}
      <div className="absolute top-4 right-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-white/60 hover:text-white transition-colors opacity-0 group-hover:opacity-100 p-2 hover:bg-white/10 rounded-xl">
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
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Header */}
      <div className={`relative h-48 bg-gradient-to-br from-${accentColors.primary}/20 to-${accentColors.secondary}/20 p-6`}>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&h=300&fit=crop')] bg-cover bg-center opacity-20"></div>
        <div className="relative z-10 h-full flex flex-col justify-between">
          <div>
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
            <div className="text-lg font-bold text-white">{calculatePeopleCount(event)}</div>
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
            onClick={() => setShowInviteModal(true)}
            className={`bg-gradient-to-r ${accentColors.gradient} hover:opacity-90 text-white font-semibold py-2.5 md:py-3 px-3 rounded-lg md:rounded-xl transition-all duration-300 shadow-lg hover:shadow-lg flex items-center justify-center gap-2 text-xs md:text-sm`}
          >
            <UserPlus size={16} />
            Invite
          </button>
          <button
            onClick={handleViewEvent}
            className="bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 text-white font-medium py-2.5 md:py-3 px-3 rounded-lg md:rounded-xl transition-all duration-200 text-xs md:text-sm"
          >
            View Event
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

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        tripName={event.title}
        tripId={event.id}
      />
    </div>
  );
};
