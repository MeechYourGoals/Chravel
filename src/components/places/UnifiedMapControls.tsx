import React, { FormEvent } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export interface UnifiedMapControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: FormEvent) => void;
  isSearching: boolean;
  searchError: string | null;
  onClearSearch: () => void;
  isMapLoading: boolean;
}

export const UnifiedMapControls: React.FC<UnifiedMapControlsProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  isSearching,
  searchError,
  onClearSearch,
  isMapLoading
}) => {
  return (
    <div className="absolute top-2 right-2 z-20 w-64 md:w-56 sm:portrait:w-48">
      <div className="bg-gray-900/90 backdrop-blur-lg rounded-lg p-3 shadow-lg border border-white/10">
        <form onSubmit={onSearchSubmit} className="relative">
          <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={isSearching ? "Searching..." : "Search locations..."}
            disabled={isMapLoading || isSearching}
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
        </form>

        {/* Error Message */}
        {searchError && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-md px-2 py-1.5 text-[10px] md:text-[9px] sm:text-[8px] text-red-700">
            {searchError}
          </div>
        )}
      </div>
    </div>
  );
};
