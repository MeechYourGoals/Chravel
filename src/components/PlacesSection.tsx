import React, { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MapCanvas, MapCanvasRef } from './places/MapCanvas';
import { UnifiedMapControls } from './places/UnifiedMapControls';
import { BasecampsPanel } from './places/BasecampsPanel';
import { LinksPanel } from './places/LinksPanel';
import {
  BasecampLocation,
  PlaceWithDistance,
  DistanceCalculationSettings,
  PlaceCategory,
} from '../types/basecamp';
import { useTripVariant } from '../contexts/TripVariantContext';
import { usePlacesLinkSync } from '../hooks/usePlacesLinkSync';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useTripBasecamp, useUpdateTripBasecamp, tripBasecampKeys } from '@/hooks/useTripBasecamp';
import { supabase } from '@/integrations/supabase/client';
import { basecampService, PersonalBasecamp } from '@/services/basecampService';
import { demoModeService } from '@/services/demoModeService';
import { getTripById, generateTripMockData } from '@/data/tripsData';
import { toast } from 'sonner';
import { cacheEntity, getCachedEntity } from '@/offline/cache';
import { withTimeout } from '@/utils/timeout';
import { useLoadingTimeout } from '@/hooks/useLoadingTimeout';

interface PlacesSectionProps {
  tripId?: string;
  tripName?: string;
}

type TabView = 'basecamps' | 'links';

export const PlacesSection = ({
  tripId = '1',
  tripName: _tripName = 'Your Trip',
}: PlacesSectionProps) => {
  // Reserved for context-aware title
  const { variant: _variant } = useTripVariant();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const queryClient = useQueryClient();

  // Use TanStack Query for trip basecamp (canonical source of truth)
  const { data: tripBasecamp, isLoading: isBasecampLoading } = useTripBasecamp(tripId);
  const updateBasecampMutation = useUpdateTripBasecamp(tripId);

  const mapRef = useRef<MapCanvasRef>(null);

  // State
  const [activeTab, setActiveTab] = useState<TabView>('basecamps');
  const [places, setPlaces] = useState<PlaceWithDistance[]>([]);
  const [linkedPlaceIds, setLinkedPlaceIds] = useState<Set<string>>(new Set());
  const [searchContext, setSearchContext] = useState<'trip' | 'personal'>('trip');
  const [personalBasecamp, setPersonalBasecamp] = useState<PersonalBasecamp | null>(null);
  const [isPlacesLoading, setIsPlacesLoading] = useState(true);
  const [placesError, setPlacesError] = useState<string | null>(null);
  // Reserved for personal basecamp modal
  const [_showPersonalBasecampSelector, setShowPersonalBasecampSelector] = useState(false);

  // Track most recent location for priority centering (reserved for future use)
  const [_lastUpdatedLocation, setLastUpdatedLocation] = useState<{
    type: 'trip' | 'personal' | 'search';
    timestamp: number;
    coords: { lat: number; lng: number };
  } | null>(null);

  // Search state (simplified - no autocomplete)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const placesLoadingTimedOut = useLoadingTimeout(isPlacesLoading, 10000);
  const mapLoadingTimedOut = useLoadingTimeout(isMapLoading, 10000);
  // Distance settings for display purposes (basecamp distances are no longer calculated)
  const distanceSettings: DistanceCalculationSettings = {
    preferredMode: 'driving',
    unit: 'miles',
    showDistances: false, // Disabled since basecamps no longer have coordinates
  };

  const { createLinkFromPlace, removeLinkByPlaceId } = usePlacesLinkSync();

  // Generate demo user ID
  const getDemoUserId = () => {
    let demoId = sessionStorage.getItem('demo-user-id');
    if (!demoId) {
      demoId = `demo-user-${Date.now()}`;
      sessionStorage.setItem('demo-user-id', demoId);
    }
    return demoId;
  };

  const effectiveUserId = user?.id || getDemoUserId();

  // Helper to map link categories from tripsData to PlaceCategory
  const mapLinkCategoryToPlaceCategory = (label: string): PlaceCategory => {
    const categoryMap: Record<string, PlaceCategory> = {
      Accommodation: 'Accommodation',
      Activities: 'Activity',
      Attractions: 'Attraction',
      Food: 'Appetite',
      Nightlife: 'Other',
      Event: 'Other',
      Tips: 'Other',
      Entrance: 'Other',
      Cruise: 'Other',
      General: 'Other',
      Transportation: 'Other',
    };
    return categoryMap[label] || 'Other';
  };

  // City center coordinates for distance chip display
  const cityCenterCoords: Record<string, { lat: number; lng: number }> = {
    Cancun: { lat: 21.1619, lng: -86.8515 },
    Tokyo: { lat: 35.6762, lng: 139.6503 },
    Bali: { lat: -8.5069, lng: 115.2625 },
    Nashville: { lat: 36.1627, lng: -86.7816 },
    Indio: { lat: 33.7206, lng: -116.2156 },
    Aspen: { lat: 39.1911, lng: -106.8175 },
    Phoenix: { lat: 33.4484, lng: -112.074 },
    Tulum: { lat: 20.211, lng: -87.4659 },
    'Napa Valley': { lat: 38.5, lng: -122.3 },
    'Port Canaveral': { lat: 28.4101, lng: -80.6188 },
    Yellowstone: { lat: 44.4279, lng: -110.5885 },
  };

  // Load places data on mount
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const isActive = () => mounted && !controller.signal.aborted;

    const loadPlaces = async () => {
      setIsPlacesLoading(true);
      setPlacesError(null);
      const cacheKey = `${tripId}:places`;
      const cached = await getCachedEntity({ entityType: 'trip_links', entityId: cacheKey });
      const cachedPlaces = (cached?.data as PlaceWithDistance[] | undefined) ?? [];

      // Helper to load trip links from tripsData.ts
      const loadDemoPlacesFromTripsData = async (): Promise<PlaceWithDistance[]> => {
        const trip = getTripById(Number(tripId));
        if (!trip) return [];

        // Bottom 6 consumer trips (IDs 7-12) intentionally empty to show empty state
        // Only applies to numeric demo trip IDs
        if (typeof trip.id === 'number' && trip.id > 6) return [];

        const { links } = generateTripMockData(trip);
        const city = trip.location.split(',')[0].trim();
        const coords = cityCenterCoords[city];

        return links.slice(0, 5).map((link, i) => ({
          id: `mock-link-${trip.id}-${i + 1}`,
          name: link.title,
          address: '',
          coordinates: coords,
          category: mapLinkCategoryToPlaceCategory(link.category),
          rating: 0,
          url: link.url,
        }));
      };

      try {
        if (isDemoMode) {
          // Load city-specific links from tripsData for demo mode
          const demoPlaces = await loadDemoPlacesFromTripsData();
          if (isActive()) {
            setPlaces(demoPlaces);
          }
        } else {
          // If offline, prefer cached.
          if (navigator.onLine === false && cachedPlaces.length > 0) {
            if (isActive()) {
              setPlaces(cachedPlaces);
            }
            return;
          }

          // Load real data for authenticated users
          const { data, error } = await withTimeout(
            supabase.from('trip_link_index').select('*').eq('trip_id', tripId),
            10000,
            'Failed to load places: Timeout',
          ).catch(err => ({ data: null, error: err }));

          if (error) {
            if (isActive()) {
              setPlacesError(error instanceof Error ? error.message : 'Failed to load places.');
            }
            if (cachedPlaces.length > 0 && isActive()) {
              setPlaces(cachedPlaces);
            }
            return;
          }

          // If DB is empty, fallback to tripsData for mock trips
          if (!data || data.length === 0) {
            const fallbackPlaces = await loadDemoPlacesFromTripsData();
            if (isActive()) {
              setPlaces(fallbackPlaces);
            }
            return;
          }

          const placesWithDistance: PlaceWithDistance[] = data.map(link => {
            const placeIdMatch = link.og_description?.match(/place_id:([^ |]+)/);
            const placeId = placeIdMatch ? placeIdMatch[1] : link.id.toString();

            const coordsMatch = link.og_description?.match(/coords:([^,]+),([^ |]+)/);
            const coordinates = coordsMatch
              ? { lat: parseFloat(coordsMatch[1]), lng: parseFloat(coordsMatch[2]) }
              : undefined;

            const categoryMatch = link.og_description?.match(/category:([^ |]+)/);
            const category = categoryMatch ? categoryMatch[1] : 'other';

            const addressMatch = link.og_description?.match(/Saved from Places: ([^|]+)/);
            const address = addressMatch ? addressMatch[1].trim() : '';

            return {
              id: placeId,
              name: link.og_title || 'Unnamed Place',
              address: address,
              coordinates: coordinates,
              category: category as any,
              rating: 0,
              url: link.url || '',
            };
          });
          if (isActive()) {
            setPlaces(placesWithDistance);
          }

          // Cache for offline access (best-effort).
          await cacheEntity({
            entityType: 'trip_links',
            entityId: cacheKey,
            tripId,
            data: placesWithDistance,
          });
        }
      } catch (error) {
        if (isActive()) {
          setPlacesError(error instanceof Error ? error.message : 'Failed to load places.');
        }
      } finally {
        if (mounted) {
          setIsPlacesLoading(false);
        }
      }
    };

    loadPlaces();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [tripId, isDemoMode]);

  // Trip basecamp is now loaded by useTripBasecamp hook - no manual loading needed
  // The hook handles both demo mode and authenticated mode automatically

  // Load personal basecamp
  useEffect(() => {
    const loadPersonalBasecamp = async () => {
      try {
        if (isDemoMode) {
          const sessionBasecamp = demoModeService.getSessionPersonalBasecamp(
            tripId,
            effectiveUserId,
          );
          setPersonalBasecamp(sessionBasecamp);
        } else if (user) {
          const dbBasecamp = await basecampService.getPersonalBasecamp(tripId, user.id);
          setPersonalBasecamp(dbBasecamp);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to load personal basecamp:', error);
        }
      }
    };

    loadPersonalBasecamp();
  }, [tripId, user, isDemoMode, effectiveUserId]);

  // Track local updates to prevent toast spam
  const lastLocalUpdateRef = useRef<{ timestamp: number; address: string } | null>(null);
  const UPDATE_DEBOUNCE_MS = 2000; // 2 second window to detect local vs remote updates

  // Realtime sync for trip basecamp updates - invalidate TanStack Query cache
  useEffect(() => {
    if (isDemoMode || !tripId) return;

    // Subscribe to trip basecamp changes
    const channel = supabase
      .channel(`trip_basecamp_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        async _payload => {
          // Conflict resolution: Check if this update came from local user
          const now = Date.now();
          const isLocalUpdate =
            lastLocalUpdateRef.current &&
            now - lastLocalUpdateRef.current.timestamp < UPDATE_DEBOUNCE_MS;

          if (!isLocalUpdate) {
            // Remote update - invalidate TanStack Query cache to fetch fresh data
            console.log('[PlacesSection] Remote basecamp update detected, invalidating cache');
            queryClient.invalidateQueries({ queryKey: tripBasecampKeys.trip(tripId) });

            // Fetch updated basecamp to show notification with new value
            const updatedBasecamp = await basecampService.getTripBasecamp(tripId);
            if (updatedBasecamp) {
              toast.success('Trip Base Camp updated by another member!', {
                description: updatedBasecamp.name || updatedBasecamp.address,
              });
            }
          } else {
            console.log('[PlacesSection] Local basecamp update detected, skipping notification');
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, isDemoMode, queryClient]);

  // Note: Search origin and distance calculations are no longer tied to basecamps
  // Basecamps are now simple text references without coordinates
  // The map is for browsing only and is not affected by basecamp changes

  const handleBasecampSet = async (newBasecamp: BasecampLocation) => {
    // Track local update for conflict resolution
    lastLocalUpdateRef.current = {
      timestamp: Date.now(),
      address: newBasecamp.address,
    };

    // Use the mutation hook which handles optimistic updates, rollback, and cache invalidation
    try {
      await updateBasecampMutation.mutateAsync({
        name: newBasecamp.name,
        address: newBasecamp.address,
        latitude: newBasecamp.coordinates?.lat,
        longitude: newBasecamp.coordinates?.lng,
      });

      if (import.meta.env.DEV) {
        console.log('[PlacesSection] Trip basecamp persisted:', newBasecamp.address);
      }
    } catch (error) {
      // Error handling is done in the mutation hook
      if (import.meta.env.DEV) {
        console.error('[PlacesSection] Error saving trip basecamp:', error);
      }
    }
  };

  const handleCenterMap = (
    coords: { lat: number; lng: number },
    type?: 'trip' | 'personal' | 'search',
  ) => {
    if (!coords?.lat || !coords?.lng) {
      if (import.meta.env.DEV) {
        console.warn('[Map] Invalid coordinates provided to handleCenterMap:', coords);
      }
      return;
    }

    // Validate coordinate ranges
    if (coords.lat < -90 || coords.lat > 90 || coords.lng < -180 || coords.lng > 180) {
      if (import.meta.env.DEV) {
        console.error('[Map] Coordinates out of valid range:', coords);
      }
      return;
    }

    mapRef.current?.centerOn(coords, 15);

    if (type) {
      // Track most recent location update for "most recent wins" logic
      setLastUpdatedLocation({
        type: type,
        timestamp: Date.now(),
        coords: coords,
      });

      // Update search context (for UI highlighting)
      if (type !== 'search') {
        setSearchContext(type);
      }
    }
  };

  const handleContextChange = (context: 'trip' | 'personal') => {
    setSearchContext(context);
    // Note: Search origin is no longer tied to basecamps since they don't have coordinates
    // Users can still search the map freely

    // Show personal basecamp selector if personal context selected but not set
    if (context === 'personal' && !personalBasecamp) {
      setShowPersonalBasecampSelector(true);
    }
  };

  // Simple search handler - just update the query
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setSearchError(null);
  };

  // Simple search submit - geocode and center map (like Trip Base Camp)
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    setIsSearching(true);
    setSearchError(null);

    // Failsafe: Reset searching state after 10 seconds max
    const timeoutId = setTimeout(() => {
      setIsSearching(false);
      setSearchError('Search timed out. Please try again.');
    }, 10000);

    try {
      // Import and use Nominatim geocoding directly (same as Trip Base Camp)
      const { GoogleMapsService } = await import('@/services/googleMapsService');
      const coords = await GoogleMapsService.geocodeWithNominatim(trimmedQuery);

      clearTimeout(timeoutId);

      if (coords) {
        // Center map on the found location
        mapRef.current?.centerOn({ lat: coords.lat, lng: coords.lng }, 15);
        setSearchError(null);
      } else {
        // Location not found - show error
        setSearchError('Location not found');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (import.meta.env.DEV) {
        console.error('[PlacesSection] Search error:', error);
      }
      setSearchError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchError(null);
    mapRef.current?.clearSearch();
  };

  const toBasecampLocation = (pb: PersonalBasecamp): BasecampLocation => ({
    address: pb.address || '',
    name: pb.name,
    type: 'other',
    coordinates: pb.latitude && pb.longitude ? { lat: pb.latitude, lng: pb.longitude } : undefined,
  });

  // Wrapper for personal basecamp updates
  const handlePersonalBasecampUpdate = (basecamp: PersonalBasecamp | null) => {
    setPersonalBasecamp(basecamp);
    // Note: Map centering is now disconnected from basecamp saving
    // Basecamps are simple text references without coordinates
  };

  const handleMapReady = () => {
    setIsMapLoading(false);
  };

  return (
    <div className="mb-12 mobile-safe-scroll">
      {/* ROW 1: Header with LEFT-aligned title and CENTERED tabs */}
      <div className="mb-6 flex flex-row items-center justify-between w-full px-0 relative">
        <h2 className="flex-none text-3xl font-bold text-white">Places</h2>

        {/* Centered Tab Navigation */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-1 flex gap-1">
            {(['basecamps', 'links'] as TabView[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2.5 px-4 rounded-lg text-xs sm:text-sm font-medium transition-all capitalize ${
                  activeTab === tab
                    ? 'bg-white/10 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab === 'basecamps' ? 'Base Camps' : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Empty spacer for balance */}
        <div className="flex-none w-[100px]"></div>
      </div>

      {/* Tab Content - ABOVE map */}
      <div className="w-full px-0 mb-2 md:mb-6">
        {(placesError || placesLoadingTimedOut || mapLoadingTimedOut) && (
          <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
            <p className="font-semibold text-amber-100">Places may be unavailable</p>
            <p className="mt-1 text-amber-100/80">
              {placesError
                ? placesError
                : placesLoadingTimedOut
                  ? 'Places data is taking longer than expected. Please try again.'
                  : 'Map is taking longer than expected. Please try again.'}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-2 inline-flex items-center justify-center rounded-md bg-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-500/30"
            >
              Reload
            </button>
          </div>
        )}
        {activeTab === 'basecamps' && (
          <BasecampsPanel
            tripId={tripId}
            tripBasecamp={tripBasecamp || null}
            onTripBasecampSet={handleBasecampSet}
            onCenterMap={handleCenterMap}
            activeContext={searchContext}
            onContextChange={handleContextChange}
            personalBasecamp={personalBasecamp}
            onPersonalBasecampUpdate={handlePersonalBasecampUpdate}
          />
        )}

        {activeTab === 'links' && (
          <LinksPanel
            tripId={tripId}
            places={places}
            basecamp={tripBasecamp || null}
            personalBasecamp={personalBasecamp}
            onPlaceAdded={place => {
              setPlaces(prev => [...prev, place]);
            }}
            onPlaceRemoved={placeId => {
              setPlaces(prev => prev.filter(p => p.id !== placeId));
              removeLinkByPlaceId(tripId, placeId);
            }}
            onAddToLinks={async place => {
              await createLinkFromPlace(place, 'You', tripId, effectiveUserId);
              return true;
            }}
            linkedPlaceIds={linkedPlaceIds}
            onEventAdded={_eventData => {
              // Event added to calendar (reserved for future use)
            }}
            onCenterMap={coords => {
              if (mapRef.current) {
                mapRef.current.centerOn(coords, 15);
              }
            }}
            distanceUnit={distanceSettings.unit}
            preferredMode={distanceSettings.preferredMode}
          />
        )}
      </div>

      {/* Map - ONLY SHOW ON BASECAMPS TAB */}
      {activeTab === 'basecamps' && (
        <div className="mb-2 md:mb-6">
          <div className="relative h-[52.5vh] md:h-[450px] rounded-2xl overflow-hidden shadow-2xl">
            <MapCanvas
              ref={mapRef}
              activeContext={searchContext}
              tripBasecamp={tripBasecamp || null}
              personalBasecamp={personalBasecamp ? toBasecampLocation(personalBasecamp) : null}
              className="w-full h-full"
              onMapReady={handleMapReady}
              onSaveSearchAsBasecamp={location => {
                // Save searched location as trip basecamp
                const newBasecamp: BasecampLocation = {
                  address: location.address,
                  name: location.address.split(',')[0],
                  type: 'other',
                  coordinates: { lat: location.lat, lng: location.lng },
                };
                handleBasecampSet(newBasecamp);
                toast.success('Saved as Trip Base Camp!', {
                  description: newBasecamp.name,
                });
              }}
            />

            {/* Unified Map Controls - floating on map (simple search bar) */}
            <UnifiedMapControls
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              onSearchSubmit={handleSearchSubmit}
              isSearching={isSearching}
              searchError={searchError}
              onClearSearch={handleClearSearch}
              isMapLoading={isMapLoading}
            />
          </div>
        </div>
      )}
    </div>
  );
};
