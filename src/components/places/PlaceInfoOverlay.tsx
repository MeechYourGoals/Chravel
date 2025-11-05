import React from 'react';
import { MapPin, ExternalLink, Navigation, X, Car } from 'lucide-react';
import { PlacePhotoGallery } from './PlacePhotoGallery';

export interface PlaceInfo {
  name: string;
  address?: string;
  website?: string;
  rating?: number;
  coordinates?: { lat: number; lng: number };
  placeId?: string;
  distance?: {
    distance: string;
    duration: string;
    mode: string;
  } | null;
  photos?: string[];
}

interface PlaceInfoOverlayProps {
  place: PlaceInfo | null;
  onClose: () => void;
  onViewDirections?: () => void;
  activeContext?: 'trip' | 'personal';
}

export const PlaceInfoOverlay: React.FC<PlaceInfoOverlayProps> = ({
  place,
  onClose,
  onViewDirections,
  activeContext = 'trip'
}) => {
  if (!place) return null;

  const handleViewLargerMap = () => {
    if (place.placeId) {
      window.open(`https://www.google.com/maps/place/?q=place_id:${place.placeId}`, '_blank');
    } else if (place.coordinates) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${place.coordinates.lat},${place.coordinates.lng}`, '_blank');
    }
  };

  return (
    <div className="absolute top-4 left-4 z-20 bg-white rounded-xl shadow-2xl border border-gray-200 max-w-sm w-full md:w-80 overflow-hidden">
      {/* Photo Gallery */}
      <PlacePhotoGallery 
        photos={place.photos} 
        placeName={place.name}
        maxPhotos={3}
      />
      
      <div className="p-4">
        {/* Header with close button */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-gray-900 font-semibold text-base mb-1 truncate">
              {place.name}
            </h3>
            {place.address && (
              <p className="text-gray-600 text-sm flex items-start gap-1">
                <MapPin size={14} className="flex-shrink-0 mt-0.5" />
                <span className="line-clamp-2">{place.address}</span>
              </p>
            )}
            {place.rating && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-500 text-sm">★</span>
                <span className="text-gray-700 text-sm font-medium">{place.rating}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-1 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Distance Info */}
        {place.distance && (
          <div className="mb-3 pb-3 border-b border-gray-200 bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Car size={14} className="text-blue-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-blue-800">
                From {activeContext === 'trip' ? 'Trip' : 'Personal'} Base Camp
              </span>
            </div>
            <div className="text-sm text-blue-900 font-medium">
              {place.distance.distance} · {place.distance.duration}
            </div>
          </div>
        )}

        {/* Website Link */}
        {place.website && (
          <div className="mb-3 pb-3 border-b border-gray-200">
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="flex items-start gap-2 text-blue-600 hover:text-blue-700 group">
                <ExternalLink size={14} className="flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium group-hover:underline block">Visit Website</span>
                  <span className="text-xs text-gray-500 truncate block mt-0.5">{place.website}</span>
                </div>
              </div>
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {onViewDirections && place.coordinates && (
            <button
              onClick={onViewDirections}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Navigation size={14} />
              Directions
            </button>
          )}
          <button
            onClick={handleViewLargerMap}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            <ExternalLink size={14} />
            View Larger Map
          </button>
        </div>
      </div>
    </div>
  );
};
