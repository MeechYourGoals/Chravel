import { useState, useRef, useCallback } from 'react';

export interface RouteInfo {
  distance: string;
  duration: string;
}

interface CachedDistance extends RouteInfo {
  timestamp: number;
}

export interface UseMapRoutingReturn {
  // State
  routePolyline: google.maps.Polyline | null;
  showRoute: boolean;
  routeInfo: RouteInfo | null;

  // Refs
  markersRef: React.MutableRefObject<google.maps.Marker[]>;
  distanceCacheRef: React.MutableRefObject<Map<string, CachedDistance>>;

  // Actions
  setRoutePolyline: (polyline: google.maps.Polyline | null) => void;
  setShowRoute: (show: boolean) => void;
  setRouteInfo: (info: RouteInfo | null) => void;
  getCachedDistance: (origin: string, destination: string) => RouteInfo | null;
  setCachedDistance: (origin: string, destination: string, data: RouteInfo) => void;
  clearRoute: () => void;
}

/**
 * Hook for managing map routing, polylines, and distance calculations
 */
export const useMapRouting = (): UseMapRoutingReturn => {
  const [routePolyline, setRoutePolyline] = useState<google.maps.Polyline | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  const markersRef = useRef<google.maps.Marker[]>([]);
  const distanceCacheRef = useRef<Map<string, CachedDistance>>(new Map());

  const getCachedDistance = useCallback((origin: string, destination: string): RouteInfo | null => {
    const key = `${origin}→${destination}`;
    const cached = distanceCacheRef.current.get(key);

    // Cache valid for 1 hour (3600000ms)
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return {
        distance: cached.distance,
        duration: cached.duration,
      };
    }

    return null;
  }, []);

  const setCachedDistance = useCallback((origin: string, destination: string, data: RouteInfo) => {
    const key = `${origin}→${destination}`;
    distanceCacheRef.current.set(key, {
      ...data,
      timestamp: Date.now(),
    });
  }, []);

  const clearRoute = useCallback(() => {
    if (routePolyline) {
      routePolyline.setMap(null);
    }
    setRoutePolyline(null);
    setShowRoute(false);
    setRouteInfo(null);
  }, [routePolyline]);

  return {
    routePolyline,
    showRoute,
    routeInfo,
    markersRef,
    distanceCacheRef,
    setRoutePolyline,
    setShowRoute,
    setRouteInfo,
    getCachedDistance,
    setCachedDistance,
    clearRoute,
  };
};
