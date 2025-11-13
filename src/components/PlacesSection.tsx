import React, { useState, useEffect, useRef } from 'react';
import { Home } from 'lucide-react';
import { MapCanvas, MapCanvasRef } from './places/MapCanvas';
import { UnifiedMapControls } from './places/UnifiedMapControls';
import { GreenNotice } from './places/GreenNotice';
import { BasecampsPanel } from './places/BasecampsPanel';
import { LinksPanel } from './places/LinksPanel';
import { TripBaseCampCard } from './places/TripBaseCampCard';
import { PersonalBaseCampCard } from './places/PersonalBaseCampCard';
import { BasecampLocation, PlaceWithDistance, DistanceCalculationSettings, PlaceCategory } from '../types/basecamp';
import { DistanceCalculator } from '../utils/distanceCalculator';
import { useTripVariant } from '../contexts/TripVariantContext';
import { AddToCalendarData } from '../types/calendar';
import { useFeatureToggle, DEFAULT_FEATURES } from '../hooks/useFeatureToggle';
import { usePlacesLinkSync } from '../hooks/usePlacesLinkSync';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useBasecamp } from '@/contexts/BasecampContext';
import { supabase } from '@/integrations/supabase/client';
import { basecampService, PersonalBasecamp } from '@/services/basecampService';
import { demoModeService } from '@/services/demoModeService';
import { getTripById, generateTripMockData } from '@/data/tripsData';
import { toast } from 'sonner';

interface PlacesSectionProps {
  tripId?: string;
  tripName?: string;
}

type TabView = 'basecamps' | 'links';

export const PlacesSection = ({ tripId = '1', tripName = 'Your Trip' }: PlacesSectionProps) => {
  const { variant } = useTripVariant();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const { basecamp: contextBasecamp, setBasecamp: setContextBasecamp, isBasecampSet } = useBasecamp();
  const mapRef = useRef<MapCanvasRef>(null);

  // State
  const [activeTab, setActiveTab] = useState<TabView>('basecamps');
  const [places, setPlaces] = useState<PlaceWithDistance[]>([]);
  const [linkedPlaceIds, setLinkedPlaceIds] = useState<Set<string>>(new Set());
  const [searchContext, setSearchContext] = useState<'trip' | 'personal'>('trip');
  const [personalBasecamp, setPersonalBasecamp] = useState<PersonalBasecamp | null>(null);
  const [showPersonalBasecampSelector, setShowPersonalBasecampSelector] = useState(false);
  
  // Track most recent location for priority centering
  const [lastUpdatedLocation, setLastUpdatedLocation] = useState<{
    type: 'trip' | 'personal' | 'search';
    timestamp: number;
    coords: { lat: number; lng: number };
  } | null>(null);
  
  // Search state (lifted from MapCanvas)
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchOrigin, setSearchOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [distanceSettings] = useState<DistanceCalculationSettings>({
    preferredMode: 'driving',
    unit: 'miles',
    showDistances: true
  });

  const { createLinkFromPlace, removeLinkByPlaceId, updateLinkByPlaceId } = usePlacesLinkSync();

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
      'Accommodation': 'Accommodation',
      'Activities': 'Activity',
      'Attractions': 'Attraction',
      'Food': 'Appetite',
      'Nightlife': 'Other',
      'Event': 'Other',
      'Tips': 'Other',
      'Entrance': 'Other',
      'Cruise': 'Other',
      'General': 'Other',
      'Transportation': 'Other'
    };
    return categoryMap[label] || 'Other';
  };

  // City center coordinates for distance chip display
  const cityCenterCoords: Record<string, { lat: number; lng: number }> = {
    'Cancun': { lat: 21.1619, lng: -86.8515 },
    'Tokyo': { lat: 35.6762, lng: 139.6503 },
    'Bali': { lat: -8.5069, lng: 115.2625 },
    'Nashville': { lat: 36.1627, lng: -86.7816 },
    'Indio': { lat: 33.7206, lng: -116.2156 },
    'Aspen': { lat: 39.1911, lng: -106.8175 },
    'Phoenix': { lat: 33.4484, lng: -112.0740 },
    'Tulum': { lat: 20.211, lng: -87.4659 },
    'Napa Valley': { lat: 38.5, lng: -122.3 },
    'Port Canaveral': { lat: 28.4101, lng: -80.6188 },
    'Yellowstone': { lat: 44.4279, lng: -110.5885 }
  };

  // Load places data on mount
  useEffect(() => {
    const loadPlaces = async () => {
      // Helper to load trip links from tripsData.ts
      const loadDemoPlacesFromTripsData = async (): Promise<PlaceWithDistance[]> => {
        const trip = getTripById(Number(tripId));
        if (!trip) return [];
        
        // Bottom 6 consumer trips (IDs 7-12) intentionally empty to show empty state
        if (trip.id > 6) return [];
        
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
          url: link.url
        }));
      };

      if (isDemoMode) {
        // Load city-specific links from tripsData for demo mode
        try {
          const demoPlaces = await loadDemoPlacesFromTripsData();
          setPlaces(demoPlaces);
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Failed to load demo places:', error);
          }
        }
      } else {
        // Load real data for authenticated users
        const { data, error } = await supabase
          .from('trip_link_index')
          .select('*')
          .eq('trip_id', tripId);

        if (error) {
          if (import.meta.env.DEV) {
            console.error('Failed to load places:', error);
          }
          return;
        }

        // If DB is empty, fallback to tripsData for mock trips
        if (!data || data.length === 0) {
          const fallbackPlaces = await loadDemoPlacesFromTripsData();
          setPlaces(fallbackPlaces);
          return;
        }

        const placesWithDistance: PlaceWithDistance[] = data
          .map(link => {
            const placeIdMatch = link.og_description?.match(/place_id:([^ |]+)/);
            const placeId = placeIdMatch ? placeIdMatch[1] : link.id.toString();

            const coordsMatch = link.og_description?.match(/coords:([^,]+),([^ |]+)/);
            const coordinates = coordsMatch ? { lat: parseFloat(coordsMatch[1]), lng: parseFloat(coordsMatch[2]) } : undefined;

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
        setPlaces(placesWithDistance);
      }
    };

    loadPlaces();
  }, [tripId, isDemoMode]);

  // Load personal basecamp
  useEffect(() => {
    const loadPersonalBasecamp = async () => {
      try {
        if (isDemoMode) {
          const sessionBasecamp = demoModeService.getSessionPersonalBasecamp(tripId, effectiveUserId);
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

  // Realtime sync for trip basecamp updates
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
          filter: `id=eq.${tripId}`
        },
        async (payload) => {
          // Fetch updated basecamp
          const updatedBasecamp = await basecampService.getTripBasecamp(tripId);
          if (!updatedBasecamp) return;

          // Conflict resolution: Check if this update came from local user
          const now = Date.now();
          const isLocalUpdate = lastLocalUpdateRef.current &&
            now - lastLocalUpdateRef.current.timestamp < UPDATE_DEBOUNCE_MS &&
            updatedBasecamp.address === lastLocalUpdateRef.current.address;

          if (isLocalUpdate) {
            // Still update the context silently
            setContextBasecamp(updatedBasecamp);
          } else {
            // Remote update - show notification
            setContextBasecamp(updatedBasecamp);
            toast.success('Trip Base Camp updated by another member!', {
              description: updatedBasecamp.name || updatedBasecamp.address
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, isDemoMode, setContextBasecamp]);

  // Update search origin when context or basecamps change
  useEffect(() => {
    if (searchContext === 'trip' && contextBasecamp?.coordinates) {
      setSearchOrigin(contextBasecamp.coordinates);
    } else if (searchContext === 'personal' && personalBasecamp?.latitude && personalBasecamp?.longitude) {
      setSearchOrigin({ lat: personalBasecamp.latitude, lng: personalBasecamp.longitude });
    } else {
      setSearchOrigin(null);
    }
  }, [searchContext, contextBasecamp, personalBasecamp]);

  // Recalculate distances for existing places when basecamp changes
  useEffect(() => {
    if (isBasecampSet && contextBasecamp && places.length > 0) {
      const recalculateDistances = async () => {
        const updatedPlaces = await Promise.all(
          places.map(async (place) => {
            try {
              const distance = await DistanceCalculator.calculateDistance(
                contextBasecamp,
                place,
                distanceSettings
              );
              
              const updatedPlace = {
                ...place,
                distanceFromBasecamp: distance ? {
                  [distanceSettings.preferredMode]: distance,
                  unit: distanceSettings.unit as 'miles' | 'km',
                  calculatedAt: new Date().toISOString()
                } : undefined
              };

              // Update the corresponding link
              await updateLinkByPlaceId(place.id, updatedPlace, tripId, user?.id);
              return updatedPlace;
            } catch (error) {
              if (import.meta.env.DEV) {
                console.warn(`Failed to calculate distance for place ${place.id}:`, error);
              }
              return place;
            }
          })
        );

        setPlaces(updatedPlaces);
      };

      recalculateDistances();
    }
  }, [contextBasecamp, isBasecampSet, distanceSettings.preferredMode, distanceSettings.unit]);

  const handleBasecampSet = async (newBasecamp: BasecampLocation) => {
    console.log('[PlacesSection] Setting trip basecamp:', newBasecamp);
    
    // Track local update for conflict resolution
    lastLocalUpdateRef.current = {
      timestamp: Date.now(),
      address: newBasecamp.address
    };
    
    setContextBasecamp(newBasecamp);
    
    // Center map immediately on new basecamp
    if (newBasecamp.coordinates) {
      console.log('[PlacesSection] Centering map on trip basecamp:', newBasecamp.coordinates);
      handleCenterMap(newBasecamp.coordinates, 'trip');
    }
    
    // Recalculate distances for existing places
    if (places.length > 0) {
      const updatedPlaces = await Promise.all(
        places.map(async (place) => {
          const distance = await DistanceCalculator.calculateDistance(
            newBasecamp,
            place,
            distanceSettings
          );
          
          const updatedPlace = {
            ...place,
            distanceFromBasecamp: distance ? {
              ...place.distanceFromBasecamp,
              [distanceSettings.preferredMode]: distance,
              unit: distanceSettings.unit
            } : undefined
          };

          // Update the corresponding link
          await updateLinkByPlaceId(place.id, updatedPlace, tripId, user?.id);
          return updatedPlace;
        })
      );
      setPlaces(updatedPlaces);
    }
  };

  const handlePlaceAdded = async (newPlace: PlaceWithDistance) => {
    // Calculate distance if basecamp is set
    if (contextBasecamp && distanceSettings.showDistances) {
      const distance = await DistanceCalculator.calculateDistance(
        contextBasecamp,
        newPlace,
        distanceSettings
      );

      if (distance) {
        newPlace.distanceFromBasecamp = {
          [distanceSettings.preferredMode]: distance,
          unit: distanceSettings.unit
        };
      }
    }

    setPlaces([...places, newPlace]);

    // Note: Link creation is now manual via "Add to Links" button
  };

  const handleAddToLinks = async (place: PlaceWithDistance) => {
    try {
      await createLinkFromPlace(place, 'You', tripId, user?.id);
      setLinkedPlaceIds(prev => new Set(prev).add(place.id));
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to add place to links:', error);
      }
      return false;
    }
  };

  const handlePlaceRemoved = async (placeId: string) => {
    setPlaces(prev => prev.filter(place => place.id !== placeId));
    setLinkedPlaceIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(placeId);
      return newSet;
    });
    await removeLinkByPlaceId(placeId, tripId, user?.id);
  };

  const handleEventAdded = (eventData: AddToCalendarData) => {
    // Event added to calendar
  };

  const handleCenterMap = (coords: { lat: number; lng: number }, type?: 'trip' | 'personal' | 'search') => {
    console.log('[PlacesSection] handleCenterMap called:', { coords, type });
    
    if (!coords?.lat || !coords?.lng) {
      console.warn('[PlacesSection] Invalid coordinates provided to handleCenterMap');
      return;
    }
    
    mapRef.current?.centerOn(coords, 15);
    
    if (type) {
      // Track most recent location update
      setLastUpdatedLocation({
        type: type === 'search' ? 'trip' : type,
        timestamp: Date.now(),
        coords: coords
      });
      
      // Update search context (for UI highlighting)
      if (type !== 'search') {
        setSearchContext(type);
      }
    }
  };

  const handleContextChange = (context: 'trip' | 'personal') => {
    console.log('[PlacesSection] Context change:', context);
    
    // Always update the search context for proper toggle highlighting
    setSearchContext(context);

    // Update search origin and center map
    if (context === 'trip' && contextBasecamp?.coordinates) {
      console.log('[PlacesSection] Centering on trip basecamp:', contextBasecamp.coordinates);
      setSearchOrigin(contextBasecamp.coordinates);
      mapRef.current?.centerOn(contextBasecamp.coordinates, 15);
    } else if (context === 'personal' && personalBasecamp?.latitude && personalBasecamp?.longitude) {
      const coords = { lat: personalBasecamp.latitude, lng: personalBasecamp.longitude };
      console.log('[PlacesSection] Centering on personal basecamp:', coords);
      setSearchOrigin(coords);
      mapRef.current?.centerOn(coords, 15);
    } else {
      console.warn('[PlacesSection] Cannot center - basecamp not set for context:', context);
    }

    // If personal basecamp is not set, also open the selector
    if (context === 'personal' && !personalBasecamp) {
      setShowPersonalBasecampSelector(true);
    }
  };

  // Search handlers with autocomplete
  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);
    setSearchError(null);
    
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    // Fetch autocomplete suggestions
    try {
      const predictions = await mapRef.current?.getAutocomplete(query, searchOrigin);
      setSuggestions(predictions || []);
      setShowSuggestions((predictions || []).length > 0);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[PlacesSection] Autocomplete error:', error);
      }
      setSuggestions([]);
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setShowSuggestions(false);
    
    // Failsafe: Reset searching state after 15 seconds max
    const timeoutId = setTimeout(() => {
      setIsSearching(false);
      setSearchError('Search timed out. Please try again.');
    }, 15000);

    try {
      await mapRef.current?.search(searchQuery);
      clearTimeout(timeoutId);
      setSearchError(null);
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

  const handleSuggestionClick = async (prediction: google.maps.places.AutocompletePrediction) => {
    setSearchQuery(prediction.description);
    setShowSuggestions(false);

    setIsSearching(true);
    try {
      await mapRef.current?.search(prediction.description);
      setSearchError(null);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[PlacesSection] Search error:', error);
      }
      setSearchError('Search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchError(null);
    setSuggestions([]);
    setShowSuggestions(false);
    mapRef.current?.clearSearch();
  };

  const toBasecampLocation = (pb: PersonalBasecamp): BasecampLocation => ({
    address: pb.address || '',
    name: pb.name,
    type: 'other',
    coordinates: pb.latitude && pb.longitude ? { lat: pb.latitude, lng: pb.longitude } : undefined
  });

  const handleMapReady = () => {
    setIsMapLoading(false);
  };

  return (
    <div className="mb-12 mobile-safe-scroll">
      {/* ROW 1: Header with LEFT-aligned title and CENTERED tabs */}
      <div className="mb-6 flex flex-row items-center w-full px-4">
        <h2 className="flex-none text-3xl font-bold text-white">Places</h2>
        
        {/* Centered Tab Navigation */}
        <div className="flex-1 flex justify-center">
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
      </div>

      {/* Tab Content - ABOVE map */}
      <div className="w-full px-4 mb-6">

            {activeTab === 'basecamps' && (
              <BasecampsPanel
                tripId={tripId}
                tripBasecamp={contextBasecamp}
                onTripBasecampSet={handleBasecampSet}
                onCenterMap={handleCenterMap}
                activeContext={searchContext}
                onContextChange={handleContextChange}
                personalBasecamp={personalBasecamp}
                onPersonalBasecampUpdate={setPersonalBasecamp}
              />
            )}

            {activeTab === 'links' && (
              <LinksPanel
                places={places}
                basecamp={contextBasecamp}
                personalBasecamp={personalBasecamp}
                onPlaceAdded={(place) => {
                  setPlaces(prev => [...prev, place]);
                }}
                onPlaceRemoved={(placeId) => {
                  setPlaces(prev => prev.filter(p => p.id !== placeId));
                  removeLinkByPlaceId(tripId, placeId);
                }}
                onAddToLinks={async (place) => {
                  await createLinkFromPlace(place, 'You', tripId, effectiveUserId);
                  return true;
                }}
                linkedPlaceIds={linkedPlaceIds}
                onEventAdded={(eventData) => {
                  // Event added to calendar
                }}
                onCenterMap={(coords) => {
                  if (mapRef.current) {
                    mapRef.current.centerOn(coords, 15);
                  }
                }}
                distanceUnit={distanceSettings.unit}
                preferredMode={distanceSettings.preferredMode}
              />
            )}

            {/* Context Notice */}
            <GreenNotice
              activeContext={searchContext}
              tripBasecamp={contextBasecamp}
              personalBasecamp={personalBasecamp ? toBasecampLocation(personalBasecamp) : null}
            />
          </div>

      {/* Map - ALWAYS AT BOTTOM */}
      <div className="mb-6">
        <div className="relative h-[52.5vh] md:h-[450px] rounded-2xl overflow-hidden shadow-2xl">
          <MapCanvas
            ref={mapRef}
            activeContext={searchContext}
            tripBasecamp={contextBasecamp}
            personalBasecamp={personalBasecamp ? toBasecampLocation(personalBasecamp) : null}
            className="w-full h-full"
            onMapReady={handleMapReady}
          />

          {/* Unified Map Controls - floating on map (search bar only) */}
          <UnifiedMapControls
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onSearchSubmit={handleSearchSubmit}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            isSearching={isSearching}
            searchError={searchError}
            searchOrigin={searchOrigin}
            activeContext={searchContext}
            onContextChange={handleContextChange}
            tripBasecampSet={isBasecampSet}
            personalBasecampSet={!!personalBasecamp}
            onClearSearch={handleClearSearch}
            onSuggestionClick={handleSuggestionClick}
            isMapLoading={isMapLoading}
          />
        </div>
      </div>
    </div>
  );
};
