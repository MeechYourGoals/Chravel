
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, MapPin, Users, Plus, Settings, Edit, FileDown, Camera, Loader2, Crop, LogOut, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InviteModal } from './InviteModal';
import { CoverPhotoCropModal } from './CoverPhotoCropModal';
import { EditableDescription } from './EditableDescription';
import { useTripVariant } from '../contexts/TripVariantContext';
import { useTripCoverPhoto } from '../hooks/useTripCoverPhoto';
import { CategoryTags } from './pro/CategoryTags';
import { ProTripCategory } from '../types/proCategories';
import { CollaboratorsGrid } from './trip/CollaboratorsGrid';
import { CollaboratorsModal } from './trip/CollaboratorsModal';
import { EditTripModal } from './EditTripModal';
import { cn } from '@/lib/utils';
import { useTripMembers } from '../hooks/useTripMembers';
import { useAuth } from '../hooks/useAuth';
import { useDemoMode } from '../hooks/useDemoMode';
import { useJoinRequests } from '../hooks/useJoinRequests';
import { useDemoTripMembersStore } from '../store/demoTripMembersStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Stable empty array to prevent Zustand selector reference changes causing infinite re-renders
const EMPTY_MEMBERS_ARRAY: Array<{ id: number | string; name: string; avatar?: string; role?: string; email?: string }> = [];


interface TripHeaderProps {
  trip: {
    id: number | string;
    title: string;
    location: string;
    dateRange: string;
    description: string;
    participants: Array<{
      id: number | string;
      name: string;
      avatar: string;
      role?: string;
      email?: string;
    }>;
    coverPhoto?: string;
    trip_type?: 'consumer' | 'pro' | 'event';
    created_by?: string;
  };
  onManageUsers?: () => void;
  onDescriptionUpdate?: (description: string) => void;
  onTripUpdate?: (updates: Partial<TripHeaderProps['trip']>) => void;
  onShowExport?: () => void;
  // Pro-specific props
  category?: ProTripCategory;
  tags?: string[];
  onCategoryChange?: (category: ProTripCategory) => void;
}

export const TripHeader = ({ trip, onManageUsers, onDescriptionUpdate, onTripUpdate, onShowExport, category, tags = [], onCategoryChange: _onCategoryChange }: TripHeaderProps) => {
  const navigate = useNavigate();
  const [showInvite, setShowInvite] = useState(false);
  const [showAllCollaborators, setShowAllCollaborators] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [descEditTick, setDescEditTick] = useState(0);
  const { variant, accentColors } = useTripVariant();
  const { coverPhoto, updateCoverPhoto, isUpdating } = useTripCoverPhoto(
    trip.id.toString(), 
    trip.coverPhoto
  );
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const { tripCreatorId, canRemoveMembers, removeMember, leaveTrip } = useTripMembers(trip.id.toString());
  const [isUploading, setIsUploading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  
  // Fetch pending join requests
  const { 
    requests: pendingRequests, 
    approveRequest, 
    rejectRequest, 
    isProcessing: isProcessingRequest 
  } = useJoinRequests({ 
    tripId: trip.id.toString(), 
    enabled: true,
    isDemoMode 
  });
  
  // In demo mode, always treat as admin so the Requests tab shows
  // In authenticated mode, check if user is creator or can remove members
  const [isAdmin, setIsAdmin] = useState(isDemoMode);
  
  useEffect(() => {
    if (isDemoMode) {
      setIsAdmin(true);
      return;
    }
    
    // If we don't have user, can't be admin
    if (!user?.id) {
      setIsAdmin(false);
      return;
    }
    
    // Fast path: check trip.created_by prop first (passed from parent)
    if (trip.created_by && user.id === trip.created_by) {
      setIsAdmin(true);
      return;
    }
    
    // Direct creator check (fast path) - if tripCreatorId is loaded and matches user
    if (tripCreatorId && user.id === tripCreatorId) {
      setIsAdmin(true);
      return;
    }
    
    // If tripCreatorId is still loading (undefined), wait for it
    if (tripCreatorId === undefined) {
      return;
    }
    
    // Full async check including trip_admins table
    const checkAdmin = async () => {
      const canRemove = await canRemoveMembers();
      setIsAdmin(canRemove);
    };
    checkAdmin();
  }, [canRemoveMembers, isDemoMode, user?.id, tripCreatorId, trip.created_by]);
  
  // Get added members from the demo store - use stable empty array to prevent infinite re-renders
  const addedDemoMembers = useDemoTripMembersStore(state => 
    isDemoMode ? (state.addedMembers[trip.id.toString()] ?? EMPTY_MEMBERS_ARRAY) : EMPTY_MEMBERS_ARRAY
  );
  
  // Merge base participants with any dynamically added members (from approved join requests)
  const mergedParticipants = React.useMemo(() => {
    if (!isDemoMode || addedDemoMembers.length === 0) {
      return trip.participants;
    }
    
    // Add new members that aren't already in participants
    const existingIds = new Set(trip.participants.map(p => p.id.toString()));
    const newMembers = addedDemoMembers
      .filter(m => !existingIds.has(m.id.toString()))
      .map(m => ({
        id: m.id,
        name: m.name,
        avatar: m.avatar || '',
        role: m.role,
        email: m.email
      }));
    
    return [...trip.participants, ...newMembers];
  }, [trip.participants, addedDemoMembers, isDemoMode]);
  
  const isPro = variant === 'pro';
  // Export is now available to everyone
  const canExport = true;

  // Handle trip updates from modal
  const handleTripUpdate = (updates: Partial<TripHeaderProps['trip']>) => {
    if (onTripUpdate) {
      onTripUpdate(updates);
    }
  };

  // Handle user leaving the trip
  const handleExitTrip = async () => {
    // Demo mode: simulate leaving the trip
    if (isDemoMode) {
      setIsExiting(true);
      // Simulate a brief delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsExiting(false);
      setShowExitConfirm(false);
      toast.success(`You have left "${trip.title}"`);
      navigate('/');
      return;
    }

    if (!user?.id) {
      toast.error('You must be logged in to leave a trip');
      return;
    }

    // Trip creators cannot leave - they should archive/delete instead
    const creatorId = tripCreatorId || trip.created_by;
    if (user.id === creatorId) {
      toast.error('As the trip creator, you cannot leave. Archive or delete the trip instead.');
      setShowExitConfirm(false);
      return;
    }

    setIsExiting(true);
    const success = await leaveTrip(trip.title);
    setIsExiting(false);

    if (success) {
      setShowExitConfirm(false);
      toast.success(`You have left "${trip.title}"`);
      navigate('/');
    }
  };

  // Check if current user is the trip creator
  const isCurrentUserCreator = user?.id && (user.id === tripCreatorId || user.id === trip.created_by);

  const isProOrEvent = trip.trip_type === 'pro' || trip.trip_type === 'event';
  const isEvent = trip.trip_type === 'event';
  const hasCoverPhoto = Boolean(coverPhoto);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddCoverPhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleAdjustCoverPhoto = () => {
    if (coverPhoto) {
      setCropImageSrc(coverPhoto);
      setShowCropModal(true);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Open crop modal instead of direct upload
    const objectUrl = URL.createObjectURL(file);
    setCropImageSrc(objectUrl);
    setShowCropModal(true);
    
    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowCropModal(false);
    
    // Demo mode: use blob URL
    if (isDemoMode) {
      const objectUrl = URL.createObjectURL(croppedBlob);
      await updateCoverPhoto(objectUrl);
      // Clean up crop source if it was a blob
      if (cropImageSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(cropImageSrc);
      }
      setCropImageSrc(null);
      return;
    }

    // Authenticated mode: upload to Supabase Storage
    if (!user) {
      toast.error('Please sign in to upload cover photos');
      return;
    }

    setIsUploading(true);
    try {
      const fileName = `${trip.id}-${Date.now()}.jpg`;
      const filePath = `trip-covers/${trip.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('trip-media')
        .upload(filePath, croppedBlob, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Failed to upload: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('trip-media')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        toast.error('Failed to get image URL');
        return;
      }

      // Add cache-busting param for re-crops
      const finalUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await updateCoverPhoto(finalUrl);
    } catch (error) {
      console.error('Cover photo upload error:', error);
      toast.error('Failed to upload cover photo');
    } finally {
      setIsUploading(false);
      // Clean up crop source if it was a blob
      if (cropImageSrc?.startsWith('blob:')) {
        URL.revokeObjectURL(cropImageSrc);
      }
      setCropImageSrc(null);
    }
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    if (cropImageSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(cropImageSrc);
    }
    setCropImageSrc(null);
  };

  return (
    <>
      {/* Cover Photo Hero (Consumer Only) - Always show for consumer trips */}
      {!isProOrEvent && (
        <div className="relative mb-8 rounded-3xl overflow-hidden">
          <div 
            className="h-64 bg-cover bg-center relative"
            style={{ 
              backgroundImage: coverPhoto ? `url(${coverPhoto})` : undefined,
              backgroundColor: !coverPhoto ? '#1a1a2e' : undefined
            }}
          >
            {/* Gradient overlay - darker when no photo */}
            <div className={cn(
              "absolute inset-0",
              coverPhoto 
                ? "bg-gradient-to-t from-black/60 via-black/20 to-transparent"
                : "bg-gradient-to-t from-black/80 via-gray-900/90 to-gray-800/70"
            )}></div>
            
            {/* Trip info at bottom */}
            <div className="absolute bottom-6 left-8 right-8 z-10">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-white">{trip.title}</h1>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2 text-white/90">
                  <MapPin size={18} />
                  <span>{trip.location}</span>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  <Calendar size={18} />
                  <span>{trip.dateRange}</span>
                </div>
              </div>
            </div>
            
            {/* Add Cover Photo Button - Show when no cover photo */}
            {!coverPhoto && (
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={handleAddCoverPhotoClick}
                  disabled={isUpdating || isUploading}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2 text-white/80 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add cover photo"
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm font-medium">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Camera size={16} />
                      <span className="text-sm font-medium">Add Cover Photo</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}
            
            {/* Action Buttons - Bottom right */}
            <div className="absolute bottom-2 right-2 z-10 flex items-center gap-2">
              {/* Adjust Position Button - only show when cover photo exists */}
              {coverPhoto && (
                <button
                  onClick={handleAdjustCoverPhoto}
                  disabled={isUpdating || isUploading}
                  className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg transition-all text-white/80 hover:text-white shadow-lg disabled:opacity-50"
                  title="Adjust cover photo position"
                >
                  <Crop size={14} />
                </button>
              )}
              <button
                onClick={() => setShowEditModal(true)}
                className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg transition-all text-white/80 hover:text-white shadow-lg"
                title="Edit trip details"
              >
                <Edit size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Trip Info Section - Compact 75% height */}
      <div 
        className={cn(
          "relative rounded-3xl p-4 mb-3 overflow-hidden border border-white/20",
          hasCoverPhoto && isProOrEvent 
            ? "shadow-2xl" 
            : "bg-white/10 backdrop-blur-md"
        )}
      >
        {/* Background Cover Photo for Pro/Events */}
        {hasCoverPhoto && isProOrEvent && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-500"
              style={{
                backgroundImage: `url(${coverPhoto})`,
                filter: isEvent ? 'brightness(0.25)' : 'brightness(0.35)',
              }}
            />
            <div
              className={cn(
                'absolute inset-0',
                isEvent
                  ? 'bg-gradient-to-t from-black/90 via-black/50 to-transparent'
                  : 'bg-gradient-to-t from-black/70 via-black/40 to-transparent'
              )}
            />
          </>
        )}

        <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-6", hasCoverPhoto && isProOrEvent && "relative z-10")}>
          {/* Left: Trip Details */}
          <div className="space-y-4">
            {/* Show title/location/dates here only for Pro/Event trips (consumer trips show in hero section) */}
            {isProOrEvent && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <h1 className="text-4xl font-bold text-white">{trip.title}</h1>
                </div>
                
                {/* Category Tags for Pro trips */}
                {isPro && category && (
                  <div className="mb-4">
                    <CategoryTags category={category} tags={tags} />
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                  <div className={cn(
                    "flex items-center gap-2",
                    coverPhoto ? "text-white/90" : "text-gray-300"
                  )}>
                    <MapPin size={18} className={coverPhoto ? undefined : `text-${accentColors.primary}`} />
                    <span>{trip.location}</span>
                  </div>
                  <div className={cn(
                    "flex items-center gap-2",
                    coverPhoto ? "text-white/90" : "text-gray-300"
                  )}>
                    <Calendar size={18} className={coverPhoto ? undefined : `text-${accentColors.primary}`} />
                    <span>{trip.dateRange}</span>
                  </div>
                </div>
              </>
            )}
            
            <EditableDescription
              tripId={trip.id.toString()}
              description={trip.description}
              onUpdate={onDescriptionUpdate || (() => {})}
              className="text-gray-300 text-lg leading-relaxed"
              externalEditTrigger={descEditTick}
              hideInlineButtonOnLg
            />
          </div>

          {/* Right: Collaborators Panel - Full width on mobile, constrained on desktop */}
          <div 
            className={cn(
              "rounded-2xl p-3 pb-2 w-full border border-white/10 max-h-[240px]",
              hasCoverPhoto && isProOrEvent 
                ? "bg-black/50 backdrop-blur-md" 
                : "bg-white/5 backdrop-blur-sm"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users size={20} className={`text-${accentColors.primary}`} />
                <h3 className="text-white font-semibold text-sm">
                  {isEvent ? 'Event Team' : 'Trip Collaborators'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">{mergedParticipants.length}</span>
                {onManageUsers && (
                  <button
                    onClick={onManageUsers}
                    className={`text-gray-400 hover:text-${accentColors.primary} transition-colors p-1 rounded-lg hover:bg-white/10`}
                    title="Manage users"
                  >
                    <Settings size={16} />
                  </button>
                )}
              </div>
            </div>
            
            {/* Read-only Category Display for Pro trips */}
            {isPro && category && (
              <div className="mb-3">
                <label className="block text-gray-400 text-xs mb-1">Trip Category</label>
                <div className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm">
                  {category}
                </div>
              </div>
            )}

            <CollaboratorsGrid
              participants={mergedParticipants}
              countLabel={`${mergedParticipants.length} collaborators`}
              onShowAll={() => setShowAllCollaborators(true)}
              maxRows={1}
              minColWidth={140}
              tripType={trip.trip_type || 'consumer'}
            />

            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                onClick={() => setShowInvite(true)}
                className={`flex items-center justify-center gap-1.5 bg-gradient-to-r ${accentColors.gradient} hover:from-${accentColors.primary}/80 hover:to-${accentColors.secondary}/80 text-white text-xs font-medium py-1.5 px-2.5 rounded-lg transition-all duration-200 hover:scale-105`}
                title="Invite people to this trip"
              >
                <Plus size={14} />
                <span>Invite to Trip</span>
              </button>
              
              {/* Exit Trip - Show for authenticated non-creators and demo mode users */}
              {(user?.id || isDemoMode) && !isCurrentUserCreator && (
                <button
                  onClick={() => setShowExitConfirm(true)}
                  className="flex items-center justify-center gap-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 text-xs font-medium py-1.5 px-2.5 rounded-lg transition-all duration-200"
                  title="Leave this trip"
                >
                  <LogOut size={14} />
                  <span>Exit Trip</span>
                </button>
              )}
              
              <button
                onClick={() => canExport && onShowExport?.()}
                disabled={!canExport}
                className={cn(
                  "flex items-center justify-center gap-1.5 text-xs font-medium py-1.5 px-2.5 rounded-lg transition-all duration-200",
                  canExport
                    ? `bg-gradient-to-r ${accentColors.gradient} hover:from-${accentColors.primary}/80 hover:to-${accentColors.secondary}/80 text-white hover:scale-105`
                    : 'bg-gray-700/50 text-gray-400 cursor-not-allowed border border-gray-600/50'
                )}
                title={canExport ? 'Export Trip to PDF' : 'Upgrade for PDF export'}
                aria-label="Export Trip to PDF"
              >
                <FileDown size={14} />
                <span>Export to PDF</span>
              </button>
            </div>
          </div>
        </div>

        {/* Left: Edit Description Button - desktop only, aligned with right edit */}
        <div className="hidden lg:block absolute bottom-2 left-2 z-20">
          <button
            onClick={() => setDescEditTick((t) => t + 1)}
            className={cn(
              "p-1.5 border border-white/20 rounded-lg transition-all shadow-lg backdrop-blur-sm",
              hasCoverPhoto && isProOrEvent
                ? "bg-black/40 hover:bg-black/60 text-white/80 hover:text-white"
                : "bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white"
            )}
            title="Edit description"
          >
            <Edit size={14} />
          </button>
        </div>

        {/* Edit Trip Button - Positioned for Pro/Event trips only (consumer trips have it in hero section) */}
        {isProOrEvent && (
          <div className="absolute bottom-2 right-2 z-20">
            <button
              onClick={() => setShowEditModal(true)}
              className={cn(
                "p-1.5 border border-white/20 rounded-lg transition-all shadow-lg backdrop-blur-sm",
                hasCoverPhoto && isProOrEvent
                  ? "bg-black/40 hover:bg-black/60 text-white/80 hover:text-white"
                  : "bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white"
              )}
              title="Edit trip details"
            >
              <Edit size={14} />
            </button>
          </div>
        )}
      </div>

      <InviteModal
        isOpen={showInvite} 
        onClose={() => setShowInvite(false)}
        tripName={trip.title}
        tripId={trip.id.toString()}
      />

      <CollaboratorsModal
        open={showAllCollaborators}
        onOpenChange={setShowAllCollaborators}
        participants={mergedParticipants}
        tripType={trip.trip_type || 'consumer'}
        currentUserId={user?.id}
        tripCreatorId={tripCreatorId}
        isAdmin={isAdmin}
        onRemoveMember={removeMember}
        pendingRequests={pendingRequests}
        onApproveRequest={approveRequest}
        onRejectRequest={rejectRequest}
        isProcessingRequest={isProcessingRequest}
      />

      <EditTripModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        trip={trip}
        onUpdate={handleTripUpdate}
      />

      {/* Cover Photo Crop Modal */}
      {cropImageSrc && (
        <CoverPhotoCropModal
          isOpen={showCropModal}
          onClose={handleCropCancel}
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Exit Trip Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900/90 backdrop-blur-md border border-white/20 rounded-3xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 text-red-400 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-xl font-bold text-white">Leave Trip?</h3>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to leave "{trip.title}"? You'll lose access to all trip information, chat history, and won't receive updates.
              {isProOrEvent && (
                <span className="block mt-2 text-amber-400 text-sm">
                  Note: This is a {trip.trip_type === 'event' ? 'event' : 'Pro trip'}. You'll need approval to rejoin even with the same invite link.
                </span>
              )}
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                disabled={isExiting}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExitTrip}
                disabled={isExiting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isExiting ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
                Leave Trip
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
