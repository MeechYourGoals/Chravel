
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, User, Plus, MoreHorizontal, Archive, Flame, TrendingUp, EyeOff } from 'lucide-react';
import { InviteModal } from './InviteModal';
import { ShareTripModal } from './share/ShareTripModal';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { TravelerTooltip } from './ui/traveler-tooltip';
import { archiveTrip, hideTrip } from '../services/archiveService';
import { useToast } from '../hooks/use-toast';
import { Badge } from './ui/badge';
import { gamificationService } from '../services/gamificationService';
import { isConsumerTrip } from '../utils/tripTierDetector';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface Participant {
  id: number;
  name: string;
  avatar: string;
}

interface Trip {
  id: number | string;
  title: string;
  location: string;
  dateRange: string;
  participants: Participant[];
  coverPhoto?: string;
  placesCount?: number;
}

interface TripCardProps {
  trip: Trip;
  onArchiveSuccess?: () => void;
  onHideSuccess?: () => void;
}

export const TripCard = ({ trip, onArchiveSuccess, onHideSuccess }: TripCardProps) => {
  const navigate = useNavigate();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const { toast } = useToast();

  const handleViewTrip = () => {
    navigate(`/trip/${trip.id}`);
  };

  const handleEditItinerary = () => {
    navigate(`/trip/${trip.id}/edit-itinerary`);
  };

  const handleArchiveTrip = async () => {
    try {
      await archiveTrip(trip.id.toString(), 'consumer');
      toast({
        title: "Trip archived",
        description: `"${trip.title}" has been archived. View it in the Archived tab.`,
      });
      setShowArchiveDialog(false);
      onArchiveSuccess?.();
    } catch (error) {
      toast({
        title: "Failed to archive trip",
        description: "There was an error archiving your trip. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleHideTrip = async () => {
    try {
      await hideTrip(trip.id.toString());
      toast({
        title: "Trip hidden",
        description: `"${trip.title}" is now hidden. Enable "Show Hidden Trips" in Settings to view it.`,
      });
      onHideSuccess?.();
    } catch (error) {
      toast({
        title: "Failed to hide trip",
        description: "There was an error hiding your trip. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Ensure all participants have proper avatar URLs
  const participantsWithAvatars = trip.participants.map((participant, index) => ({
    ...participant,
    avatar: participant.avatar || `https://images.unsplash.com/photo-${1649972904349 + index}-6e44c42644a7?w=40&h=40&fit=crop&crop=face`
  }));

  // Gamification features for consumer trips only
  const isConsumer = isConsumerTrip(trip.id.toString());
  const daysUntil = isConsumer ? gamificationService.getDaysUntilTrip(trip.id.toString()) : 0;
  const momentum = isConsumer ? gamificationService.getTripMomentum(trip.id.toString()) : 'cold';

  return (
    <div className="group bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-yellow-500/30 rounded-2xl md:rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl shadow-lg md:shadow-black/20">
      {/* Trip Image/Header - Responsive */}
      <div className="relative h-32 md:h-48 bg-gradient-to-br from-yellow-600/20 via-yellow-500/10 to-transparent p-4 md:p-6">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-80"
          style={{
            backgroundImage: `url('${trip.coverPhoto || 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=200&fit=crop'}')`
          }}
        ></div>
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
                      <Badge variant="secondary" className="bg-red-500/20 text-red-300 border-red-500/30">
                        <Flame size={12} className="mr-1" />
                        Hot
                      </Badge>
                    )}
                    {momentum === 'warm' && (
                      <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                        <TrendingUp size={12} className="mr-1" />
                        Active
                      </Badge>
                    )}
                    {daysUntil > 0 && daysUntil <= 7 && (
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 animate-pulse">
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Trip Content - Responsive padding */}
      <div className="p-4 md:p-6">
        {/* Quick Stats - Responsive sizing */}
        <div className="flex justify-between items-center md:grid md:grid-cols-3 md:gap-4 mb-4 md:mb-6">
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-white">{trip.id === 3 ? '200' : participantsWithAvatars.length}</div>
            <div className="text-xs md:text-sm text-gray-400">People</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-white">5</div>
            <div className="text-xs md:text-sm text-gray-400">Days</div>
          </div>
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-white">{trip.placesCount || 0}</div>
            <div className="text-xs md:text-sm text-gray-400">Places</div>
          </div>
        </div>

        {/* Participants - Responsive sizing */}
        <div className="mb-4 md:mb-6">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <span className="text-sm text-gray-400 font-medium">Travelers</span>
            {/* Invite/User buttons - hidden on mobile to save space */}
            <div className="hidden md:flex gap-2">
              <button
                onClick={() => setShowInviteModal(true)}
                className="text-yellow-400 hover:text-yellow-300 transition-colors p-1 hover:bg-yellow-400/10 rounded-lg"
                title="Invite people to trip"
              >
                <Plus size={16} />
              </button>
              <button className="text-gray-400 hover:text-gray-300 transition-colors p-1 hover:bg-white/10 rounded-lg">
                <User size={16} />
              </button>
            </div>
            {/* Mobile count */}
            <span className="md:hidden text-xs text-gray-500">{participantsWithAvatars.length} people</span>
          </div>

          <div className="flex items-center">
            <div className="flex -space-x-2">
              {participantsWithAvatars.slice(0, 5).map((participant, index) => (
                <TravelerTooltip key={participant.id} name={participant.name}>
                  <div
                    className="relative w-8 md:w-10 h-8 md:h-10 rounded-full bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center text-xs md:text-sm font-semibold text-black border-2 border-gray-900 hover:scale-110 transition-transform duration-200 hover:border-yellow-400 cursor-pointer"
                    style={{ zIndex: participantsWithAvatars.length - index }}
                  >
                    {participant.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                </TravelerTooltip>
              ))}
            </div>
            {participantsWithAvatars.length > 5 && (
              <div className="w-8 md:w-10 h-8 md:h-10 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-xs md:text-sm font-medium text-white ml-1 md:-ml-2">
                +{participantsWithAvatars.length - 5}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons - Responsive sizing */}
        <div className="space-y-3">
          <button
            onClick={handleViewTrip}
            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold py-4 rounded-xl md:rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-lg hover:shadow-yellow-500/25"
          >
            View Trip Details
          </button>

          <div className="grid grid-cols-2 gap-2 md:gap-3">
            <button
              onClick={handleEditItinerary}
              className="bg-gray-800/50 hover:bg-gray-700/50 text-white py-3 px-4 rounded-lg md:rounded-xl transition-all duration-200 font-medium border border-gray-700 hover:border-gray-600 text-sm md:text-base"
            >
              Edit Itinerary
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="bg-gray-800/50 hover:bg-gray-700/50 text-white py-3 px-4 rounded-lg md:rounded-xl transition-all duration-200 font-medium border border-gray-700 hover:border-gray-600 text-sm md:text-base"
            >
              Share Trip
            </button>
          </div>
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
        trip={trip}
      />

      <ArchiveConfirmDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        onConfirm={handleArchiveTrip}
        tripTitle={trip.title}
        isArchiving={true}
      />
    </div>
  );
};
