
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Crown, FileText, Eye, Users, Clock, MoreHorizontal, Archive, EyeOff, UserPlus } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { TravelerTooltip } from './ui/traveler-tooltip';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { TripExportModal } from './trip/TripExportModal';
import { InviteModal } from './InviteModal';
import { ProTripData } from '../types/pro';
import { useTripVariant } from '../contexts/TripVariantContext';
import { archiveTrip, hideTrip } from '../services/archiveService';
import { useToast } from '../hooks/use-toast';
import { calculatePeopleCount, calculateDaysCount, calculateProTripPlacesCount } from '../utils/tripStatsUtils';
import { processTeamMembers, processRoles } from '../utils/teamDisplayUtils';
import { getInitials } from '../utils/avatarUtils';
import { ExportSection } from '../types/tripExport';
import { generateClientPDF } from '../utils/exportPdfClient';
import { getExportData } from '../services/tripExportDataService';
import { openOrDownloadBlob } from '../utils/download';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface ProTripCardProps {
  trip: ProTripData;
}

export const ProTripCard = ({ trip }: ProTripCardProps) => {
  const navigate = useNavigate();
  const { accentColors } = useTripVariant();
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { toast } = useToast();

  const handleViewTrip = () => {
    navigate(`/tour/pro/${trip.id}`);
  };

  const handleExportTrip = () => {
    setShowExportModal(true);
  };

  const handleExport = async (sections: ExportSection[]) => {
    try {
      toast({
        title: "Generating PDF...",
        description: "Please wait while we create your export.",
      });

      const exportData = await getExportData(trip.id, sections);
      
      // Capture the blob returned from generateClientPDF
      const blob = await generateClientPDF(
        {
          tripId: trip.id,
          tripTitle: trip.title,
          destination: trip.location,
          dateRange: trip.dateRange,
          description: trip.description,
          ...exportData,
        },
        sections,
        {
          customization: {
            compress: true,
            maxItemsPerSection: 100,
          }
        }
      );
      
      // Generate filename and trigger download
      const filename = `ProTrip_${trip.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
      await openOrDownloadBlob(blob, filename, { mimeType: 'application/pdf' });
      
      toast({
        title: "Export successful",
        description: "Your trip summary has been downloaded as a PDF.",
      });
      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "There was an error generating your PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleArchiveTrip = () => {
    archiveTrip(trip.id, 'pro');
    toast({
      title: "Professional trip archived",
      description: `"${trip.title}" has been archived. View it in the Archived tab.`,
    });
  };

  const handleHideTrip = async () => {
    try {
      await hideTrip(trip.id);
      toast({
        title: "Trip hidden",
        description: `"${trip.title}" is now hidden. Enable "Show Hidden Trips" in Settings to view it.`,
      });
    } catch (error) {
      toast({
        title: "Failed to hide trip",
        description: "There was an error hiding your trip. Please try again.",
        variant: "destructive",
      });
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

  // Process participants for display
  const participantsWithAvatars = trip.participants;

  // Process team members and roles for display
  const { visible: visibleMembers, overflow: memberOverflow } = processTeamMembers(participantsWithAvatars, 5);
  const { visible: visibleRoles, overflow: roleOverflow } = processRoles(participantsWithAvatars, 5);

  return (
    <div className={`bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 rounded-3xl p-6 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl group hover:border-${accentColors.primary}/50 relative overflow-hidden`}>
      {/* Crown Badge - Only show if roster exists and has members */}
      {trip.roster && trip.roster.length > 0 && (
        <div className="absolute top-4 left-4">
          <Tooltip>
            <TooltipTrigger>
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 p-2 rounded-lg shadow-lg">
                <Crown size={14} className="text-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Professional Trip</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Pro Badge and Menu */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger>
            <div className={`bg-gradient-to-r ${accentColors.gradient} p-2 rounded-lg`}>
              <Crown size={16} className="text-white" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Pro Feature Demo</p>
          </TooltipContent>
        </Tooltip>
        
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Header - Removed category badges and tags */}
      <div className="mb-4 pr-12 pl-12">
        <h3 className={`text-xl font-semibold text-white group-hover:text-${accentColors.secondary} transition-colors mb-3`}>
          {trip.title}
        </h3>

        {/* Status Pills - Roster and Next Load-In */}
        <div className="flex flex-wrap gap-2 mb-4">
          {trip.roster && trip.roster.length > 0 && (
            <div className="flex items-center gap-1 bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-xs border border-blue-500/30">
              <Users size={12} />
              <span>Team: {trip.roster.length}</span>
            </div>
          )}
          {nextLoadIn && (
            <div className="flex items-center gap-1 bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-xs border border-orange-500/30">
              <Clock size={12} />
              <span>Next Load-In: {new Date(nextLoadIn.startTime).toLocaleDateString()}</span>
            </div>
          )}
        </div>
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
          <div className="text-lg font-bold text-white">{calculatePeopleCount(trip)}</div>
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

      {/* Team Members with Roles */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm text-white/70 font-medium">Team Members:</span>
        </div>
        
        <div className="flex -space-x-3 mb-2">
          {visibleMembers.map((participant, index) => (
            <TravelerTooltip key={participant.id} name={`${participant.name} - ${participant.role}`}>
              <div style={{ zIndex: visibleMembers.length - index }}>
                <Avatar className={`w-10 h-10 border-2 border-white/30 hover:scale-110 transition-transform duration-200 hover:border-${accentColors.primary}`}>
                  <AvatarFallback className="bg-white/20 text-white font-semibold text-sm">
                    {getInitials(participant.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TravelerTooltip>
          ))}
          {memberOverflow > 0 && (
            <div className="w-10 h-10 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-xs font-medium text-white">
              +{memberOverflow}
            </div>
          )}
        </div>

        <div className="text-xs text-white/60">
          Roles: {visibleRoles.join(', ')}{roleOverflow > 0 && ` +${roleOverflow} more`}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <Button
          onClick={() => setShowInviteModal(true)}
          className={`w-full bg-gradient-to-r ${accentColors.gradient} hover:opacity-90 text-white transition-all duration-300 font-medium`}
        >
          <UserPlus size={16} className="mr-2" />
          Invite to Trip
        </Button>
        
        <div className="flex gap-2">
          <Button
            onClick={handleViewTrip}
            className={`flex-1 bg-gradient-to-r from-${accentColors.primary}/20 to-${accentColors.secondary}/20 backdrop-blur-sm border border-white/20 hover:border-white/40 text-white hover:text-${accentColors.secondary} transition-all duration-300 font-medium hover:shadow-lg`}
            variant="ghost"
          >
            <Eye size={16} className="mr-2" />
            View Trip
          </Button>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleExportTrip}
                className="bg-white/10 backdrop-blur-sm border border-white/20 hover:border-glass-green/40 text-white hover:text-glass-green transition-all duration-300"
                variant="ghost"
                size="icon"
              >
                <FileText size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export Details</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Pro Features Highlight */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className={`text-xs text-${accentColors.secondary}/80 flex items-center gap-1`}>
          <Crown size={12} />
          <span>Pro: Team roles, broadcasts, permissions</span>
        </div>
      </div>

      <ArchiveConfirmDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        onConfirm={handleArchiveTrip}
        tripTitle={trip.title}
        isArchiving={true}
      />

      <TripExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExport={handleExport}
        tripName={trip.title}
        tripId={trip.id}
      />

      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        tripName={trip.title}
        tripId={trip.id}
      />
    </div>
  );
};
