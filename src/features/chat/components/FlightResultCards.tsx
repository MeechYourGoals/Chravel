import React from 'react';
import { Plane, Calendar, Users, ExternalLink, BookmarkPlus } from 'lucide-react';

export interface FlightResult {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  deeplink: string;
}

interface FlightResultCardsProps {
  flights: FlightResult[];
  className?: string;
  onSave?: (flight: FlightResult) => void;
  isSaved?: (flight: FlightResult) => boolean;
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

export const FlightResultCards: React.FC<FlightResultCardsProps> = ({
  flights,
  className,
  onSave,
  isSaved,
}) => {
  if (!flights || flights.length === 0) return null;

  return (
    <div className={`flex flex-col gap-2.5 ${className ?? ''}`}>
      {flights.map((flight, idx) => {
        const deeplink = toExternalHttpsUrl(flight.deeplink);
        const saved = isSaved?.(flight) ?? false;

        return (
          <div
            key={`${flight.origin}-${flight.destination}-${flight.departureDate}-${idx}`}
            className="flex flex-col gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-3.5 backdrop-blur-sm overflow-hidden"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <Plane size={20} className="text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className="uppercase">{flight.origin}</span>
                  <span className="text-gray-400">→</span>
                  <span className="uppercase">{flight.destination}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-blue-200/80">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>
                      {flight.departureDate}
                      {flight.returnDate ? ` - ${flight.returnDate}` : ''}
                    </span>
                  </div>
                  {flight.passengers > 1 && (
                    <div className="flex items-center gap-1">
                      <Users size={12} />
                      <span>{flight.passengers}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

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
                  disabled={saved}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-80 text-blue-200 hover:text-white text-xs font-medium rounded-lg transition-colors"
                  title="Save to Trip"
                >
                  <BookmarkPlus size={16} />
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
