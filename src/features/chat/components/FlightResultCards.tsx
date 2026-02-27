import React from 'react';
import {
  Plane,
  Calendar,
  Users,
  ExternalLink,
  BookmarkPlus,
  BookmarkCheck,
  Clock,
  ArrowRight,
} from 'lucide-react';

export interface FlightResult {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  deeplink: string;
  // Rich fields from the structured card schema
  provider?: string | null;
  price?: {
    amount?: number | null;
    currency?: string | null;
    display?: string | null;
  } | null;
  airline?: string | null;
  flightNumber?: string | null;
  stops?: number | null;
  durationMinutes?: number | null;
  departTime?: string | null;
  arriveTime?: string | null;
  refundable?: boolean | null;
}

interface FlightResultCardsProps {
  flights: FlightResult[];
  className?: string;
  onSave?: (flight: FlightResult) => void;
  /** Whether a given URL/key is already saved to the trip */
  isSaved?: (url: string) => boolean;
  isSaving?: boolean;
}

const toExternalHttpsUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^https:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^http:\/\//i.test(trimmed)) {
    return `https://${trimmed.slice('http://'.length)}`;
  }

  return null;
};

const formatDuration = (minutes?: number | null): string | null => {
  if (minutes == null) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const formatStops = (stops?: number | null): string | null => {
  if (stops == null) return null;
  if (stops === 0) return 'Nonstop';
  if (stops === 1) return '1 stop';
  return `${stops} stops`;
};

export const FlightResultCards: React.FC<FlightResultCardsProps> = ({
  flights,
  className,
  onSave,
  isSaved,
  isSaving,
}) => {
  if (!flights || flights.length === 0) return null;

  return (
    <div className={`flex flex-col gap-2.5 ${className ?? ''}`}>
      {flights.map((flight, idx) => {
        const deeplink = toExternalHttpsUrl(flight.deeplink);
        const saved = isSaved ? isSaved(flight.deeplink) : false;
        const durationLabel = formatDuration(flight.durationMinutes);
        const stopsLabel = formatStops(flight.stops);

        return (
          <div
            key={`${flight.origin}-${flight.destination}-${flight.departureDate}-${idx}`}
            className="flex flex-col gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 backdrop-blur-sm overflow-hidden"
          >
            {/* Route + price row */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <Plane size={20} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span className="uppercase">{flight.origin}</span>
                    <ArrowRight size={14} className="text-gray-400 shrink-0" />
                    <span className="uppercase">{flight.destination}</span>
                  </div>
                  {flight.price?.display && (
                    <span className="shrink-0 text-sm font-bold text-blue-300">
                      {flight.price.display}
                    </span>
                  )}
                </div>

                {/* Airline + flight number */}
                {(flight.airline || flight.provider) && (
                  <p className="text-xs text-blue-200/70 mt-0.5">
                    {flight.airline ?? flight.provider}
                    {flight.flightNumber && ` · ${flight.flightNumber}`}
                  </p>
                )}
              </div>
            </div>

            {/* Details row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {/* Depart/arrive times */}
              {(flight.departTime || flight.arriveTime) && (
                <span className="flex items-center gap-1 text-xs text-blue-200/80">
                  <Clock size={11} className="shrink-0" />
                  {[flight.departTime, flight.arriveTime].filter(Boolean).join(' → ')}
                </span>
              )}

              {/* Date */}
              <div className="flex items-center gap-1 text-xs text-blue-200/80">
                <Calendar size={11} className="shrink-0" />
                <span>
                  {flight.departureDate}
                  {flight.returnDate ? ` – ${flight.returnDate}` : ''}
                </span>
              </div>

              {/* Passengers */}
              {flight.passengers > 1 && (
                <div className="flex items-center gap-1 text-xs text-blue-200/80">
                  <Users size={11} className="shrink-0" />
                  <span>{flight.passengers}</span>
                </div>
              )}

              {/* Duration */}
              {durationLabel && <span className="text-xs text-blue-200/80">{durationLabel}</span>}

              {/* Stops */}
              {stopsLabel && (
                <span
                  className={`text-xs font-medium ${flight.stops === 0 ? 'text-emerald-400' : 'text-blue-200/80'}`}
                >
                  {stopsLabel}
                </span>
              )}

              {/* Refundable */}
              {flight.refundable === true && (
                <span className="text-xs text-emerald-400">Refundable</span>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {deeplink ? (
                <a
                  href={deeplink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Check Availability
                  <ExternalLink size={12} />
                </a>
              ) : (
                <div className="flex-1 flex items-center justify-center py-2 bg-blue-900/30 text-blue-200/70 text-xs font-medium rounded-lg">
                  Link unavailable
                </div>
              )}
              {onSave && (
                <button
                  type="button"
                  onClick={() => onSave(flight)}
                  disabled={saved || isSaving}
                  className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    saved
                      ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                      : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 hover:text-white'
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
