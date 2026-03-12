import React from 'react';
import { X, MapPin, Calendar, Users } from 'lucide-react';

interface InviteModalHeaderProps {
  tripName: string;
  onClose: () => void;
  coverPhoto?: string;
  location?: string;
  dateRange?: string;
  peopleCount?: number;
}

export const InviteModalHeader = ({
  tripName,
  onClose,
  coverPhoto,
  location,
  dateRange,
  peopleCount,
}: InviteModalHeaderProps) => {
  const hasTripPreview = coverPhoto || location || dateRange;

  return (
    <>
      {/* Close Button - Fixed Position */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 hover:bg-white/20 text-white w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        title="Close"
      >
        <X size={20} />
      </button>

      {hasTripPreview ? (
        <>
          {/* Header Title */}
          <div className="mb-3 pr-10">
            <h2 className="text-xl font-bold text-white">Invite to Trip</h2>
          </div>

          {/* Trip Preview Card - matches ShareTripModal design */}
          <div className="relative rounded-xl overflow-hidden mb-3 border border-border">
            {/* Cover Image */}
            <div
              className="h-24 bg-cover bg-center"
              style={{
                backgroundImage: `url('${coverPhoto || '/chravelapp-og-20251219.png'}')`,
              }}
            />
            <div className="absolute inset-0 h-24 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Chravel Badge */}
            <div className="absolute top-1.5 left-1.5 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
              <span className="text-white text-[10px] font-semibold">ChravelApp</span>
            </div>

            {/* Trip Details */}
            <div className="p-3 bg-gradient-to-br from-gray-900/95 to-gray-800/95">
              <h3 className="text-base font-bold text-white mb-2">{tripName}</h3>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-white/80 text-xs">
                {location && (
                  <div className="flex items-center gap-1">
                    <MapPin size={12} className="text-gold-primary" />
                    <span>{location}</span>
                  </div>
                )}
                {dateRange && (
                  <div className="flex items-center gap-1">
                    <Calendar size={12} className="text-gold-primary" />
                    <span>{dateRange}</span>
                  </div>
                )}
                {peopleCount != null && peopleCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Users size={12} className="text-gold-primary" />
                    <span>{Math.max(peopleCount, 1)} Chravelers</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Fallback: simple text header when no trip preview data */
        <div className="mb-3 pr-10">
          <h2 className="text-xl font-bold text-white">Invite to Trip</h2>
          <p className="text-gray-400 text-sm">{tripName}</p>
        </div>
      )}
    </>
  );
};
