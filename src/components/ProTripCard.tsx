
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Eye, Users, Clock, MoreHorizontal, Archive, EyeOff, UserPlus, Trash2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from './ui/button';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { DeleteTripConfirmDialog } from './DeleteTripConfirmDialog';
import { InviteModal } from './InviteModal';
import { ProTripData } from '../types/pro';
import { useTripVariant } from '../contexts/TripVariantContext';
import { useProTrips } from '../hooks/useProTrips';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { getPeopleCountValue, formatPeopleCount, calculateDaysCount, calculateProTripPlacesCount } from '../utils/tripStatsUtils';
import { useDemoTripMembersStore } from '../store/demoTripMembersStore';
import { useDemoMode } from '../hooks/useDemoMode';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

// Stable empty array reference - prevents infinite re-renders from Zustand selector
const EMPTY_PARTICIPANTS: Array<{id: number | string; name: string; avatar?: string}> = [];

interface ProTripCardProps {
  trip: ProTripData;
  onArchiveSuccess?: () => void;
  onHideSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export const ProTripCard = ({ trip, onArchiveSuccess, onHideSuccess, onDeleteSuccess }: ProTripCardProps) => {
  const navigate = useNavigate();
  const { accentColors } = useTripVariant();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const { archiveTrip, hideTrip, deleteTripForMe } = useProTrips();
  
  // Get added members from the demo store - use stable empty array reference with shallow comparison
  const tripIdStr = trip.id.toString();
  const addedDemoMembers = useDemoTripMembersStore(
    useShallow((state) => isDemoMode && state.addedMembers[tripIdStr] 
      ? state.addedMembers[tripIdStr] 
      : EMPTY_PARTICIPANTS)
  );
  
  // Calculate updated people count including added members
  const totalPeopleCount = React.useMemo(() => {
    let baseCount = getPeopleCountValue(trip);
    // Ensure at least 1 person (creator) is counted
    if (baseCount === 0) baseCount = 1;
    
    return formatPeopleCount(baseCount + addedDemoMembers.length);
  }, [trip, addedDemoMembers]);

  const handleViewTrip = () => {
    navigate(`/tour/pro/${trip.id}`);
  };

  const handleArchiveTrip = async () => {
    try {
      await archiveTrip(trip.id);
      toast({
        title: "Professional trip archived",
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
      await hideTrip(trip.id);
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

  const handleDeleteTripForMe = async () => {
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
      await deleteTripForMe({ tripId: trip.id.toString(), userId: user.id });
      toast({
        title: "Trip removed",
        description: `"${trip.title}" has been removed from your account.`,
      });
      setShowDeleteDialog(false);
      onDeleteSuccess?.();
    } catch (error) {
      toast({
        title: "Failed to remove trip",
        description: "There was an error removing the trip. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Get next load-in event from schedule
  const getNextLoadIn = () => {
    if (!trip.schedule || trip.schedule.length === 0) return null;
    
    const now = new Date();
    const loadInEvents = trip.schedule
      .filter(event => event.type === 'load-in')
      .filter(event => new Date(event.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    return loadInEvents.length > 0 ? loadInEvents[0] : null;
  };

  const nextLoadIn = getNextLoadIn();

  // Default fallback image for Pro trips without a cover photo
  const defaultCoverPhoto = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=200&fit=crop';
  const coverPhoto = trip.coverPhoto || defaultCoverPhoto;

  return (
    <div className={`bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-3xl overflow-hidden hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl group hover:border-${accentColors.primary}/50 relative`}>
      {/* Cover Photo Hero */}
      <div className="relative h-32 md:h-48 bg-gradient-to-br from-gray-700/20 via-gray-600/10 to-transparent">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-80"
          style={{
            backgroundImage: `url('${coverPhoto}')`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Card Content */}
      <div className="p-6 pt-4">
        {/* Menu */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">

          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white/60 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
            >
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-background border-border">
            <DropdownMenuItem
              onClick={() => setShowArchiveDialog(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive Trip
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleHideTrip}
              className="text-muted-foreground hover:text-foreground"
            >
              <EyeOff className="mr-2 h-4 w-4" />
              Hide Trip
            </DropdownMenuItem>
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

      {/* Header - Removed category badges and tags */}
      <div className="mb-4 pr-12 pl-12">
        <h3 className={`text-xl font-semibold text-white group-hover:text-${accentColors.secondary} transition-colors mb-2`}>
          {trip.title}
        </h3>

        {/* Status Pills */}
        {nextLoadIn && (
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="flex items-center gap-1 bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-xs border border-orange-500/30">
              <Clock size={12} />
              <span>Next Load-In: {new Date(nextLoadIn.startTime).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="flex items-center gap-3 text-white/80 mb-4">
        <div className={`w-8 h-8 bg-${accentColors.primary}/20 backdrop-blur-sm rounded-lg flex items-center justify-center`}>
          <MapPin size={16} className={`text-${accentColors.primary}`} />
        </div>
        <span className="font-medium">{trip.location}</span>
      </div>

      {/* Date */}
      <div className="flex items-center gap-3 text-white/80 mb-6">
        <div className={`w-8 h-8 bg-${accentColors.secondary}/20 backdrop-blur-sm rounded-lg flex items-center justify-center`}>
          <Calendar size={16} className={`text-${accentColors.secondary}`} />
        </div>
        <span className="font-medium">{trip.dateRange}</span>
      </div>

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
          <div className="text-lg font-bold text-white">{calculateDaysCount(trip.dateRange)}</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <MapPin size={14} className={`text-${accentColors.primary}`} />
            <span className="text-xs text-white/60 uppercase tracking-wide">Places</span>
          </div>
          <div className="text-lg font-bold text-white">{calculateProTripPlacesCount(trip)}</div>
        </div>
      </div>

      {/* Action Buttons - Side by Side */}
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        <Button
          onClick={handleViewTrip}
          className="bg-gray-800/50 hover:bg-gray-700/50 text-white py-2.5 md:py-3 px-3 rounded-lg md:rounded-xl transition-all duration-200 font-medium border border-gray-700 hover:border-gray-600 text-xs md:text-sm h-auto"
          variant="ghost"
        >
          <Eye size={16} className="mr-2" />
          View Trip
        </Button>
        
        <Button
          onClick={() => setShowInviteModal(true)}
          className={`bg-gradient-to-r ${accentColors.gradient} hover:opacity-90 text-white transition-all duration-300 font-semibold py-2.5 md:py-3 px-3 rounded-lg md:rounded-xl text-xs md:text-sm h-auto`}
        >
          <UserPlus size={16} className="mr-2" />
          Invite
        </Button>
      </div>
      </div>

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
      />

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        tripName={trip.title}
        proTripId={trip.id}
        tripType="pro"
      />
    </div>
  );
};
