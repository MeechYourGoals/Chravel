import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, MoreHorizontal, Archive, EyeOff, UserPlus, Trash2, FileDown, Share2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { Button } from './ui/button';
import { ArchiveConfirmDialog } from './ArchiveConfirmDialog';
import { DeleteTripConfirmDialog } from './DeleteTripConfirmDialog';
import { InviteModal } from './InviteModal';
import { ShareTripModal } from './share/ShareTripModal';
import { TripExportModal } from './trip/TripExportModal';
import { ProTripData } from '../types/pro';
import { useProTrips } from '../hooks/useProTrips';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';
import { getPeopleCountValue, formatPeopleCount, calculateDaysCount, calculateProTripPlacesCount } from '../utils/tripStatsUtils';
import { useDemoTripMembersStore } from '../store/demoTripMembersStore';
import { useDemoMode } from '../hooks/useDemoMode';
import { getProTripColor } from '../utils/proTripColors';
import { demoModeService } from '../services/demoModeService';
import { openOrDownloadBlob } from '../utils/download';
import { orderExportSections } from '../utils/exportSectionOrder';
import type { ExportSection } from '../types/tripExport';
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
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const { archiveTrip, hideTrip, deleteTripForMe } = useProTrips();
  
  // Get deterministic color for this trip
  const tripColor = getProTripColor(trip.id);
  
  // Get added members from the demo store
  const tripIdStr = trip.id.toString();
  const addedDemoMembers = useDemoTripMembersStore(
    useShallow((state) => isDemoMode && state.addedMembers[tripIdStr] 
      ? state.addedMembers[tripIdStr] 
      : EMPTY_PARTICIPANTS)
  );
  
  // Calculate updated people count including added members
  const totalPeopleCount = React.useMemo(() => {
    let baseCount = getPeopleCountValue(trip);
    if (baseCount === 0) baseCount = 1;
    return baseCount + addedDemoMembers.length;
  }, [trip, addedDemoMembers]);

  const handleViewTrip = () => {
    navigate(`/tour/pro/${trip.id}`);
  };

  const handleArchiveTrip = async () => {
    try {
      await archiveTrip(trip.id);
      toast({
        title: "Professional trip archived",
        description: `"${trip.title}" has been archived.`,
      });
      setShowArchiveDialog(false);
      onArchiveSuccess?.();
    } catch (error) {
      toast({
        title: "Failed to archive trip",
        description: "There was an error archiving your trip.",
        variant: "destructive",
      });
    }
  };

  const handleHideTrip = async () => {
    try {
      await hideTrip(trip.id);
      toast({
        title: "Trip hidden",
        description: `"${trip.title}" is now hidden.`,
      });
      onHideSuccess?.();
    } catch (error) {
      toast({
        title: "Failed to hide trip",
        description: "There was an error hiding your trip.",
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
        description: `"${trip.title}" has been removed.`,
      });
      setShowDeleteDialog(false);
      onDeleteSuccess?.();
    } catch (error) {
      toast({
        title: "Failed to remove trip",
        description: "There was an error removing the trip.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Export handler for Recap - matches TripCard pattern
  // TripExportModal passes only sections, we capture tripId from closure
  const handleExportPdf = useCallback(async (sections: ExportSection[]) => {
    const orderedSections = orderExportSections(sections);
    const isNumericId = !tripIdStr.includes('-'); // UUIDs have dashes, demo IDs don't
    
    toast({
      title: "Creating Recap",
      description: `Building your trip memories for "${trip.title}"...`,
    });

    try {
      let blob: Blob;
      
      if (isDemoMode || isNumericId) {
        // Demo mode - use mock data from services
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
            tripTitle: trip.title,
            destination: trip.location,
            dateRange: trip.dateRange,
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
        // Authenticated mode - fetch real data from Supabase
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
          { customization: { compress: true, maxItemsPerSection: 100 } }
        );
      }

      // Generate filename
      const sanitizedTitle = trip.title.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `ProTrip_${sanitizedTitle}_${Date.now()}.pdf`;

      // Download the blob
      await openOrDownloadBlob(blob, filename, { mimeType: 'application/pdf' });

      toast({
        title: "Recap ready",
        description: `PDF downloaded: ${filename}`,
      });
    } catch (error) {
      console.error('[ProTripCard Export] Error:', error);
      toast({
        title: "Recap failed",
        description: error instanceof Error ? error.message : "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  }, [trip, isDemoMode, toast, tripIdStr]);

  // Share trip data structure
  const shareTrip = {
    id: trip.id,
    title: trip.title,
    location: trip.location,
    dateRange: trip.dateRange,
    participants: trip.participants || [],
    coverPhoto: undefined,
    peopleCount: totalPeopleCount
  };

  return (
    <div className={`group bg-gradient-to-br ${tripColor.cardGradient} backdrop-blur-xl border border-white/20 hover:border-white/40 rounded-2xl md:rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl shadow-lg relative`}>
      
      {/* Hero Section - Dark overlay for text readability */}
      <div className="relative h-32 md:h-48 bg-black/40">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        
        <div className="relative z-10 flex justify-between items-start h-full p-4 md:p-6">
          {/* Trip Info - Inside Hero */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-end">
            <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-white/90 transition-colors line-clamp-2 mb-2">
              {trip.title}
            </h3>
            
            <div className="flex items-center gap-2 text-white/80 mb-1 md:mb-2 text-sm md:text-base">
              <MapPin size={14} className="text-white/60 shrink-0" />
              <span className="font-medium truncate">{trip.location}</span>
            </div>
            
            <div className="flex items-center gap-2 text-white/80 text-sm md:text-base">
              <Calendar size={14} className="text-white/60 shrink-0" />
              <span className="font-medium truncate">{trip.dateRange}</span>
            </div>
          </div>
          
          {/* Menu Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="text-white/60 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all duration-200 h-8 w-8"
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
      </div>

      {/* Content Section */}
      <div className="p-4 md:p-6">
        {/* Stats Row - Matches TripCard exactly */}
        <div className="flex justify-between items-center md:grid md:grid-cols-3 md:gap-4 mb-4 md:mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Users size={12} className="text-white/50" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-white">{formatPeopleCount(totalPeopleCount)}</div>
            <div className="text-xs md:text-sm text-white/60">People</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Calendar size={12} className="text-white/50" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-white">{calculateDaysCount(trip.dateRange)}</div>
            <div className="text-xs md:text-sm text-white/60">Days</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <MapPin size={12} className="text-white/50" />
            </div>
            <div className="text-xl md:text-2xl font-bold text-white">{calculateProTripPlacesCount(trip)}</div>
            <div className="text-xs md:text-sm text-white/60">Places</div>
          </div>
        </div>

        {/* CTA Grid 2x2 - Matches TripCard order: Recap/Invite top, View/Share bottom */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          {/* Top Row: Recap + Invite */}
          <Button
            onClick={() => setShowExportModal(true)}
            variant="ghost"
            className="bg-black/30 hover:bg-black/40 text-white py-2.5 md:py-3 px-2 md:px-3 rounded-lg md:rounded-xl transition-all duration-200 font-medium border border-white/20 hover:border-white/30 text-xs md:text-sm h-auto"
          >
            <FileDown size={14} className="mr-1.5" />
            Recap
          </Button>
          <Button
            onClick={() => setShowInviteModal(true)}
            variant="ghost"
            className="bg-black/30 hover:bg-black/40 text-white py-2.5 md:py-3 px-2 md:px-3 rounded-lg md:rounded-xl transition-all duration-200 font-medium border border-white/20 hover:border-white/30 text-xs md:text-sm h-auto"
          >
            <UserPlus size={14} className="mr-1.5" />
            Invite
          </Button>
          
          {/* Bottom Row: View + Share */}
          {/* View button uses neutral dark style (NOT yellow like Regular TripCard) */}
          <Button
            onClick={handleViewTrip}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 md:py-3 px-2 md:px-3 rounded-lg md:rounded-xl transition-all duration-300 text-xs md:text-sm h-auto border border-white/10"
          >
            View
          </Button>
          <Button
            onClick={() => setShowShareModal(true)}
            variant="ghost"
            className="bg-black/30 hover:bg-black/40 text-white py-2.5 md:py-3 px-2 md:px-3 rounded-lg md:rounded-xl transition-all duration-200 font-medium border border-white/20 hover:border-white/30 text-xs md:text-sm h-auto"
          >
            <Share2 size={14} className="mr-1.5" />
            Share
          </Button>
        </div>
      </div>

      {/* Modals */}
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

      <ShareTripModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        trip={shareTrip}
      />

      <TripExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        tripId={trip.id.toString()}
        tripName={trip.title}
        onExport={handleExportPdf}
      />
    </div>
  );
};
