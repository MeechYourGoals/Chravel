import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { BasecampLocation } from '@/types/basecamp';
import { PlaceInfoOverlay, PlaceInfo } from './PlaceInfoOverlay';
import {
  loadMapsApi,
  createServices,
  autocomplete,
  resolveQuery,
  centerMapOnPlace,
  createSessionToken,
  SearchOrigin,
} from '@/services/googlePlaces';

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
      onMapReady
    },
    ref
  ) => {
    // Map state
    const mapRef = useRef<google.maps.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const [isMapLoading, setIsMapLoading] = useState(true);
    const [mapError, setMapError] = useState<string | null>(null);

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

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      centerOn: (latLng: { lat: number; lng: number }, zoom = 15) => {
        if (mapRef.current) {
          mapRef.current.setCenter(latLng);
          mapRef.current.setZoom(zoom);
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

      const initMap = async () => {
        try {
          setIsMapLoading(true);
          setMapError(null);

          const google = await loadMapsApi();

          if (!mounted || !mapContainerRef.current) return;

          // Default center (NYC fallback)
          let center = { lat: 40.7580, lng: -73.9855 };
          let zoom = 12;

          // Try to use active basecamp as initial center
          const activeBasecamp = activeContext === 'trip' ? tripBasecamp : personalBasecamp;
          if (activeBasecamp?.coordinates) {
            center = activeBasecamp.coordinates;
            zoom = 12;
          }

          // Create map instance
          const map = new google.maps.Map(mapContainerRef.current, {
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

          // Create services
          const svc = await createServices(map);
          setServices(svc);

          // Create initial session token
          const token = await createSessionToken();
          setSessionToken(token);

          setIsMapLoading(false);
          onMapReady?.();

          console.log('[MapCanvas] Map initialized', { activeContext, center });
        } catch (error) {
          console.error('[MapCanvas] Map initialization error:', error);
          if (mounted) {
            setMapError('Failed to load map. Please check your internet connection.');
            setIsMapLoading(false);
          }
        }
      };

      initMap();

      return () => {
        mounted = false;
      };
    }, []);

    // Update search origin and center when context changes
    useEffect(() => {
      if (!mapRef.current) return;

      const activeBasecamp = activeContext === 'trip' ? tripBasecamp : personalBasecamp;
      
      console.log(`[MapCanvas] Context changed to ${activeContext}`, activeBasecamp);

      if (activeBasecamp?.coordinates) {
        // Update search origin for biasing
        setSearchOrigin(activeBasecamp.coordinates);

        // Center map on the active basecamp
        mapRef.current.setCenter(activeBasecamp.coordinates);
        mapRef.current.setZoom(12);
      } else {
        setSearchOrigin(null);
      }
    }, [activeContext, tripBasecamp, personalBasecamp]);

    // Update basecamp markers
    useEffect(() => {
      if (!mapRef.current) return;

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      const google = window.google;
      if (!google?.maps) return;

      // Add trip basecamp marker
      if (tripBasecamp?.coordinates) {
        const marker = new google.maps.Marker({
          position: tripBasecamp.coordinates,
          map: mapRef.current,
          title: tripBasecamp.name || 'Trip Base Camp',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#3b82f6',
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          zIndex: 100,
        });
        markersRef.current.push(marker);
      }

      // Add personal basecamp marker
      if (personalBasecamp?.coordinates) {
        const marker = new google.maps.Marker({
          position: personalBasecamp.coordinates,
          map: mapRef.current,
          title: personalBasecamp.name || 'Personal Base Camp',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#10b981',
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
          zIndex: 100,
        });
        markersRef.current.push(marker);
      }
    }, [tripBasecamp, personalBasecamp]);

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
    const handleSearch = async (query: string) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery || !mapRef.current || !services || !sessionToken) return;

      setIsSearching(true);
      setSearchError(null);
      setShowSuggestions(false);

      try {
        console.log('[MapCanvas] Searching for:', trimmedQuery, { origin: searchOrigin });

        const place = await resolveQuery(
          mapRef.current,
          services,
          trimmedQuery,
          searchOrigin,
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

        // Set place info for overlay
        const placeInfo: PlaceInfo = {
          name: place.name || trimmedQuery,
          address: place.formatted_address,
          coordinates: place.geometry?.location
            ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
            : undefined,
          placeId: place.place_id,
          rating: place.rating,
          website: place.website,
        };

        setSelectedPlace(placeInfo);

        // Reset session token after successful search
        const newToken = await createSessionToken();
        setSessionToken(newToken);
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

    return (
      <div className={`relative w-full h-full bg-gray-900 rounded-2xl overflow-hidden ${className}`}>
        {/* Search Bar - Centered */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-md px-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
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
              placeholder="Search places on map..."
              disabled={isSearching || isMapLoading}
              className="w-full bg-white/95 backdrop-blur-sm border border-gray-300 rounded-xl pl-10 pr-10 py-2.5 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-lg text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            />
            {/* Clear/Loading Button */}
            {isSearching ? (
              <Loader2 size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 animate-spin z-10" />
            ) : searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}

            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-60 overflow-y-auto">
                {suggestions.map((prediction) => (
                  <button
                    key={prediction.place_id}
                    type="button"
                    onClick={() => handleSuggestionClick(prediction)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 first:rounded-t-xl last:rounded-b-xl"
                  >
                    <div className="text-sm text-gray-900 font-medium">
                      {prediction.structured_formatting?.main_text || prediction.description}
                    </div>
                    {prediction.structured_formatting?.secondary_text && (
                      <div className="text-xs text-gray-500 mt-0.5">
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
            <div className="mt-2 bg-blue-50/95 backdrop-blur-sm border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-blue-700 text-center">
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
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="bg-white rounded-xl p-6 shadow-2xl max-w-sm mx-4">
              <p className="text-red-700 text-sm text-center">{mapError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Reload Page
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
