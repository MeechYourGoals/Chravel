import React, { useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { Input } from '../ui/input';
import { useUniversalSearch } from '@/hooks/useUniversalSearch';
import { UniversalSearchResultsPane } from '../UniversalSearchResultsPane';

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount?: number;
}

export const SearchOverlay = ({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  resultCount = 0
}: SearchOverlayProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Use the universal search hook for actual search functionality
  const { results, isLoading } = useUniversalSearch(searchQuery, {
    contentTypes: ['trips', 'messages', 'calendar', 'tasks', 'polls', 'media'],
    searchMode: 'hybrid'
  });

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleResultClick = (result: { tripId?: string; deepLink?: string; [key: string]: any }) => {
    if (result.tripId) {
      window.location.href = `/tour/${result.tripId}`;
    } else if (result.deepLink) {
      const element = document.querySelector(result.deepLink);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="fixed inset-x-0 top-0 mt-20 mx-auto max-w-2xl px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Card */}
        <div className="relative bg-card/95 backdrop-blur-xl border-2 border-border/50 rounded-3xl shadow-2xl p-6 space-y-4">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors"
            aria-label="Close search"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search across all your trips and events..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 pr-4 py-6 text-lg bg-background/50 border-border/50 rounded-full"
            />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-muted-foreground mt-4">Searching...</p>
            </div>
          )}

          {/* Search Results */}
          {!isLoading && searchQuery && results.length > 0 && (
            <div className="max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-muted-foreground mb-4">
                Found {results.length} result{results.length !== 1 ? 's' : ''} for "{searchQuery}"
              </p>
              <UniversalSearchResultsPane 
                results={results}
                onResultClick={handleResultClick}
              />
            </div>
          )}

          {/* No Results */}
          {!isLoading && searchQuery && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No results found for "{searchQuery}"</p>
              <p className="text-sm">Try different keywords or check your spelling</p>
            </div>
          )}

          {/* Helper Text */}
          {!searchQuery && (
            <div className="text-sm text-muted-foreground text-center py-4">
              Search by trip name, event, location, message, or place
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
