import React from 'react';
import { Plane, Calendar, Users, ExternalLink, BookmarkPlus, BookmarkCheck } from 'lucide-react';

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
  isUrlSaved?: (url: string) => boolean;
  isSaving?: boolean;
}

export const FlightResultCards: React.FC<FlightResultCardsProps> = ({
  flights,
  className,
  onSave,
  isUrlSaved,
  isSaving,
}) => {
  if (!flights || flights.length === 0) return null;

  return (
    <div className={`flex flex-col gap-2.5 ${className ?? ''}`}>
      {flights.map((flight, idx) => (
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
            <a
              href={flight.deeplink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
            >
              Check Availability
              <ExternalLink size={12} />
            </a>
            {onSave &&
              (() => {
                const saved = isUrlSaved ? isUrlSaved(flight.deeplink) : false;
                return (
                  <button
                    type="button"
                    onClick={() => onSave(flight)}
                    disabled={saved || isSaving}
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                      saved
                        ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                        : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 hover:text-white'
                    }`}
                    title={saved ? 'Saved' : 'Save Flight'}
                  >
                    {saved ? <BookmarkCheck size={16} /> : <BookmarkPlus size={16} />}
                  </button>
                );
              })()}
          </div>
        </div>
      ))}
    </div>
  );
};
