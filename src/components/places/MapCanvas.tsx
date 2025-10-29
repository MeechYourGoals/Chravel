import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { GoogleMapsService } from '@/services/googleMapsService';
import { BasecampLocation } from '@/types/basecamp';
import { PlaceInfoOverlay, PlaceInfo } from './PlaceInfoOverlay';

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
  getMap: () => HTMLIFrameElement | null;
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
    const [embedUrl, setEmbedUrl] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlace, setSelectedPlace] = useState<PlaceInfo | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      centerOn: (latLng: { lat: number; lng: number }, zoom = 15) => {
        // Update iframe src to center on new location
        const newUrl = GoogleMapsService.buildEmbeddableUrl(undefined, latLng);
        setEmbedUrl(newUrl);
      },
      fitBounds: (bounds: { north: number; south: number; east: number; west: number }) => {
        // Calculate center from bounds
        const centerLat = (bounds.north + bounds.south) / 2;
        const centerLng = (bounds.east + bounds.west) / 2;
        const newUrl = GoogleMapsService.buildEmbeddableUrl(undefined, {
          lat: centerLat,
          lng: centerLng
        });
        setEmbedUrl(newUrl);
      },
      highlight: (markerId: string) => {
        // Find marker and center on it
        const marker = markers.find(m => m.id === markerId);
        if (marker) {
          const newUrl = GoogleMapsService.buildEmbeddableUrl(undefined, marker.position);
          setEmbedUrl(newUrl);
        }
      },
      getMap: () => iframeRef.current
    }));

    // Generate embed URL based on active context and basecamps
    useEffect(() => {
      setIsLoading(true);

      // Determine which basecamp to use based on context
      const activeBasecamp = activeContext === 'trip' ? tripBasecamp : personalBasecamp;

      console.log(`[MapCanvas] Context: ${activeContext}, Active Basecamp: ${activeBasecamp?.name || 'Not set'}`);
      console.log(`[MapCanvas] Trip Basecamp: ${tripBasecamp?.name || 'Not set'}, Personal Basecamp: ${personalBasecamp?.name || 'Not set'}`);

      // If active basecamp exists, center on it
      if (activeBasecamp) {
        // Priority: Use coordinates if available, otherwise use address
        if (activeBasecamp.coordinates) {
          const url = GoogleMapsService.buildEmbeddableUrl(
            activeBasecamp.address,
            activeBasecamp.coordinates
          );
          console.log(`[MapCanvas] Centering on ${activeContext} basecamp coordinates:`, activeBasecamp.coordinates);
          setEmbedUrl(url);
          setIsLoading(false);
          return;
        } else if (activeBasecamp.address) {
          const url = GoogleMapsService.buildEmbeddableUrl(activeBasecamp.address);
          console.log(`[MapCanvas] Centering on ${activeContext} basecamp address:`, activeBasecamp.address);
          setEmbedUrl(url);
          setIsLoading(false);
          return;
        }
      }

      // No basecamp set for active context - use geolocation fallback
      console.warn(`[MapCanvas] No ${activeContext} basecamp set, trying geolocation...`);
      
      const timeout = setTimeout(() => {
        console.warn('[MapCanvas] Geolocation timeout, using NYC fallback');
        setEmbedUrl(GoogleMapsService.buildEmbeddableUrl());
        setIsLoading(false);
      }, 4000);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            clearTimeout(timeout);
            const { latitude, longitude } = pos.coords;
            console.log('[MapCanvas] Using geolocation:', { lat: latitude, lng: longitude });
            setEmbedUrl(
              GoogleMapsService.buildEmbeddableUrl(undefined, { lat: latitude, lng: longitude })
            );
            setIsLoading(false);
          },
          () => {
            clearTimeout(timeout);
            console.warn('[MapCanvas] Geolocation denied, using NYC fallback');
            setEmbedUrl(GoogleMapsService.buildEmbeddableUrl());
            setIsLoading(false);
          },
          { maximumAge: 300000, timeout: 3500, enableHighAccuracy: false }
        );
      } else {
        clearTimeout(timeout);
        console.warn('[MapCanvas] Geolocation not supported, using NYC fallback');
        setEmbedUrl(GoogleMapsService.buildEmbeddableUrl());
        setIsLoading(false);
      }
    }, [activeContext, tripBasecamp, personalBasecamp]);

    const handleIframeLoad = () => {
      setIsLoading(false);
      onMapReady?.();
    };

    const handleIframeError = () => {
      console.error('[MapCanvas] Iframe error for URL:', embedUrl);

      // Try domain swap: maps.google.com → www.google.com
      if (embedUrl.includes('maps.google.com')) {
        const swapped = embedUrl.replace('maps.google.com', 'www.google.com');
        console.info('[MapCanvas] Retrying with www.google.com:', swapped);
        setEmbedUrl(swapped);
      } else {
        // Final fallback: simple "near me" query
        const fallback =
          'https://www.google.com/maps?output=embed&q=' + encodeURIComponent('near me');
        console.info('[MapCanvas] Applying fallback URL:', fallback);
        setEmbedUrl(fallback);
      }
    };

    const handleSearch = async (e: React.FormEvent) => {
      e.preventDefault();
      const query = searchQuery.trim();
      if (!query) return;

      setIsSearching(true);
      setSearchError(null);
      try {
        console.log('[MapCanvas] Searching for:', query);

        // Try Google Maps Text Search API first
        const activeBasecamp = activeContext === 'trip' ? tripBasecamp : personalBasecamp;
        const searchOptions = activeBasecamp?.coordinates
          ? { location: `${activeBasecamp.coordinates.lat},${activeBasecamp.coordinates.lng}` }
          : undefined;

        let result = await GoogleMapsService.searchPlacesByText(query, searchOptions);
        console.log('[MapCanvas] Text search result:', result);

        // If Google API fails or returns no results, fallback to Nominatim
        if (!result.results || result.results.length === 0) {
          console.log('[MapCanvas] No results from Google API, trying Nominatim fallback...');
          const nominatimResult = await GoogleMapsService.fallbackGeocodeNominatim(query);

          if (nominatimResult) {
            console.log('[MapCanvas] Nominatim result:', nominatimResult);

            // Set the selected place info
            const placeInfo: PlaceInfo = {
              name: query,
              address: nominatimResult.displayName,
              coordinates: { lat: nominatimResult.lat, lng: nominatimResult.lng }
            };

            setSelectedPlace(placeInfo);

            // Update map to show the place
            const url = GoogleMapsService.buildEmbeddableUrl(
              nominatimResult.displayName,
              { lat: nominatimResult.lat, lng: nominatimResult.lng }
            );
            setEmbedUrl(url);
            console.log('[MapCanvas] ✅ Search successful (Nominatim)');
          } else {
            setSearchError('No results found. Try a different search term.');
            console.log('[MapCanvas] ❌ No results from both APIs');
          }
        } else {
          // Google API returned results
          const place = result.results[0];
          console.log('[MapCanvas] Using Google API result:', place);

          const placeDetails = place.place_id
            ? await GoogleMapsService.getPlaceDetails(place.place_id)
            : null;

          // Set the selected place info
          const placeInfo: PlaceInfo = {
            name: place.name,
            address: place.formatted_address,
            coordinates: place.geometry?.location,
            placeId: place.place_id,
            rating: place.rating,
            website: placeDetails?.result?.website
          };

          setSelectedPlace(placeInfo);

          // Update map to show the place
          if (place.geometry?.location) {
            const url = GoogleMapsService.buildEmbeddableUrl(
              place.formatted_address,
              place.geometry.location
            );
            setEmbedUrl(url);
            console.log('[MapCanvas] ✅ Search successful (Google API)');
          }
        }
      } catch (error) {
        console.error('[MapCanvas] Search error:', error);

        // Try Nominatim as last resort fallback
        try {
          console.log('[MapCanvas] Error occurred, trying Nominatim as fallback...');
          const nominatimResult = await GoogleMapsService.fallbackGeocodeNominatim(query);

          if (nominatimResult) {
            const placeInfo: PlaceInfo = {
              name: query,
              address: nominatimResult.displayName,
              coordinates: { lat: nominatimResult.lat, lng: nominatimResult.lng }
            };

            setSelectedPlace(placeInfo);

            const url = GoogleMapsService.buildEmbeddableUrl(
              nominatimResult.displayName,
              { lat: nominatimResult.lat, lng: nominatimResult.lng }
            );
            setEmbedUrl(url);
            console.log('[MapCanvas] ✅ Search successful (Nominatim fallback after error)');
          } else {
            setSearchError('Search failed. Please try again.');
          }
        } catch (fallbackError) {
          console.error('[MapCanvas] Fallback search also failed:', fallbackError);
          setSearchError('Search failed. Please try again.');
        }
      } finally {
        setIsSearching(false);
      }
    };

    const handleClearSearch = () => {
      setSearchQuery('');
      setSearchError(null);
      setSelectedPlace(null);
    };

    const handleViewDirections = () => {
      if (!selectedPlace?.coordinates) return;
      
      const activeBasecamp = activeContext === 'trip' ? tripBasecamp : personalBasecamp;
      if (activeBasecamp) {
        const origin = activeBasecamp.address || `${activeBasecamp.coordinates?.lat},${activeBasecamp.coordinates?.lng}`;
        const destination = selectedPlace.address || `${selectedPlace.coordinates.lat},${selectedPlace.coordinates.lng}`;
        const url = GoogleMapsService.buildEmbeddableUrl(origin, activeBasecamp.coordinates, destination);
        setEmbedUrl(url);
      }
    };

    return (
      <div className={`relative w-full h-full bg-gray-900 rounded-2xl overflow-hidden ${className}`}>
        {/* Search Bar - Centered */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 w-full max-w-md px-4">
          <form onSubmit={handleSearch} className="relative">
            <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places on map..."
              disabled={isSearching}
              className="w-full bg-white/95 backdrop-blur-sm border border-gray-300 rounded-xl pl-10 pr-10 py-2.5 text-gray-800 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-lg text-sm disabled:opacity-70 disabled:cursor-not-allowed"
            />
            {/* Clear/Loading Button */}
            {isSearching ? (
              <Loader2 size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 animate-spin" />
            ) : searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </form>
          {/* Error Message */}
          {searchError && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              {searchError}
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
        {isLoading && (
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="bg-gray-900/95 backdrop-blur-sm border border-gray-800 rounded-xl p-6 shadow-2xl">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-white font-medium">Loading map...</p>
              </div>
            </div>
          </div>
        )}

        {/* Google Maps Iframe */}
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full border-0"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title="Trip Map"
          allow="geolocation"
        />
      </div>
    );
  }
);

MapCanvas.displayName = 'MapCanvas';
