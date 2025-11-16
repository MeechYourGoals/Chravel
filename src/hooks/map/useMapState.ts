import { useState, useRef, useCallback } from 'react';

export interface UseMapStateReturn {
  // Refs
  mapRef: React.MutableRefObject<google.maps.Map | null>;
  mapContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  loadingTimeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;

  // State
  isMapLoading: boolean;
  mapError: string | null;
  useFallbackEmbed: boolean;
  forceIframeFallback: boolean;
  userGeolocation: { lat: number; lng: number } | null;

  // Actions
  setIsMapLoading: (loading: boolean) => void;
  setMapError: (error: string | null) => void;
  setUseFallbackEmbed: (use: boolean) => void;
  setForceIframeFallback: (force: boolean) => void;
  setUserGeolocation: (location: { lat: number; lng: number } | null) => void;
  clearMapError: () => void;
}

/**
 * Hook for managing Google Maps instance state, loading, and error handling
 */
export const useMapState = (): UseMapStateReturn => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [useFallbackEmbed, setUseFallbackEmbed] = useState(false);
  const [forceIframeFallback, setForceIframeFallback] = useState(false);
  const [userGeolocation, setUserGeolocation] = useState<{ lat: number; lng: number } | null>(null);

  const clearMapError = useCallback(() => {
    setMapError(null);
  }, []);

  return {
    mapRef,
    mapContainerRef,
    loadingTimeoutRef,
    isMapLoading,
    mapError,
    useFallbackEmbed,
    forceIframeFallback,
    userGeolocation,
    setIsMapLoading,
    setMapError,
    setUseFallbackEmbed,
    setForceIframeFallback,
    setUserGeolocation,
    clearMapError,
  };
};
