/**
 * Media Search Bar Component
 * 
 * Provides search functionality for media items
 * Supports full-text search and AI tag filtering
 * 
 * @module components/media/MediaSearchBar
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchMedia, searchMediaByTags } from '@/services/mediaSearchService';
import type { MediaSearchResult } from '@/services/mediaSearchService';

interface MediaSearchBarProps {
  tripId: string;
  onSearchResults: (results: MediaSearchResult[]) => void;
  onSearchChange?: (query: string) => void;
  placeholder?: string;
}

export const MediaSearchBar = ({
  tripId,
  onSearchResults,
  onSearchChange,
  placeholder = 'Search media... (e.g., "beach photos", "receipts")',
}: MediaSearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      onSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Check if query looks like tags (comma-separated or #hashtags)
      const tagPattern = /^[#\w\s,]+$/;
      const isTagSearch = tagPattern.test(searchQuery) && (
        searchQuery.includes(',') || 
        searchQuery.includes('#') ||
        searchQuery.split(/\s+/).length <= 3
      );

      let results: MediaSearchResult[];
      
      if (isTagSearch) {
        // Extract tags from query
        const tags = searchQuery
          .split(/[,#\s]+/)
          .map(t => t.trim())
          .filter(t => t.length > 0);
        
        results = await searchMediaByTags(tripId, tags);
      } else {
        // Full-text search
        results = await searchMedia({
          tripId,
          query: searchQuery,
          limit: 50,
        });
      }

      onSearchResults(results);
    } catch (error) {
      console.error('[MediaSearchBar] Search error:', error);
      onSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [tripId, onSearchResults]);

  // Debounced search effect
  useEffect(() => {
    if (!query.trim()) {
      onSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      handleSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, handleSearch, onSearchResults]);

  const handleClear = () => {
    setQuery('');
    onSearchChange?.('');
    onSearchResults([]);
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            onSearchChange?.(value);
          }}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {isSearching && (
        <div className="absolute top-full left-0 right-0 mt-1 text-xs text-muted-foreground px-3">
          Searching...
        </div>
      )}
    </div>
  );
};
