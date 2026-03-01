import React from 'react';
import {
  Hotel,
  Star,
  MapPin,
  Calendar,
  ExternalLink,
  BookmarkPlus,
  BookmarkCheck,
  CheckCircle,
  Tag,
} from 'lucide-react';

export interface HotelResult {
  id?: string | null;
  provider?: string | null;
  title: string;
  subtitle?: string | null;
  badges?: string[];
  price?: {
    amount?: number | null;
    currency?: string | null;
    display?: string | null;
  } | null;
  dates?: {
    check_in?: string | null;
    check_out?: string | null;
  } | null;
  location?: {
    city?: string | null;
    region?: string | null;
    country?: string | null;
  } | null;
  details?: {
    rating?: number | null;
    reviews_count?: number | null;
    refundable?: boolean | null;
    amenities?: string[];
  } | null;
  deep_links?: {
    primary?: string | null;
    secondary?: string | null;
  } | null;
}

interface HotelResultCardsProps {
  hotels: HotelResult[];
  className?: string;
  onSave?: (hotel: HotelResult) => void;
  isSaved?: (url: string) => boolean;
  isSaving?: boolean;
}

const toExternalHttpsUrl = (value?: string | null): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https:\/\//i.test(trimmed)) return trimmed;
  if (/^http:\/\//i.test(trimmed)) return `https://${trimmed.slice('http://'.length)}`;
  return null;
};

const formatCheckDates = (dates?: HotelResult['dates']): string | null => {
  if (!dates?.check_in) return null;
  const parts: string[] = [];
  parts.push(dates.check_in);
  if (dates.check_out) parts.push(dates.check_out);
  return parts.join(' → ');
};

const formatLocation = (location?: HotelResult['location']): string | null => {
  if (!location) return null;
  const parts = [location.city, location.region, location.country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
};

export const HotelResultCards: React.FC<HotelResultCardsProps> = ({
  hotels,
  className,
  onSave,
  isSaved,
  isSaving,
}) => {
  if (!hotels || hotels.length === 0) return null;

  return (
    <div className={`flex flex-col gap-2.5 ${className ?? ''}`}>
      {hotels.slice(0, 3).map((hotel, idx) => {
        const primaryUrl = toExternalHttpsUrl(hotel.deep_links?.primary);
        const savedKey = primaryUrl ?? hotel.title;
        const saved = isSaved ? isSaved(savedKey) : false;
        const checkDates = formatCheckDates(hotel.dates);
        const locationLabel = formatLocation(hotel.location);
        const amenities = hotel.details?.amenities?.slice(0, 4) ?? [];

        return (
          <div
            key={hotel.id ?? `hotel-${idx}`}
            className="flex flex-col gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 backdrop-blur-sm overflow-hidden"
          >
            {/* Header row */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Hotel size={20} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-white truncate">{hotel.title}</h4>
                  {hotel.price?.display && (
                    <span className="shrink-0 text-sm font-bold text-emerald-300">
                      {hotel.price.display}
                    </span>
                  )}
                </div>
                {hotel.subtitle && (
                  <p className="text-xs text-emerald-200/80 mt-0.5 truncate">{hotel.subtitle}</p>
                )}
              </div>
            </div>

            {/* Details row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {/* Rating */}
              {hotel.details?.rating != null && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <Star size={12} className="fill-amber-400" />
                  {hotel.details.rating.toFixed(1)}
                  {hotel.details.reviews_count != null && (
                    <span className="text-emerald-200/60 ml-0.5">
                      ({hotel.details.reviews_count.toLocaleString()})
                    </span>
                  )}
                </span>
              )}

              {/* Location */}
              {locationLabel && (
                <span className="flex items-center gap-1 text-xs text-emerald-200/80">
                  <MapPin size={11} className="shrink-0" />
                  {locationLabel}
                </span>
              )}

              {/* Check-in / Check-out */}
              {checkDates && (
                <span className="flex items-center gap-1 text-xs text-emerald-200/80">
                  <Calendar size={11} className="shrink-0" />
                  {checkDates}
                </span>
              )}

              {/* Refundable */}
              {hotel.details?.refundable === true && (
                <span className="flex items-center gap-1 text-xs text-emerald-300">
                  <CheckCircle size={11} className="shrink-0" />
                  Refundable
                </span>
              )}
            </div>

            {/* Amenity badges */}
            {amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {amenities.map(amenity => (
                  <span
                    key={amenity}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-200/80 text-[10px] font-medium"
                  >
                    <Tag size={9} />
                    {amenity}
                  </span>
                ))}
              </div>
            )}

            {/* Badges from provider */}
            {hotel.badges && hotel.badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {hotel.badges.map(badge => (
                  <span
                    key={badge}
                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-600/20 text-emerald-300 text-[10px] font-medium border border-emerald-500/20"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              {primaryUrl ? (
                <a
                  href={primaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  View Hotel
                  <ExternalLink size={12} />
                </a>
              ) : (
                <div className="flex-1 flex items-center justify-center py-2 bg-emerald-900/30 text-emerald-200/70 text-xs font-medium rounded-lg">
                  Link unavailable
                </div>
              )}

              {onSave && (
                <button
                  type="button"
                  onClick={() => onSave(hotel)}
                  disabled={saved || isSaving}
                  className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    saved
                      ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 hover:text-white'
                  }`}
                  title={saved ? 'Saved' : 'Save to Trip'}
                >
                  {saved ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}
                  {saved ? 'Saved ✓' : 'Save to Trip'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
