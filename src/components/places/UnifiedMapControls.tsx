import React, { FormEvent } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export interface UnifiedMapControlsProps {
  // Search props
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: FormEvent) => void;
  suggestions: google.maps.places.AutocompletePrediction[];
  showSuggestions: boolean;
  isSearching: boolean;
  searchError: string | null;
  searchOrigin: { lat: number; lng: number } | null;
  
  // Base Camp Context props
  activeContext: 'trip' | 'personal';
  onContextChange: (context: 'trip' | 'personal') => void;
  tripBasecampSet: boolean;
  personalBasecampSet: boolean;
  
  // State handlers
  onClearSearch: () => void;
  onSuggestionClick: (prediction: google.maps.places.AutocompletePrediction) => void;
  isMapLoading: boolean;
}

export const UnifiedMapControls: React.FC<UnifiedMapControlsProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  suggestions,
  showSuggestions,
  isSearching,
  searchError,
  searchOrigin,
  activeContext,
  onContextChange,
  tripBasecampSet,
  personalBasecampSet,
  onClearSearch,
  onSuggestionClick,
  isMapLoading
}) => {
  return (
    <div className="absolute top-2 right-2 z-20 w-64 md:w-56 sm:portrait:w-48">
      {/* Search Bar Section - Base Camp buttons removed (moved to main layout) */}
      <div className="bg-gray-900/90 backdrop-blur-lg rounded-lg p-3 shadow-lg border border-white/10">
        <form onSubmit={onSearchSubmit} className="relative">
          <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) {
                // Trigger show suggestions via parent
              }
            }}
            placeholder={isSearching ? "Searching..." : "Search locations..."}
            disabled={isMapLoading}
            className={`w-full bg-white/95 backdrop-blur-sm border border-gray-300 rounded-md pl-9 pr-9 py-2 md:py-1.5 sm:py-1.5 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm md:text-xs sm:text-[10px] disabled:opacity-70 disabled:cursor-not-allowed ${isSearching ? 'opacity-75' : ''}`}
          />
          {/* Clear/Loading Button */}
          {isSearching ? (
            <Loader2 size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 animate-spin z-10" />
          ) : searchQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-48 overflow-y-auto z-30">
              {suggestions.map((prediction) => (
                <button
                  key={prediction.place_id}
                  type="button"
                  onClick={() => onSuggestionClick(prediction)}
                  className="w-full text-left px-3 py-2 md:px-2 md:py-1.5 sm:px-2 sm:py-1 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="text-xs md:text-[11px] sm:text-[10px] text-gray-900 font-medium">
                    {prediction.structured_formatting?.main_text || prediction.description}
                  </div>
                  {prediction.structured_formatting?.secondary_text && (
                    <div className="text-[11px] md:text-[10px] sm:text-[9px] text-gray-500 mt-0.5">
                      {prediction.structured_formatting.secondary_text}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </form>

        {/* Error Message */}
        {searchError && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-md px-2 py-1.5 text-[10px] md:text-[9px] sm:text-[8px] text-red-700">
            {searchError}
          </div>
        )}

        {/* Context Info Chip */}
        {searchOrigin && (
          <div className="mt-2 bg-blue-50/95 backdrop-blur-sm border border-blue-200 rounded-md px-2 py-1 text-[10px] md:text-[9px] sm:text-[8px] text-blue-700 text-center">
            Biased to <span className="font-semibold">{activeContext === 'trip' ? 'Trip' : 'Personal'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
