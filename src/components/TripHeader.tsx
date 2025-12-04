
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, MapPin, Users, Plus, Settings, Edit, FileDown, Camera, Loader2 } from 'lucide-react';
import { InviteModal } from './InviteModal';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';


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
  const [showInvite, setShowInvite] = useState(false);
  const [showAllCollaborators, setShowAllCollaborators] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [descEditTick, setDescEditTick] = useState(0);
  const { variant, accentColors } = useTripVariant();
  const { coverPhoto, updateCoverPhoto, isUpdating } = useTripCoverPhoto(
    trip.id.toString(), 
    trip.coverPhoto
  );
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const { tripCreatorId, canRemoveMembers, removeMember } = useTripMembers(trip.id.toString());
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Check if current user can remove members
  useEffect(() => {
    const checkAdmin = async () => {
      const canRemove = await canRemoveMembers();
      setIsAdmin(canRemove);
    };
    checkAdmin();
  }, [canRemoveMembers]);
  
  const isPro = variant === 'pro';
  // Export is now available to everyone
  const canExport = true;

  // Handle trip updates from modal
  const handleTripUpdate = (updates: Partial<TripHeaderProps['trip']>) => {
    if (onTripUpdate) {
      onTripUpdate(updates);
    }
  };

  const isProOrEvent = trip.trip_type === 'pro' || trip.trip_type === 'event';
  const isEvent = trip.trip_type === 'event';
  const hasCoverPhoto = Boolean(coverPhoto);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddCoverPhotoClick = () => {
    fileInputRef.current?.click();
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

    // Demo mode: use blob URL (it's fine for demo)
    if (isDemoMode) {
      const objectUrl = URL.createObjectURL(file);
      const success = await updateCoverPhoto(objectUrl);
      if (success && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Authenticated mode: upload to Supabase Storage
    if (!user) {
      toast.error('Please sign in to upload cover photos');
      return;
    }

    setIsUploading(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${trip.id}-${Date.now()}.${fileExt}`;
      const filePath = `trip-covers/${trip.id}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('trip-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload cover photo');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('trip-photos')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        toast.error('Failed to get image URL');
        return;
      }

      // Update cover photo with real URL
      const success = await updateCoverPhoto(urlData.publicUrl);
      
      if (success && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Cover photo upload error:', error);
      toast.error('Failed to upload cover photo');
    } finally {
      setIsUploading(false);
    }
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
            
            {/* Edit Trip Button - Bottom right */}
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

        <div className={cn("flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4", hasCoverPhoto && isProOrEvent && "relative z-10")}>
          {/* Left: Trip Details */}
          <div className="flex-1 space-y-4">
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
              "rounded-2xl p-3 pb-2 w-full lg:min-w-[280px] lg:w-[40%] border border-white/10 max-h-[240px]",
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
                <span className="text-gray-400 text-sm">{trip.participants.length}</span>
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
              participants={trip.participants}
              countLabel={`${trip.participants.length} collaborators`}
              onShowAll={() => setShowAllCollaborators(true)}
              maxRows={1}
              minColWidth={140}
              tripType={trip.trip_type || 'consumer'}
            />

            <div className="mt-3 flex gap-3">
              <button
                onClick={() => setShowInvite(true)}
                className={`flex-1 flex items-center justify-center gap-2 bg-gradient-to-r ${accentColors.gradient} hover:from-${accentColors.primary}/80 hover:to-${accentColors.secondary}/80 text-white text-sm font-medium py-2.5 px-4 rounded-xl transition-all duration-200 hover:scale-105`}
                title="Invite people to this trip"
              >
                <Plus size={16} />
                <span>Invite to Trip</span>
              </button>
              <button
                onClick={() => canExport && onShowExport?.()}
                disabled={!canExport}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2.5 px-4 rounded-xl transition-all duration-200",
                  canExport
                    ? `bg-gradient-to-r ${accentColors.gradient} hover:from-${accentColors.primary}/80 hover:to-${accentColors.secondary}/80 text-white hover:scale-105`
                    : 'bg-gray-700/50 text-gray-400 cursor-not-allowed border border-gray-600/50'
                )}
                title={canExport ? 'Export Trip to PDF' : 'Upgrade for PDF export'}
                aria-label="Export Trip to PDF"
              >
                <FileDown size={16} />
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
        participants={trip.participants}
        tripType={trip.trip_type || 'consumer'}
        currentUserId={user?.id}
        tripCreatorId={tripCreatorId}
        isAdmin={isAdmin}
        onRemoveMember={removeMember}
      />

      <EditTripModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        trip={trip}
        onUpdate={handleTripUpdate}
      />
    </>
  );
};
