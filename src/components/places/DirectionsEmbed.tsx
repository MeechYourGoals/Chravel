import React, { useState } from 'react';
import { MapPin, ArrowUpDown, X, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BasecampLocation } from '@/types/basecamp';
import { PersonalBasecamp } from '@/services/basecampService';

interface DirectionsEmbedProps {
  tripBasecamp?: BasecampLocation | null;
  personalBasecamp?: PersonalBasecamp | null;
}

export const DirectionsEmbed: React.FC<DirectionsEmbedProps> = ({
  tripBasecamp,
  personalBasecamp,
}) => {
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [directionsUrl, setDirectionsUrl] = useState<string | null>(null);
  const [showDirections, setShowDirections] = useState(false);

  // Quick-fill handlers
  const fillFromTripBasecamp = (field: 'from' | 'to') => {
    if (tripBasecamp?.address) {
      if (field === 'from') {
        setFromText(tripBasecamp.address);
      } else {
        setToText(tripBasecamp.address);
      }
    }
  };

  const fillFromPersonalBasecamp = (field: 'from' | 'to') => {
    if (personalBasecamp?.address) {
      if (field === 'from') {
        setFromText(personalBasecamp.address);
      } else {
        setToText(personalBasecamp.address);
      }
    }
  };

  // Swap From and To
  const handleSwap = () => {
    const temp = fromText;
    setFromText(toText);
    setToText(temp);
  };

  // Generate Google Maps directions URL
  const handleGetDirections = () => {
    if (!fromText.trim() || !toText.trim()) return;

    const saddr = encodeURIComponent(fromText.trim());
    const daddr = encodeURIComponent(toText.trim());
    const url = `https://www.google.com/maps?output=embed&saddr=${saddr}&daddr=${daddr}`;

    setDirectionsUrl(url);
    setShowDirections(true);
  };

  // Close directions and return to input form
  const handleClose = () => {
    setShowDirections(false);
    setDirectionsUrl(null);
  };

  const canGetDirections = fromText.trim() && toText.trim();

  // Directions view
  if (showDirections && directionsUrl) {
    return (
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl border border-white/10 overflow-hidden">
        {/* Header with close button */}
        <div className="flex items-center justify-between p-3 border-b border-white/10">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Navigation size={18} className="text-primary flex-shrink-0" />
            <span className="text-white font-medium text-sm truncate">
              {fromText} → {toText}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Directions Embed */}
        <div className="h-[350px]">
          <iframe
            src={directionsUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Google Maps Directions"
          />
        </div>
      </div>
    );
  }

  // Input form view
  return (
    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl p-4 border border-white/10">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <Navigation size={18} className="text-primary" />
        Get Directions
      </h3>

      {/* From Field */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <label className="text-sm text-gray-300 font-medium">From</label>
          {tripBasecamp?.address && (
            <button
              type="button"
              onClick={() => fillFromTripBasecamp('from')}
              className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
            >
              Trip Base Camp
            </button>
          )}
          {personalBasecamp?.address && (
            <button
              type="button"
              onClick={() => fillFromPersonalBasecamp('from')}
              className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
            >
              Personal Base Camp
            </button>
          )}
        </div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <MapPin size={16} />
          </div>
          <input
            type="text"
            value={fromText}
            onChange={(e) => setFromText(e.target.value)}
            placeholder="Enter any location, venue, or address..."
            className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-9 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors text-sm"
          />
          {fromText && (
            <button
              type="button"
              onClick={() => setFromText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Swap Button */}
      <div className="flex justify-center my-2">
        <button
          type="button"
          onClick={handleSwap}
          className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
          title="Swap locations"
        >
          <ArrowUpDown size={18} />
        </button>
      </div>

      {/* To Field */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <label className="text-sm text-gray-300 font-medium">To</label>
          {tripBasecamp?.address && (
            <button
              type="button"
              onClick={() => fillFromTripBasecamp('to')}
              className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
            >
              Trip Base Camp
            </button>
          )}
          {personalBasecamp?.address && (
            <button
              type="button"
              onClick={() => fillFromPersonalBasecamp('to')}
              className="text-xs text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
            >
              Personal Base Camp
            </button>
          )}
        </div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <MapPin size={16} />
          </div>
          <input
            type="text"
            value={toText}
            onChange={(e) => setToText(e.target.value)}
            placeholder="Enter destination..."
            className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-9 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors text-sm"
          />
          {toText && (
            <button
              type="button"
              onClick={() => setToText('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Get Directions Button */}
      <Button
        onClick={handleGetDirections}
        disabled={!canGetDirections}
        className="w-full"
        size="sm"
      >
        <Navigation size={16} />
        Get Directions
      </Button>
    </div>
  );
};
