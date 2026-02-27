import React from 'react';
import { MapPin, Star, ExternalLink, UtensilsCrossed, BookmarkPlus } from 'lucide-react';

export interface PlaceResult {
  placeId?: string | null;
  name: string;
  address?: string;
  rating?: number | null;
  userRatingCount?: number | null;
  priceLevel?: string | null;
  mapsUrl?: string | null;
  previewPhotoUrl?: string | null;
  photoUrls?: string[];
}

interface PlaceResultCardsProps {
  places: PlaceResult[];
  className?: string;
  onSave?: (place: PlaceResult) => void;
}

const PRICE_MAP: Record<string, string> = {
  PRICE_LEVEL_FREE: 'Free',
  PRICE_LEVEL_INEXPENSIVE: '$',
  PRICE_LEVEL_MODERATE: '$$',
  PRICE_LEVEL_EXPENSIVE: '$$$',
  PRICE_LEVEL_VERY_EXPENSIVE: '$$$$',
};

export const PlaceResultCards: React.FC<PlaceResultCardsProps> = ({
  places,
  className,
  onSave,
}) => {
  if (!places || places.length === 0) return null;

  return (
    <div className={`flex flex-col gap-2.5 ${className ?? ''}`}>
      {places.slice(0, 3).map((place, idx) => {
        const photoSrc = place.previewPhotoUrl || place.photoUrls?.[0] || null;
        // Only render known price levels — silently drop PRICE_LEVEL_UNSPECIFIED and other unknowns
        const priceLabel = place.priceLevel ? (PRICE_MAP[place.priceLevel] ?? null) : null;

        return (
          <div
            key={place.placeId || idx}
            className="flex gap-3 rounded-xl border border-border bg-card/80 p-2.5 backdrop-blur-sm overflow-hidden"
          >
            {/* Thumbnail — always reserve the slot; show icon placeholder when no photo */}
            <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
              {photoSrc ? (
                <img
                  src={photoSrc}
                  alt={place.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={e => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    // Show parent's placeholder icon when image fails
                    const parent = (e.target as HTMLImageElement).parentElement;
                    if (parent) parent.classList.add('items-center', 'justify-center');
                  }}
                />
              ) : (
                <UtensilsCrossed size={24} className="text-muted-foreground/40" />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-semibold text-foreground truncate">{place.name}</h4>

                {/* Rating row */}
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {place.rating != null && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-400">
                      <Star size={12} className="fill-amber-400" />
                      {place.rating.toFixed(1)}
                    </span>
                  )}
                  {place.userRatingCount != null && (
                    <span className="text-[11px] text-muted-foreground">
                      ({place.userRatingCount.toLocaleString()})
                    </span>
                  )}
                  {priceLabel && (
                    <span className="text-[11px] text-muted-foreground font-medium">
                      · {priceLabel}
                    </span>
                  )}
                </div>

                {/* Address */}
                {place.address && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                    <MapPin size={10} className="flex-shrink-0" />
                    {place.address}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-1.5">
                {/* Open in Maps */}
                {place.mapsUrl && (
                  <a
                    href={place.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline w-fit"
                  >
                    <ExternalLink size={10} />
                    Open in Maps
                  </a>
                )}

                {/* Save to Trip */}
                {onSave && (
                  <button
                    onClick={() => onSave(place)}
                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors w-fit"
                  >
                    <BookmarkPlus size={10} />
                    Save to Trip
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
