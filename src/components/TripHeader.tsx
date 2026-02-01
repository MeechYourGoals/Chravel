import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  Plus,
  Settings,
  Edit,
  FileDown,
  Camera,
  Loader2,
  
  LogOut,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
const EMPTY_MEMBERS_ARRAY: Array<{
  id: number | string;
  name: string;
  avatar?: string;
  role?: string;
  email?: string;
}> = [];

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
  // ⚡ PERFORMANCE: Optional pre-loaded member data to avoid duplicate fetches
  preloadedTripCreatorId?: string | null;
  preloadedCanRemoveMembers?: () => Promise<boolean>;
  preloadedRemoveMember?: (userId: string) => Promise<boolean>;
  preloadedLeaveTrip?: (tripName: string) => Promise<boolean>;
  // 🔄 FIX: Loading state to show skeleton for members
  isMembersLoading?: boolean;
  // 📐 Drawer layout mode: hero and details fill 50/50 split
  drawerLayout?: boolean;
}

export const TripHeader = ({
  trip,
  onManageUsers,
  onDescriptionUpdate,
  onTripUpdate,
  onShowExport,
  category,
  tags = [],
  onCategoryChange: _onCategoryChange,
  // ⚡ PERFORMANCE: Use pre-loaded data when available to avoid duplicate fetches
  preloadedTripCreatorId,
  preloadedCanRemoveMembers,
  preloadedRemoveMember,
  preloadedLeaveTrip,
  // 🔄 FIX: Loading state to show skeleton for members
  isMembersLoading = false,
  // 📐 Drawer layout mode
  drawerLayout = false,
}: TripHeaderProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showInvite, setShowInvite] = useState(false);
  const [showAllCollaborators, setShowAllCollaborators] = useState(false);
  const [collaboratorsInitialTab, setCollaboratorsInitialTab] = useState<'members' | 'requests'>(
    'members',
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [descEditTick, setDescEditTick] = useState(0);

  // Handle URL param to open collaborators modal on specific tab
  // This runs on mount and whenever searchParams changes
  useEffect(() => {
    const showCollaboratorsParam = searchParams.get('showCollaborators');
    if (showCollaboratorsParam === 'requests' || showCollaboratorsParam === 'members') {
      // Set the tab and open modal
      setCollaboratorsInitialTab(showCollaboratorsParam);
      setShowAllCollaborators(true);

      // Clear the URL param after a small delay to ensure state is applied
      // This prevents the param from interfering with other navigation
      const timeoutId = setTimeout(() => {
        const newParams = new URLSearchParams(window.location.search);
        if (newParams.get('showCollaborators')) {
          newParams.delete('showCollaborators');
          setSearchParams(newParams, { replace: true });
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [searchParams, setSearchParams]);
  const { variant, accentColors } = useTripVariant();
  const { coverPhoto, updateCoverPhoto, isUpdating } = useTripCoverPhoto(
    trip.id.toString(),
    trip.coverPhoto,
  );
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();

  // ⚡ PERFORMANCE: Only call useTripMembers if preloaded data not provided
  // This prevents duplicate network requests when parent already has this data
  const needsOwnMemberData = preloadedTripCreatorId === undefined;
  const memberHookData = useTripMembers(needsOwnMemberData ? trip.id.toString() : undefined);

  // Use preloaded data if available, otherwise use hook data
  const tripCreatorId = preloadedTripCreatorId ?? memberHookData.tripCreatorId;
  const canRemoveMembers = preloadedCanRemoveMembers ?? memberHookData.canRemoveMembers;
  const removeMember = preloadedRemoveMember ?? memberHookData.removeMember;
  const leaveTrip = preloadedLeaveTrip ?? memberHookData.leaveTrip;
  const [isUploading, setIsUploading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);

  // Fetch pending join requests
  const {
    requests: pendingRequests,
    approveRequest,
    rejectRequest,
    dismissRequest,
    isProcessing: isProcessingRequest,
  } = useJoinRequests({
    tripId: trip.id.toString(),
    enabled: true,
    isDemoMode,
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
    isDemoMode
      ? (state.addedMembers[trip.id.toString()] ?? EMPTY_MEMBERS_ARRAY)
      : EMPTY_MEMBERS_ARRAY,
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
        email: m.email,
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

    setIsExiting(true);
    const success = await leaveTrip(trip.title);
    setIsExiting(false);

    if (success) {
      setShowExitConfirm(false);
      toast.success(`You have left "${trip.title}"`);
      navigate('/');
    }
  };

  // Check if current user is the trip creator (used for conditional UI in future)
  const _isCurrentUserCreator =
    user?.id && (user.id === tripCreatorId || user.id === trip.created_by);

  const isProOrEvent = trip.trip_type === 'pro' || trip.trip_type === 'event';
  const isEvent = trip.trip_type === 'event';
  const hasCoverPhoto = Boolean(coverPhoto);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddCoverPhotoClick = () => {
    fileInputRef.current?.click();
  };

  // handleAdjustCoverPhoto removed - all crop controls now in Edit Trip Details modal

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
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error(`Failed to upload: ${uploadError.message}`);
        return;
      }

      const { data: urlData } = supabase.storage.from('trip-media').getPublicUrl(filePath);

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
      {/* Cover Photo Hero - Show for ALL trip types (consumer, pro, event) */}
      {(
        <div
          data-trip-section="hero"
          className={cn(
            'relative rounded-2xl md:rounded-3xl overflow-hidden bg-cover bg-center',
            drawerLayout ? 'h-full min-h-[320px] mb-0' : 'aspect-[3/1] min-h-[200px] mb-0 md:mb-8',
          )}
          style={{
            backgroundImage: coverPhoto ? `url(${coverPhoto})` : undefined,
            backgroundColor: !coverPhoto ? '#1a1a2e' : undefined,
          }}
        >
          {/* Gradient overlay - stronger at top and bottom for title/location readability */}
          <div
            className={cn(
              'absolute inset-0',
              coverPhoto
                ? 'bg-gradient-to-b from-black/50 via-transparent to-black/60'
                : 'bg-gradient-to-b from-black/70 via-gray-900/60 to-black/70',
            )}
          />

          {/* Trip title at TOP-LEFT */}
          <div className="absolute top-4 left-4 right-16 z-10">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white drop-shadow-lg line-clamp-2">
              {trip.title}
            </h1>
          </div>

          {/* Location and dates at BOTTOM-LEFT - stacked vertically */}
          <div className="absolute bottom-4 left-4 right-20 z-10">
            <div className="flex flex-col gap-1 text-lg font-bold text-white">
              {trip.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={18} className="text-primary" />
                  {trip.location}
                </span>
              )}
              {trip.dateRange && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={18} className="text-primary" />
                  {trip.dateRange}
                </span>
              )}
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

          {/* Edit Button - Bottom right */}
          <div className="absolute bottom-2 right-2 z-10">
            <button
              onClick={() => setShowEditModal(true)}
              className="p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg transition-all text-white/80 hover:text-white shadow-lg"
              title="Edit trip details"
            >
              <Edit size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Main Trip Info Section - Compact 75% height */}
      <div
        data-trip-section="details"
        className={cn(
          'relative rounded-2xl md:rounded-3xl p-3 md:p-4 overflow-hidden border border-white/20 bg-white/10 backdrop-blur-md',
          drawerLayout
            ? 'h-full min-h-0 overflow-y-auto mb-0 pb-[env(safe-area-inset-bottom,20px)]'
            : 'mb-0 md:mb-3',
        )}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Trip Details */}
          <div className="space-y-4">
            {/* Category Tags for Pro trips - shown below hero */}
            {isPro && category && (
              <div className="mb-2">
                <CategoryTags category={category} tags={tags} />
              </div>
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
            className="rounded-2xl p-3 pb-2 w-full border border-white/10 max-h-[240px] bg-white/5 backdrop-blur-sm"
          >
            {/* Header: Trip Members | count | Show all - consolidated layout */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users size={20} className={`text-${accentColors.primary}`} />
                <h3 className="text-white font-semibold text-sm">
                  {isEvent ? 'Event Team' : 'Trip Members'}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {/* Show loading indicator or count */}
                {isMembersLoading ? (
                  <span className="w-6 h-4 bg-white/10 rounded animate-pulse" />
                ) : (
                  <span className="text-gray-400 text-sm">{mergedParticipants.length}</span>
                )}
                <button
                  className="text-xs font-medium underline text-gray-200 hover:text-white"
                  onClick={() => setShowAllCollaborators(true)}
                  aria-label="Show all members"
                >
                  Show all
                </button>
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

            {/* Show skeleton chips when loading members for authenticated trips */}
            {isMembersLoading && mergedParticipants.length === 0 ? (
              <div
                className="flex flex-wrap gap-2"
                style={{ maxHeight: '88px', overflow: 'hidden' }}
              >
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 w-[140px] animate-pulse"
                  >
                    <div className="h-7 w-7 rounded-full bg-white/10 shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-white/10 rounded w-16" />
                      <div className="h-2 bg-white/10 rounded w-10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <CollaboratorsGrid
                participants={mergedParticipants}
                onShowAll={() => setShowAllCollaborators(true)}
                maxRows={1}
                minColWidth={120}
                tripType={trip.trip_type || 'consumer'}
                pendingRequestsCount={isAdmin ? pendingRequests.length : 0}
                hideBottomRow
              />
            )}

            {/* Pending Requests Alert - only shown when admin has requests to review */}
            {pendingRequests.length > 0 && isAdmin && (
              <button
                onClick={() => {
                  setCollaboratorsInitialTab('requests');
                  setShowAllCollaborators(true);
                }}
                className="mt-2 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs hover:bg-amber-500/20 transition-colors w-full"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span>
                  {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}{' '}
                  to review
                </span>
              </button>
            )}

            {/* Action buttons - distributed layout */}
            <div className="mt-3 flex flex-nowrap justify-between items-center overflow-x-auto scrollbar-hide">
              {/* Left-aligned: Invite */}
              <button
                onClick={() => setShowInvite(true)}
                className="flex items-center justify-center gap-1 bg-gray-800/50 hover:bg-gray-700/50 text-white text-xs font-medium py-1.5 px-2.5 rounded-lg transition-all duration-200 border border-gray-700 hover:border-gray-600 shrink-0"
                title="Invite people to this trip"
              >
                <Plus size={14} />
                <span>Invite</span>
              </button>

              {/* Center: PDF Recap */}
              <button
                onClick={() => canExport && onShowExport?.()}
                disabled={!canExport}
                className={cn(
                  'flex items-center justify-center gap-1 text-xs font-medium py-1.5 px-2.5 rounded-lg transition-all duration-200 shrink-0',
                  canExport
                    ? 'bg-gray-800/50 hover:bg-gray-700/50 text-white border border-gray-700 hover:border-gray-600'
                    : 'bg-gray-700/50 text-gray-400 cursor-not-allowed border border-gray-600/50',
                )}
                title={canExport ? 'Create PDF Recap' : 'Upgrade for PDF recap'}
                aria-label="Create PDF Recap"
              >
                <FileDown size={14} />
                <span>PDF Recap</span>
              </button>

              {/* Right-aligned: Leave Trip */}
              <button
                onClick={() => setShowExitConfirm(true)}
                className="flex items-center justify-center gap-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 text-xs font-medium py-1.5 px-2.5 rounded-lg transition-all duration-200 shrink-0"
                title="Leave this trip"
              >
                <LogOut size={14} />
                <span>Leave Trip</span>
              </button>
            </div>
          </div>
        </div>

        {/* Left: Edit Description Button - desktop only, aligned with right edit */}
        <div className="hidden lg:block absolute bottom-2 left-2 z-20">
          <button
            onClick={() => setDescEditTick(t => t + 1)}
            className="p-1.5 border border-white/20 rounded-lg transition-all shadow-lg backdrop-blur-sm bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white"
            title="Edit description"
          >
            <Edit size={14} />
          </button>
        </div>
      </div>

      <InviteModal
        isOpen={showInvite}
        onClose={() => setShowInvite(false)}
        tripName={trip.title}
        tripId={trip.id.toString()}
        tripType={trip.trip_type || 'consumer'}
      />

      <CollaboratorsModal
        open={showAllCollaborators}
        onOpenChange={open => {
          setShowAllCollaborators(open);
          // Reset to members tab when closing
          if (!open) {
            setCollaboratorsInitialTab('members');
          }
        }}
        participants={mergedParticipants}
        tripType={trip.trip_type || 'consumer'}
        tripId={trip.id.toString()}
        currentUserId={user?.id}
        tripCreatorId={tripCreatorId}
        isAdmin={isAdmin}
        onRemoveMember={removeMember}
        pendingRequests={pendingRequests}
        onApproveRequest={approveRequest}
        onRejectRequest={rejectRequest}
        onDismissRequest={dismissRequest}
        isProcessingRequest={isProcessingRequest}
        initialTab={collaboratorsInitialTab}
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
          aspectRatio={drawerLayout ? 4/3 : 3}
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
              Are you sure you want to leave "{trip.title}"? You'll lose access to all trip
              information, chat history, and won't receive updates.
              {isProOrEvent && (
                <span className="block mt-2 text-amber-400 text-sm">
                  Note: This is a {trip.trip_type === 'event' ? 'event' : 'Pro trip'}. You'll need
                  approval to rejoin even with the same invite link.
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
