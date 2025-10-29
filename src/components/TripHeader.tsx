
import React, { useState } from 'react';
import { Calendar, MapPin, Users, Plus, Settings, Edit, FileDown } from 'lucide-react';
import { InviteModal } from './InviteModal';
import { TripCoverPhotoUpload } from './TripCoverPhotoUpload';
import { EditableDescription } from './EditableDescription';
import { useAuth } from '../hooks/useAuth';
import { useTripVariant } from '../contexts/TripVariantContext';
import { useTripCoverPhoto } from '../hooks/useTripCoverPhoto';
import { CategorySelector } from './pro/CategorySelector';
import { CategoryTags } from './pro/CategoryTags';
import { ProTripCategory } from '../types/proCategories';
import { CollaboratorsGrid } from './trip/CollaboratorsGrid';
import { CollaboratorsModal } from './trip/CollaboratorsModal';
import { EditTripModal } from './EditTripModal';
import { Trip } from '@/services/tripService';
import { formatDateRange } from '@/utils/dateFormatters';
import { cn } from '@/lib/utils';


interface TripHeaderProps {
  trip: {
    id: number;
    title: string;
    location: string;
    dateRange: string;
    description: string;
    participants: Array<{
      id: number;
      name: string;
      avatar: string;
      role?: string;
    }>;
    coverPhoto?: string;
    trip_type?: 'consumer' | 'pro' | 'event';
  };
  onManageUsers?: () => void;
  onDescriptionUpdate?: (description: string) => void;
  onTripUpdate?: (updates: Partial<Trip>) => void;
  onShowExport?: () => void;
  // Pro-specific props
  category?: ProTripCategory;
  tags?: string[];
  onCategoryChange?: (category: ProTripCategory) => void;
}

export const TripHeader = ({ trip, onManageUsers, onDescriptionUpdate, onTripUpdate, onShowExport, category, tags = [], onCategoryChange }: TripHeaderProps) => {
  const { user } = useAuth();
  const [showInvite, setShowInvite] = useState(false);
  const [showAllCollaborators, setShowAllCollaborators] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { variant, accentColors } = useTripVariant();
  const { coverPhoto, updateCoverPhoto } = useTripCoverPhoto(trip);
  const isPro = variant === 'pro';
  // Export is now available to everyone
  const canExport = true;

  // Handle trip updates from modal
  const handleTripUpdate = (updates: Partial<Trip>) => {
    if (onTripUpdate) {
      // Format dateRange if dates are updated
      if (updates.start_date && updates.end_date) {
        const dateRange = formatDateRange(updates.start_date, updates.end_date);
        onTripUpdate({
          ...updates,
          name: updates.name || trip.title,
          destination: updates.destination || trip.location
        });
      } else {
        onTripUpdate(updates);
      }
    }
  };

  const isProOrEvent = trip.trip_type === 'pro' || trip.trip_type === 'event';
  const isEvent = trip.trip_type === 'event';
  const hasCoverPhoto = Boolean(coverPhoto);

  return (
    <>
      {/* Cover Photo Hero (Consumer Only) */}
      {coverPhoto && !isProOrEvent ? (
        <div className="relative mb-8 rounded-3xl overflow-hidden">
          <div 
            className="h-64 bg-cover bg-center"
            style={{ backgroundImage: `url(${coverPhoto})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
            <div className="absolute bottom-6 left-8 right-8">
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
            
            {/* Edit Trip Button - Bottom right */}
            <div className="absolute bottom-6 right-6 z-10">
              <button
                onClick={() => setShowEditModal(true)}
                className="p-3 bg-black/30 hover:bg-black/50 backdrop-blur-sm border border-white/20 rounded-xl transition-all text-white/70 hover:text-white shadow-lg"
                title="Edit trip details"
              >
                <Edit size={20} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Trip Info Section - With or Without Background Overlay */}
      <div 
        className={cn(
          "relative rounded-3xl p-6 mb-4 overflow-hidden border border-white/20",
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

        <div className={cn("flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6", hasCoverPhoto && isProOrEvent && "relative z-10")}>
          {/* Left: Trip Details */}
          <div className="flex-1 space-y-4">
            {!coverPhoto && (
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-4xl font-bold text-white">{trip.title}</h1>
              </div>
            )}
            
            {/* Category Tags for Pro trips */}
            {isPro && category && (
              <div className="mb-4">
                <CategoryTags category={category} tags={tags} />
              </div>
            )}
            
            {!coverPhoto && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-gray-300">
                  <MapPin size={18} className={`text-${accentColors.primary}`} />
                  <span>{trip.location}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar size={18} className={`text-${accentColors.primary}`} />
                  <span>{trip.dateRange}</span>
                </div>
              </div>
            )}
            
            <EditableDescription
              tripId={trip.id.toString()}
              description={trip.description}
              onUpdate={onDescriptionUpdate || (() => {})}
              className="text-gray-300 text-lg leading-relaxed"
            />
          </div>

          {/* Right: Collaborators Panel */}
          <div 
            className={cn(
              "rounded-2xl p-4 min-w-[280px] lg:w-[40%] border border-white/10",
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
            
            {/* Category Selector for Pro trips */}
            {isPro && category && onCategoryChange && (
              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">Trip Category</label>
                <CategorySelector
                  selectedCategory={category}
                  onCategoryChange={onCategoryChange}
                />
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

        {/* Edit Trip Button - Positioned for all layouts except consumer with cover */}
        {!(coverPhoto && !isProOrEvent) && (
          <div className="absolute bottom-4 right-4 z-20">
            <button
              onClick={() => setShowEditModal(true)}
              className={cn(
                "p-3 border border-white/20 rounded-xl transition-all shadow-lg backdrop-blur-sm",
                hasCoverPhoto && isProOrEvent
                  ? "bg-black/40 hover:bg-black/60 text-white/80 hover:text-white"
                  : "bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white"
              )}
              title="Edit trip details"
            >
              <Edit size={20} />
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
