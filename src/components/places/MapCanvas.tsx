/// <reference types="@types/google.maps" />

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { BasecampLocation } from '@/types/basecamp';
import { PlaceInfoOverlay, PlaceInfo } from './PlaceInfoOverlay';
import {
  loadMaps,
  createServices,
  autocomplete,
  resolveQuery,
  centerMapOnPlace,
  SearchOrigin,
} from '@/services/googlePlaces';
import { GoogleMapsEmbed } from '@/components/GoogleMapsEmbed';

export interface MapMarker {
  id: string;
  position: { lat: number; lng: number };
  title: string;
  type: 'trip-basecamp' | 'personal-basecamp' | 'pin' | 'place' | 'saved' | 'venue';
  icon?: string;
  visible?: boolean;
}

export interface MapCanvasProps {
  className?: string;
  activeContext: 'trip' | 'personal';
  tripBasecamp?: BasecampLocation | null;
  personalBasecamp?: BasecampLocation | null;
  markers?: MapMarker[];
  onMapReady?: () => void;
}

export interface MapCanvasRef {
  centerOn: (latLng: { lat: number; lng: number }, zoom?: number) => void;
  fitBounds: (bounds: { north: number; south: number; east: number; west: number }) => void;
  highlight: (markerId: string) => void;
  getMap: () => google.maps.Map | null;
}

export const MapCanvas = forwardRef<MapCanvasRef, MapCanvasProps>(
  (
    {
      className = '',
      activeContext,
      tripBasecamp,
      personalBasecamp,
      markers = [],
      onMapReady,
    },
    ref
  ) => {
    // Map state
    const mapRef = useRef<google.maps.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [isMapLoading, setIsMapLoading] = useState(true);
    const [mapError, setMapError] = useState<string | null>(null);
    const [useFallbackEmbed, setUseFallbackEmbed] = useState(false);
    const [forceIframeFallback, setForceIframeFallback] = useState(false);
    const [userGeolocation, setUserGeolocation] = useState<{ lat: number; lng: number } | null>(null);
    
    // Emergency timeout to force iframe fallback if JS API takes too long
    const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [selectedPlace, setSelectedPlace] = useState<PlaceInfo | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);

    // Services state
    const [services, setServices] = useState<{
      places: google.maps.places.PlacesService;
      geocoder: google.maps.Geocoder;
    } | null>(null);
    const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);
    const [searchOrigin, setSearchOrigin] = useState<SearchOrigin>(null);

    // Markers state
    const markersRef = useRef<google.maps.Marker[]>([]);
    const searchMarkerRef = useRef<google.maps.Marker | null>(null);
    const overlayObserverRef = useRef<MutationObserver | null>(null);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      centerOn: (latLng: { lat: number; lng: number }, zoom = 15) => {
        if (mapRef.current && window.google) {
          mapRef.current.panTo(latLng);
          mapRef.current.setZoom(zoom);

          // Add a temporary marker for visual feedback
          const tempMarker = new window.google.maps.Marker({
            position: latLng,
            map: mapRef.current,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#fde047', // yellow-300
              fillOpacity: 1,
              strokeColor: '#f97316', // orange-500
              strokeWeight: 2,
            },
            animation: window.google.maps.Animation.DROP,
            zIndex: 300,
          });

          // Remove the marker after a short delay
          setTimeout(() => {
            tempMarker.setMap(null);
          }, 2500);
        }
      },
      fitBounds: (bounds: { north: number; south: number; east: number; west: number }) => {
        if (mapRef.current) {
          mapRef.current.fitBounds(bounds);
        }
      },
      highlight: (markerId: string) => {
        const marker = markers.find(m => m.id === markerId);
        if (marker && mapRef.current) {
          mapRef.current.setCenter(marker.position);
          mapRef.current.setZoom(15);
        }
      },
      getMap: () => mapRef.current
    }));

    // Initialize map
    useEffect(() => {
      let mounted = true;
      
      // Emergency timeout: if map doesn't load in 5 seconds, force iframe fallback
      loadingTimeoutRef.current = setTimeout(() => {
        if (mounted && isMapLoading) {
          console.warn('[MapCanvas] ⏱️ Map loading timeout - forcing iframe fallback');
          setForceIframeFallback(true);
          setUseFallbackEmbed(true);
          setIsMapLoading(false);
        }
      }, 5000);

      const initMap = async () => {
        try {
          setIsMapLoading(true);
          setMapError(null);
          
          console.log('[MapCanvas] 🗺️ Initializing map...', {
            tripBasecamp: !!tripBasecamp,
            personalBasecamp: !!personalBasecamp,
            activeContext
          });

          const maps = await loadMaps();

          if (!mounted || !mapContainerRef.current) {
            console.log('[MapCanvas] Component unmounted or container missing, aborting init');
            return;
          }

          // Determine initial center based on hierarchy
          let center = { lat: 40.7580, lng: -73.9855 }; // NYC fallback
          let zoom = 12;

          // Priority 1: Trip Basecamp
          if (tripBasecamp?.coordinates) {
            center = tripBasecamp.coordinates;
            zoom = 12;
            console.log('[MapCanvas] ✅ Centered on Trip Basecamp:', tripBasecamp.name);
          } 
          // Priority 2: Personal Basecamp
          else if (personalBasecamp?.coordinates) {
            center = personalBasecamp.coordinates;
            zoom = 12;
            console.log('[MapCanvas] ✅ Centered on Personal Basecamp:', personalBasecamp.name);
          } 
          // Priority 3: User Geolocation
          else if (userGeolocation) {
            center = userGeolocation;
            zoom = 13;
            console.log('[MapCanvas] ✅ Centered on User Geolocation');
          } else {
            console.log('[MapCanvas] ℹ️ Using default center (NYC)');
          }

          console.log('[MapCanvas] Creating map instance with center:', center);

          // Create map instance
          const map = new maps.Map(mapContainerRef.current, {
            center,
            zoom,
            mapTypeControl: true,
            streetViewControl: true,
            fullscreenControl: true,
            zoomControl: true,
            gestureHandling: 'greedy',
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'on' }]
              }
            ]
          });

          mapRef.current = map;
          console.log('[MapCanvas] ✅ Map instance created');

          // Monitor for Google Maps error overlay
          const errorCheckInterval = setInterval(() => {
            const hasGmError = !!mapContainerRef.current?.querySelector('.gm-err-container');
            if (hasGmError) {
              clearInterval(errorCheckInterval);
              console.error('[MapCanvas] ❌ Detected Google Maps error overlay – likely API key or billing issue');
              setUseFallbackEmbed(true);
              setMapError('Google Maps API Error: Please check your API key, enabled APIs, and billing status in Google Cloud Console.');
              setIsMapLoading(false);
            }
          }, 500);

          // Stop checking after 3 seconds
          setTimeout(() => clearInterval(errorCheckInterval), 3000);

          // Create services
          console.log('[MapCanvas] Creating Places and Geocoding services...');
          const svc = await createServices(map);
          setServices(svc);
          console.log('[MapCanvas] ✅ Services created');

          // Create initial session token
          setSessionToken(new maps.places.AutocompleteSessionToken());

          // Clear emergency timeout - map loaded successfully
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }
          
          setIsMapLoading(false);
          onMapReady?.();

          console.log('[MapCanvas] ✅ Map fully initialized and ready');
        } catch (error) {
          console.error('[MapCanvas] ❌ Map initialization error:', error);
          if (mounted) {
            // Clear emergency timeout
            if (loadingTimeoutRef.current) {
              clearTimeout(loadingTimeoutRef.current);
              loadingTimeoutRef.current = null;
            }
            
            // Graceful fallback to embed if JS API fails to load/auth
            setUseFallbackEmbed(true);
            setForceIframeFallback(true);
            const errorMessage = error instanceof Error 
              ? error.message
              : 'Failed to load Google Maps JavaScript API.';
            setMapError(errorMessage);
            setIsMapLoading(false);
            
            console.error('[MapCanvas] Fallback to iframe embed mode due to error');
          }
        }
      };

      // Try to init map, but if it fails immediately, force iframe fallback
      try {
        initMap();
      } catch (syncError) {
        console.error('[MapCanvas] Synchronous error during init:', syncError);
        setForceIframeFallback(true);
        setUseFallbackEmbed(true);
        setIsMapLoading(false);
      }

      return () => {
        mounted = false;
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
      };
    }, []);

    // Get user geolocation as fallback
    useEffect(() => {
      // Only request geolocation if no basecamps are set
      if (!tripBasecamp && !personalBasecamp && 'geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserGeolocation({
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
            console.log('[MapCanvas] User geolocation obtained:', position.coords);
          },
          (error) => {
            console.warn('[MapCanvas] Geolocation error:', error);
            // Fallback to NYC
            setUserGeolocation({ lat: 40.7580, lng: -73.9855 });
          }
        );
      }
    }, [tripBasecamp, personalBasecamp]);

    // Update search origin and center when context changes
    useEffect(() => {
      if (!mapRef.current) return;

      // Determine which basecamp to use
      let targetBasecamp: BasecampLocation | null = null;
      
      if (activeContext === 'trip') {
        targetBasecamp = tripBasecamp || null;
      } else if (activeContext === 'personal') {
        targetBasecamp = personalBasecamp || null;
      }

      console.log(`[MapCanvas] Context changed to ${activeContext}`, targetBasecamp);

      // Update search origin for biasing
      setSearchOrigin(targetBasecamp?.coordinates || null);

      // Center map on active basecamp, or geolocation, or default
      if (targetBasecamp?.coordinates) {
        mapRef.current.setCenter(targetBasecamp.coordinates);
        mapRef.current.setZoom(12);
      } else if (userGeolocation && !tripBasecamp && !personalBasecamp) {
        // Only fall back to geolocation if NO basecamps are set
        mapRef.current.setCenter(userGeolocation);
        mapRef.current.setZoom(13);
      }

      // If place is selected, re-trigger search to recalculate distance from new basecamp
      if (selectedPlace?.name && services && sessionToken) {
        console.log(`[MapCanvas] Recalculating distance from ${activeContext} basecamp`);
        handleSearch(selectedPlace.name);
      }
    }, [activeContext, tripBasecamp, personalBasecamp, userGeolocation]);

    // Update basecamp markers
    useEffect(() => {
      if (!mapRef.current) return;

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      const google = window.google;
      if (!google?.maps) return;

      // Helper: Create marker with active/inactive styling
      const createBasecampMarker = (
        coords: { lat: number; lng: number },
        title: string,
        color: string,
        isActive: boolean
      ) => {
        return new google.maps.Marker({
          position: coords,
          map: mapRef.current!,
          title,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: isActive ? 12 : 10,
            fillColor: color,
            fillOpacity: isActive ? 1 : 0.5,
            strokeColor: isActive ? '#ffffff' : '#9ca3af',
            strokeWeight: isActive ? 3 : 1,
          },
          zIndex: isActive ? 150 : 100,
          opacity: isActive ? 1 : 0.6
        });
      };

      // Add trip basecamp marker
      if (tripBasecamp?.coordinates) {
        const marker = createBasecampMarker(
          tripBasecamp.coordinates,
          tripBasecamp.name || 'Trip Base Camp',
          '#3b82f6', // blue
          activeContext === 'trip'
        );
        markersRef.current.push(marker);
      }

      // Add personal basecamp marker
      if (personalBasecamp?.coordinates) {
        const marker = createBasecampMarker(
          personalBasecamp.coordinates,
          personalBasecamp.name || 'Personal Base Camp',
          '#10b981', // emerald
          activeContext === 'personal'
        );
        markersRef.current.push(marker);
      }
    }, [tripBasecamp, personalBasecamp, activeContext]);

    // Autocomplete handler
    const handleSearchInput = async (value: string) => {
      setSearchQuery(value);
      setSearchError(null);

      if (!value.trim() || !services || !sessionToken) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const predictions = await autocomplete(value, sessionToken, searchOrigin);
        setSuggestions(predictions);
        setShowSuggestions(predictions.length > 0);
      } catch (error) {
        console.error('[MapCanvas] Autocomplete error:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    // Search submission handler
    const handleSearch = async (query: string, overrideOrigin?: SearchOrigin) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery || !mapRef.current || !services || !sessionToken) return;

      setIsSearching(true);
      setSearchError(null);
      setShowSuggestions(false);

      try {
        const effectiveOrigin = overrideOrigin || searchOrigin;
        console.log('[MapCanvas] Searching for:', trimmedQuery, { origin: effectiveOrigin });

        const place = await resolveQuery(
          mapRef.current,
          services,
          trimmedQuery,
          effectiveOrigin,
          sessionToken
        );

        if (!place) {
          setSearchError('No results found. Try a different search term.');
          setIsSearching(false);
          return;
        }

        console.log('[MapCanvas] ✅ Place found:', place);

        // Center map on place
        centerMapOnPlace(mapRef.current, place);

        // Update search marker
        if (searchMarkerRef.current) {
          searchMarkerRef.current.setMap(null);
        }

        if (place.geometry?.location) {
          const google = window.google;
          searchMarkerRef.current = new google.maps.Marker({
            position: place.geometry.location,
            map: mapRef.current,
            title: place.name || trimmedQuery,
            animation: google.maps.Animation.DROP,
            zIndex: 200,
          });
        }

        // ** Calculate distance from active basecamp **
        const activeBasecamp = activeContext === 'trip' ? tripBasecamp : personalBasecamp;
        let distanceInfo: { distance: string; duration: string; mode: string } | null = null;

        if (activeBasecamp?.coordinates && place.geometry?.location) {
          try {
            const origin = `${activeBasecamp.coordinates.lat},${activeBasecamp.coordinates.lng}`;
            const destination = `${place.geometry.location.lat()},${place.geometry.location.lng()}`;
            
            // Use Distance Matrix API for driving distance/time
            const { GoogleMapsService } = await import('@/services/googleMapsService');
            const distanceData = await GoogleMapsService.getDistanceMatrix(origin, destination, 'DRIVING');
            
            if (distanceData.status === 'OK' && distanceData.rows[0]?.elements[0]?.status === 'OK') {
              const element = distanceData.rows[0].elements[0];
              distanceInfo = {
                distance: element.distance.text,
                duration: element.duration.text,
                mode: 'driving'
              };
              console.log('[MapCanvas] Distance calculated:', distanceInfo);
            }
          } catch (error) {
            console.error('[MapCanvas] Distance calculation error:', error);
          }
        }

        // Set place info for overlay with distance
        const placeInfo: PlaceInfo = {
          name: place.name || trimmedQuery,
          address: place.formatted_address,
          coordinates: place.geometry?.location
            ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
            : undefined,
          placeId: place.place_id,
          rating: place.rating,
          website: place.website,
          distance: distanceInfo
        };

        setSelectedPlace(placeInfo);

        // Reset session token after successful search
        const maps = await loadMaps();
        setSessionToken(new maps.places.AutocompleteSessionToken());
      } catch (error) {
        console.error('[MapCanvas] Search error:', error);
        setSearchError('Search failed. Please try again.');
      } finally {
        setIsSearching(false);
      }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSearch(searchQuery);
    };

    const handleSuggestionClick = (prediction: google.maps.places.AutocompletePrediction) => {
      setSearchQuery(prediction.description);
      setShowSuggestions(false);
      handleSearch(prediction.description);
    };

    const handleClearSearch = () => {
      setSearchQuery('');
      setSearchError(null);
      setSelectedPlace(null);
      setSuggestions([]);
      setShowSuggestions(false);
      
      // Remove search marker
      if (searchMarkerRef.current) {
        searchMarkerRef.current.setMap(null);
        searchMarkerRef.current = null;
      }
    };

    const handleViewDirections = () => {
      if (!selectedPlace?.coordinates) return;

      const activeBasecamp = activeContext === 'trip' ? tripBasecamp : personalBasecamp;
      if (!activeBasecamp?.coordinates) return;

      // Open Google Maps directions in new tab
      const origin = `${activeBasecamp.coordinates.lat},${activeBasecamp.coordinates.lng}`;
      const destination = `${selectedPlace.coordinates.lat},${selectedPlace.coordinates.lng}`;
      window.open(
        `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`,
        '_blank'
      );
    };

    // If fallback embed mode is enabled, show the iframe instead
    if (useFallbackEmbed || forceIframeFallback) {
      console.log('[MapCanvas] Rendering iframe fallback mode');
      return (
        <div className={`relative w-full h-full bg-gray-900 rounded-2xl overflow-hidden ${className}`}>
          <GoogleMapsEmbed className="w-full h-full" />
          {!forceIframeFallback && mapError && (
            <div className="absolute top-2 right-2 z-30 bg-amber-500/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg shadow-lg">
              ℹ️ Using simplified map view
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`relative w-full h-full bg-gray-900 rounded-2xl overflow-hidden ${className}`}>
        {/* Search Bar - Centered and Compact */}
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-20 w-auto max-w-xs">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search size={12} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => {
                // Delay to allow click on suggestion
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder="Search locations..."
              disabled={isSearching || isMapLoading}
              className="w-48 bg-white/95 backdrop-blur-sm border border-gray-300 rounded-lg pl-7 pr-7 py-1.5 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-lg text-xs disabled:opacity-70 disabled:cursor-not-allowed"
            />
            {/* Clear/Loading Button */}
            {isSearching ? (
              <Loader2 size={12} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-blue-500 animate-spin z-10" />
            ) : searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}

            {/* Autocomplete Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-48 overflow-y-auto">
                {suggestions.map((prediction) => (
                  <button
                    key={prediction.place_id}
                    type="button"
                    onClick={() => handleSuggestionClick(prediction)}
                    className="w-full text-left px-2 py-1.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 first:rounded-t-lg last:rounded-b-lg"
                  >
                    <div className="text-xs text-gray-900 font-medium">
                      {prediction.structured_formatting?.main_text || prediction.description}
                    </div>
                    {prediction.structured_formatting?.secondary_text && (
                      <div className="text-[10px] text-gray-500 mt-0.5">
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
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              {searchError}
            </div>
          )}

          {/* Context Info Chip */}
          {searchOrigin && (
            <div className="mt-1 bg-blue-50/95 backdrop-blur-sm border border-blue-200 rounded-md px-2 py-1 text-[10px] text-blue-700 text-center">
              Searches biased to your <span className="font-semibold">{activeContext === 'trip' ? 'Trip' : 'Personal'} Base Camp</span>
            </div>
          )}
        </div>

        {/* Place Info Overlay */}
        {selectedPlace && (
          <PlaceInfoOverlay
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
            onViewDirections={handleViewDirections}
            activeContext={activeContext}
          />
        )}

        {/* Loading State */}
        {isMapLoading && (
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-xl p-6 shadow-2xl">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-white font-medium">Loading map...</p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {mapError && (
          <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm flex items-center justify-center z-10 p-4">
            <div className="bg-white rounded-xl p-6 shadow-2xl max-w-lg w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">🗺️ Google Maps Setup Required</h3>
              <p className="text-red-700 text-sm mb-4">{mapError}</p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-xs text-blue-900 font-semibold mb-3">Quick Setup Guide:</p>
                <ol className="text-xs text-blue-800 space-y-2 list-decimal list-inside">
                  <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline font-medium">Google Cloud Console</a></li>
                  <li>Create a new API key (or use existing)</li>
                  <li>Enable these APIs:
                    <ul className="ml-5 mt-1 space-y-0.5 list-disc list-inside">
                      <li>Maps JavaScript API</li>
                      <li>Places API (New)</li>
                      <li>Geocoding API</li>
                    </ul>
                  </li>
                  <li>Enable billing on your Google Cloud project</li>
                  <li>Add key to <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.env</code> as <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">VITE_GOOGLE_MAPS_API_KEY</code></li>
                  <li>Restart your dev server: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">npm run dev</code></li>
                </ol>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-900">
                  <strong>Note:</strong> Google Maps requires an active billing account. You'll get $200/month free credit.
                </p>
              </div>
              
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Reload After Setup
              </button>
            </div>
          </div>
        )}

        {/* Map Container */}
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>
    );
  }
);

MapCanvas.displayName = 'MapCanvas';
