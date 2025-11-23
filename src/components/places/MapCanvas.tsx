/// <reference types="@types/google.maps" />

import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { BasecampLocation } from '@/types/basecamp';
import { PlaceInfoOverlay, PlaceInfo } from './PlaceInfoOverlay';
import {
  loadMaps,
  autocomplete,
  resolveQuery,
  centerMapOnPlace,
  SearchOrigin,
  withTimeout,
  generateSessionToken,
} from '@/services/googlePlacesNew';
import { GoogleMapsEmbed } from '@/components/GoogleMapsEmbed';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { useMapState } from '@/hooks/map/useMapState';
import { useMapSearch } from '@/hooks/map/useMapSearch';
import { useMapRouting } from '@/hooks/map/useMapRouting';

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
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  showRoute: (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => Promise<void>;
  clearRoute: () => void;
  getAutocomplete: (query: string, origin?: SearchOrigin) => Promise<any[]>;
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
    // Custom hooks for state management
    const mapState = useMapState();
    const mapSearch = useMapSearch();
    const mapRouting = useMapRouting();

    // Destructure for easier access
    const {
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
    } = mapState;

    const {
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
      clearSearch: clearSearchFromHook,
    } = mapSearch;

    const {
      routePolyline,
      showRoute,
      routeInfo,
      markersRef,
      setRoutePolyline,
      setShowRoute,
      setRouteInfo,
      getCachedDistance,
      setCachedDistance,
      clearRoute: clearRouteFromHook,
    } = mapRouting;

    // Configurable debounce delay (default: 300ms, can be adjusted via env or config)
    const AUTOCOMPLETE_DEBOUNCE_MS = parseInt(
      import.meta.env.VITE_AUTOCOMPLETE_DEBOUNCE_MS || '300',
      10
    );

    // Route rendering function
    const renderRoute = async (
      origin: { lat: number; lng: number },
      destination: { lat: number; lng: number }
    ) => {
      if (!mapRef.current || !window.google) {
        return;
      }

      // Clear existing route
      if (routePolyline) {
        routePolyline.setMap(null);
      }

      try {
        const google = window.google;
        const directionsService = new google.maps.DirectionsService();

        const result = await directionsService.route({
          origin: new google.maps.LatLng(origin.lat, origin.lng),
          destination: new google.maps.LatLng(destination.lat, destination.lng),
          travelMode: google.maps.TravelMode.DRIVING,
        });

        if (result.routes[0]) {
          const route = result.routes[0];
          const leg = route.legs[0];

          const polyline = new google.maps.Polyline({
            path: route.overview_path,
            geodesic: true,
            strokeColor: '#3B82F6', // blue-500
            strokeOpacity: 0.8,
            strokeWeight: 4,
            map: mapRef.current,
          });

          setRoutePolyline(polyline);
          setShowRoute(true);

          // Extract and store route info
          setRouteInfo({
            distance: leg.distance?.text || 'Unknown',
            duration: leg.duration?.text || 'Unknown',
          });

          // Fit map to show entire route
          const bounds = new google.maps.LatLngBounds();
          route.overview_path.forEach(point => bounds.extend(point));
          mapRef.current.fitBounds(bounds);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[MapCanvas] Route rendering error:', error);
        }
      }
    };

    // Use clearRoute from mapRouting hook
    const clearRoute = clearRouteFromHook;

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      centerOn: (latLng: { lat: number; lng: number }, zoom = 15) => {
        if (mapRef.current && window.google && latLng) {
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
        } else {
          console.warn('[MapCanvas] Cannot center - map not ready or invalid coords');
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
      getMap: () => mapRef.current,
      search: async (query: string) => {
        await handleSearch(query);
      },
      clearSearch: () => {
        handleClearSearch();
      },
      showRoute: async (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => {
        await renderRoute(origin, destination);
      },
      clearRoute: () => {
        clearRoute();
      },
      getAutocomplete: async (query: string, origin?: SearchOrigin) => {
        if (!sessionToken) {
          console.warn('[MapCanvas] No session token for autocomplete');
          return [];
        }
        try {
          const predictions = await autocomplete(query, sessionToken, origin || searchOrigin);
          return predictions;
        } catch (error) {
          console.error('[MapCanvas] Autocomplete error:', error);
          return [];
        }
      }
    }));

    // Initialize map
    useEffect(() => {
      let mounted = true;
      
      // Emergency timeout: if map doesn't load in 8 seconds, force iframe fallback
      loadingTimeoutRef.current = setTimeout(() => {
        if (mounted && isMapLoading) {
          setForceIframeFallback(true);
          setUseFallbackEmbed(true);
          setIsMapLoading(false);
          onMapReady?.(); // Notify parent that loading is complete (even with fallback)
        }
      }, 8000); // Reduced from 15s to 8s

      const initMap = async () => {
        try {
          setIsMapLoading(true);
          setMapError(null);

          const maps = await loadMaps();

          if (!mounted || !mapContainerRef.current) {
            return;
          }

          // Determine initial center based on hierarchy
          let center = { lat: 40.7580, lng: -73.9855 }; // NYC fallback
          let zoom = 12;

          // Priority 1: Trip Basecamp
          if (tripBasecamp?.coordinates) {
            center = tripBasecamp.coordinates;
            zoom = 12;
          }
          // Priority 2: Personal Basecamp
          else if (personalBasecamp?.coordinates) {
            center = personalBasecamp.coordinates;
            zoom = 12;
          }
          // Priority 3: User Geolocation
          else if (userGeolocation) {
            center = userGeolocation;
            zoom = 13;
          }

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

          // Monitor for Google Maps error overlay
          const errorCheckInterval = setInterval(() => {
            const hasGmError = !!mapContainerRef.current?.querySelector('.gm-err-container');
            if (hasGmError) {
              clearInterval(errorCheckInterval);
              if (import.meta.env.DEV) {
                console.error('[MapCanvas] Detected Google Maps error overlay – likely API key or billing issue');
              }
              setUseFallbackEmbed(true);
              setMapError('Google Maps API Error: Please check your API key, enabled APIs, and billing status in Google Cloud Console.');
              setIsMapLoading(false);
            }
          }, 500);

          // Stop checking after 3 seconds
          setTimeout(() => clearInterval(errorCheckInterval), 3000);

          // Generate initial session token for New API
          setSessionToken(generateSessionToken());

          // Clear emergency timeout - map loaded successfully
          if (loadingTimeoutRef.current) {
            clearTimeout(loadingTimeoutRef.current);
            loadingTimeoutRef.current = null;
          }

          setIsMapLoading(false);
          onMapReady?.();
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('[MapCanvas] Map initialization error:', error);
          }
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
            onMapReady?.(); // Notify parent that loading is complete (even with error)
          }
        }
      };

      // Try to init map, but if it fails immediately, force iframe fallback
      try {
        initMap();
      } catch (syncError) {
        if (import.meta.env.DEV) {
          console.error('[MapCanvas] Synchronous error during init:', syncError);
        }
        setForceIframeFallback(true);
        setUseFallbackEmbed(true);
        setIsMapLoading(false);
        onMapReady?.(); // Notify parent that loading is complete (even with sync error)
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
          },
          (error) => {
            if (import.meta.env.DEV) {
              console.warn('[MapCanvas] Geolocation error:', error);
            }
            // Fallback to NYC
            setUserGeolocation({ lat: 40.7580, lng: -73.9855 });
            
            // Notify user about geolocation failure
            import('sonner').then(({ toast }) => {
              toast.info('Location access denied. Defaulting to New York City. Set a Base Camp for better results.', {
                duration: 5000,
              });
            });
          }
        );
      }
    }, [tripBasecamp, personalBasecamp]);

    // Update search origin when context changes (for biasing searches)
    useEffect(() => {
      if (!mapRef.current) return;

      // Determine which basecamp to use for search biasing
      let targetBasecamp: BasecampLocation | null = null;
      
      if (activeContext === 'trip') {
        targetBasecamp = tripBasecamp || null;
      } else if (activeContext === 'personal') {
        targetBasecamp = personalBasecamp || null;
      }

      // Update search origin for biasing only (no auto-centering)
      setSearchOrigin(targetBasecamp?.coordinates || null);

      // Note: Removed auto-centering logic - basecamps are reference addresses only
      // Map will center only when user geolocation is available AND no basecamps set
      if (!tripBasecamp && !personalBasecamp && userGeolocation && mapRef.current) {
        mapRef.current.setCenter(userGeolocation);
        mapRef.current.setZoom(13);
      }

      // If place is selected, re-trigger search to recalculate distance from new basecamp
      if (selectedPlace?.name && sessionToken) {
        handleSearch(selectedPlace.name);
      }
    }, [activeContext, tripBasecamp, personalBasecamp, userGeolocation]);

    // ** PHASE 1 & 6: Non-blocking distance calculation with caching **
    useEffect(() => {
      if (!selectedPlace?.coordinates) return;
      
      const activeBasecamp = activeContext === 'trip' ? tripBasecamp : personalBasecamp;


      // Early exit if no basecamp coordinates
      if (!activeBasecamp?.coordinates) {
        return;
      }

      const calculateDistance = async () => {
        try {
          const origin = `${activeBasecamp.coordinates.lat},${activeBasecamp.coordinates.lng}`;
          const destination = `${selectedPlace.coordinates.lat},${selectedPlace.coordinates.lng}`;
          
          // ** PHASE 6: Check cache first **
          const cached = getCachedDistance(origin, destination);
          if (cached) {
            setSelectedPlace(prev => prev?.placeId === selectedPlace.placeId
              ? { ...prev, distance: { ...cached, mode: 'driving' } }
              : prev
            );
            return;
          }

          // Cache miss - fetch from API
          const { GoogleMapsService } = await import('@/services/googleMapsService');
          
          const distanceData = await withTimeout(
            GoogleMapsService.getDistanceMatrix(origin, destination, 'DRIVING'),
            5000,
            'Distance calculation timed out'
          );
          
          if (distanceData.status === 'OK' && distanceData.rows[0]?.elements[0]?.status === 'OK') {
            const element = distanceData.rows[0].elements[0];
            const distanceInfo = {
              distance: element.distance.text,
              duration: element.duration.text,
            };


            // ** PHASE 6: Store in cache **
            setCachedDistance(origin, destination, distanceInfo);

            setSelectedPlace(prev => prev?.placeId === selectedPlace.placeId
              ? { ...prev, distance: { ...distanceInfo, mode: 'driving' } }
              : prev
            );
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('[MapCanvas] Distance calculation failed:', error);
          }
        }
      };

      calculateDistance();
    }, [selectedPlace?.placeId, activeContext, tripBasecamp?.coordinates, personalBasecamp?.coordinates]);

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

    // Debounced autocomplete handler with configurable delay
    const debouncedAutocomplete = useDebouncedCallback(
      async (value: string) => {
        if (!value.trim() || !sessionToken) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }

        // Phase A: Increment request ID to invalidate previous requests
        const currentRequestId = ++activeAutocompleteRequestRef.current;
        
        try {
          const predictions = await autocomplete(value, sessionToken, searchOrigin);
          
          // Phase A: Only update if this is still the latest request
          if (currentRequestId === activeAutocompleteRequestRef.current) {
            setSuggestions(predictions);
            setShowSuggestions(predictions.length > 0);
          }
        } catch (error) {
          // Phase A: Only show error if this is still the latest request
          if (currentRequestId === activeAutocompleteRequestRef.current) {
            if (import.meta.env.DEV) {
              console.error('[MapCanvas] Autocomplete error:', error);
            }
            setSuggestions([]);
            setShowSuggestions(false);
            // Reset session token on error to prevent billing issues
            setSessionToken(generateSessionToken());
          }
        }
      },
      AUTOCOMPLETE_DEBOUNCE_MS
    );

    // Autocomplete handler (New API) with debounce and deduplication
    const handleSearchInput = (value: string) => {
      setSearchQuery(value);
      setSearchError(null);

      if (!value.trim() || !sessionToken) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      // Trigger debounced autocomplete
      debouncedAutocomplete(value);
    };

    // Search submission handler (New API)
    const handleSearch = async (query: string, overrideOrigin?: SearchOrigin) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery || !mapRef.current || !sessionToken) return;

      setIsSearching(true);
      setSearchError(null);
      setShowSuggestions(false);

      try {
        const effectiveOrigin = overrideOrigin || searchOrigin;

        // Wrap search in 10s timeout to prevent indefinite hangs
        const place = await withTimeout(
          resolveQuery(trimmedQuery, effectiveOrigin, sessionToken),
          10000,
          'Search timed out after 10 seconds'
        );

        if (!place) {
          setSearchError('No results found. Try a different search term.');
          return;
        }

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

        // Set initial place info WITHOUT distance (distance loads async)
        const placeInfo: PlaceInfo = {
          name: place.name || trimmedQuery,
          address: place.formatted_address,
          coordinates: place.geometry?.location
            ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
            : undefined,
          placeId: place.place_id,
          rating: place.rating,
          website: place.website,
          distance: null,
          photos: place.photos
        };

        setSelectedPlace(placeInfo);

        // Reset session token after successful search (New API)
        setSessionToken(generateSessionToken());
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[MapCanvas] Search error:', error);
        }
        const errorMsg = error instanceof Error ? error.message : 'Search failed. Please try again.';
        setSearchError(errorMsg);
        // Reset session token on error
        setSessionToken(generateSessionToken());
      } finally {
        // GUARANTEED to run - always reset searching state
        setIsSearching(false);
      }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSearch(searchQuery);
    };

    const handleSuggestionClick = (prediction: any) => {
      setSearchQuery(prediction.description);
      setShowSuggestions(false);
      handleSearch(prediction.description);
    };

    const handleClearSearch = () => {
      clearSearchFromHook();
      clearRoute();
    };

    const handleViewDirections = async () => {
      if (!selectedPlace?.coordinates) return;

      const activeBasecamp = activeContext === 'trip' ? tripBasecamp : personalBasecamp;
      if (!activeBasecamp?.coordinates) return;

      // Render route on the map
      await renderRoute(activeBasecamp.coordinates, selectedPlace.coordinates);
    };

    // If fallback embed mode is enabled, show the iframe instead
    if (useFallbackEmbed || forceIframeFallback) {
      return (
        <div className={`relative w-full h-full bg-gray-900 rounded-2xl overflow-hidden ${className}`}>
          <GoogleMapsEmbed className="w-full h-full" />
        </div>
      );
    }

    return (
      <div className={`relative w-full h-full bg-gray-900 rounded-2xl overflow-hidden ${className}`}>
        {/* Route Info Overlay - Phase 4 */}
        {routeInfo && showRoute && (
          <div className="absolute top-20 left-4 z-20 bg-blue-600 text-white rounded-lg px-4 py-3 shadow-xl">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <path d="M9 17h6"/>
                <circle cx="17" cy="17" r="2"/>
              </svg>
              <div>
                <div className="text-sm font-bold">{routeInfo.distance}</div>
                <div className="text-xs opacity-90">{routeInfo.duration}</div>
              </div>
            </div>
          </div>
        )}

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
