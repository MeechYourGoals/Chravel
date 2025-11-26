import React, { useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { Input } from '../ui/input';

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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] animate-in fade-in duration-200"
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
              placeholder="Search trips by name, location, tags..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-12 pr-12 py-6 text-lg bg-background/50 border-border/50 rounded-full"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted/50 transition-colors"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Result Count */}
          {searchQuery && (
            <div className="text-sm text-center space-y-2">
              {resultCount > 0 ? (
                <>
                  <div className="text-foreground font-medium">
                    Found {resultCount} trip{resultCount !== 1 ? 's' : ''} matching "{searchQuery}"
                  </div>
                  <button
                    onClick={onClose}
                    className="text-primary hover:text-primary/80 transition-colors text-xs underline"
                  >
                    Press ESC or click here to view results
                  </button>
                </>
              ) : (
                <span className="text-muted-foreground">
                  No trips found for "{searchQuery}" - try different search terms
                </span>
              )}
            </div>
          )}

          {/* Helper Text */}
          {!searchQuery && (
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <div>Search by trip name, location, or description</div>
              <div className="text-xs">Results update instantly as you type</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
