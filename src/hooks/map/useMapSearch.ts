import { useState, useRef, useCallback } from 'react';
import { PlaceInfo } from '@/components/places/PlaceInfoOverlay';
import { SearchOrigin } from '@/services/googlePlacesNew';

export interface UseMapSearchReturn {
  // Search state
  searchQuery: string;
  isSearching: boolean;
  searchError: string | null;
  selectedPlace: PlaceInfo | null;
  showSuggestions: boolean;
  suggestions: any[];
  sessionToken: string;
  searchOrigin: SearchOrigin;

  // Refs
  activeAutocompleteRequestRef: React.MutableRefObject<number>;
  searchMarkerRef: React.MutableRefObject<google.maps.Marker | null>;
  overlayObserverRef: React.MutableRefObject<MutationObserver | null>;

  // Actions
  setSearchQuery: (query: string) => void;
  setIsSearching: (searching: boolean) => void;
  setSearchError: (error: string | null) => void;
  setSelectedPlace: (place: PlaceInfo | null) => void;
  setShowSuggestions: (show: boolean) => void;
  setSuggestions: (suggestions: any[]) => void;
  setSessionToken: (token: string) => void;
  setSearchOrigin: (origin: SearchOrigin) => void;
  clearSearch: () => void;
}

/**
 * Hook for managing map search functionality, autocomplete, and suggestions
 */
export const useMapSearch = (): UseMapSearchReturn => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceInfo | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [searchOrigin, setSearchOrigin] = useState<SearchOrigin>(null);

  const activeAutocompleteRequestRef = useRef<number>(0);
  const searchMarkerRef = useRef<google.maps.Marker | null>(null);
  const overlayObserverRef = useRef<MutationObserver | null>(null);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSelectedPlace(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchError(null);
    setIsSearching(false);

    // Clear search marker if exists
    if (searchMarkerRef.current) {
      searchMarkerRef.current.setMap(null);
      searchMarkerRef.current = null;
    }
  }, []);

  return {
    searchQuery,
    isSearching,
    searchError,
    selectedPlace,
    showSuggestions,
    suggestions,
    sessionToken,
    searchOrigin,
    activeAutocompleteRequestRef,
    searchMarkerRef,
    overlayObserverRef,
    setSearchQuery,
    setIsSearching,
    setSearchError,
    setSelectedPlace,
    setShowSuggestions,
    setSuggestions,
    setSessionToken,
    setSearchOrigin,
    clearSearch,
  };
};
