import React, { useState, useEffect, useRef } from 'react';
import { MapCanvas, MapCanvasRef } from './places/MapCanvas';
import { MapOverlayChips } from './places/MapOverlayChips';
import { GreenNotice } from './places/GreenNotice';
import { BasecampsPanel } from './places/BasecampsPanel';
import { LinksPanel } from './places/LinksPanel';
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
import MockDataService from '@/services/mockDataService';
import { toast } from 'sonner';

interface PlacesSectionProps {
  tripId?: string;
  tripName?: string;
}

type TabView = 'overview' | 'basecamps' | 'links';

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

  // Load places data on mount
  useEffect(() => {
    const loadPlaces = async () => {
      if (isDemoMode) {
        // Load mock data in demo mode
        try {
          const mockPlaces = await MockDataService.getMockPlaceItems(tripId, true);
          const mapCategoryToPlaceCategory = (cat: string): PlaceCategory => {
            const categoryMap: Record<string, PlaceCategory> = {
              'activity': 'Activity',
              'attraction': 'Attraction',
              'appetite': 'Appetite',
              'accommodation': 'Accommodation',
              'fitness': 'Activity',
              'hotel': 'Accommodation',
              'nightlife': 'Other',
              'restaurant': 'Appetite',
              'transportation': 'Other'
            };
            return categoryMap[cat.toLowerCase()] || 'Other';
          };

          const placesWithDistance: PlaceWithDistance[] = mockPlaces.map(place => ({
            id: place.id,
            name: place.name,
            address: place.address,
            coordinates: place.coordinates,
            category: mapCategoryToPlaceCategory(place.category),
            rating: place.rating,
            url: place.url,
            distanceFromBasecamp: place.distanceFromBasecamp
          }));
          setPlaces(placesWithDistance);
        } catch (error) {
          console.error('Failed to load mock places:', error);
        }
      } else {
        // Load real data for authenticated users
        const { data, error } = await supabase
          .from('trip_link_index')
          .select('*')
          .eq('trip_id', tripId);

        if (error) {
          console.error('Failed to load places:', error);
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
        console.error('Failed to load personal basecamp:', error);
      }
    };

    loadPersonalBasecamp();
  }, [tripId, user, isDemoMode, effectiveUserId]);

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
          console.log('[PlacesSection] Trip basecamp updated by another user:', payload);
          
          // Fetch updated basecamp
          const updatedBasecamp = await basecampService.getTripBasecamp(tripId);
          if (updatedBasecamp) {
            setContextBasecamp(updatedBasecamp);
            
            // Show toast notification
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
              console.warn(`Failed to calculate distance for place ${place.id}:`, error);
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
    console.log('Setting basecamp:', newBasecamp);
    setContextBasecamp(newBasecamp);
    
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
    console.log('Adding place:', newPlace);

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
      console.error('Failed to add place to links:', error);
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
    console.log('Event added to calendar:', eventData);
  };

  const handleCenterMap = (coords: { lat: number; lng: number }, type?: 'trip' | 'personal') => {
    mapRef.current?.centerOn(coords, 15);
    if (type) {
      setSearchContext(type);
    }
  };

  const handleContextChange = (context: 'trip' | 'personal') => {
    console.log(`Search context set to: ${context}`);

    // Always update the search context for proper toggle highlighting
    setSearchContext(context);

    // Center the map on the appropriate basecamp when switching contexts
    if (context === 'trip' && contextBasecamp?.coordinates) {
      mapRef.current?.centerOn(contextBasecamp.coordinates, 15);
    } else if (context === 'personal' && personalBasecamp?.latitude && personalBasecamp?.longitude) {
      mapRef.current?.centerOn({ lat: personalBasecamp.latitude, lng: personalBasecamp.longitude }, 15);
    }

    // If personal basecamp is not set, also open the selector
    if (context === 'personal' && !personalBasecamp) {
      setShowPersonalBasecampSelector(true);
    }
  };

  const toBasecampLocation = (pb: PersonalBasecamp): BasecampLocation => ({
    address: pb.address || '',
    name: pb.name,
    type: 'other',
    coordinates: pb.latitude && pb.longitude ? { lat: pb.latitude, lng: pb.longitude } : undefined
  });

  return (
    <div className="mb-12">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white">Places</h2>
      </div>

      {/* Single Map with Overlays - Pinned at top */}
      <div className="mb-6">
        <div className="relative h-[52.5vh] md:h-[450px] rounded-2xl overflow-hidden shadow-2xl">
          <MapCanvas
            ref={mapRef}
            activeContext={searchContext}
            tripBasecamp={contextBasecamp}
            personalBasecamp={personalBasecamp ? toBasecampLocation(personalBasecamp) : null}
            className="w-full h-full"
          />

          {/* Map Overlay Chips - floating on map */}
          <MapOverlayChips
            activeContext={searchContext}
            onContextChange={handleContextChange}
            tripBasecampSet={isBasecampSet}
            personalBasecampSet={!!personalBasecamp}
          />
        </div>

        {/* Green Notice - below map */}
        <div className="mt-4">
          <GreenNotice
            activeContext={searchContext}
            tripBasecamp={contextBasecamp}
            personalBasecamp={personalBasecamp ? toBasecampLocation(personalBasecamp) : null}
          />
        </div>
      </div>

      {/* Segmented Control Navigation */}
      <div className="mb-6 flex justify-center px-4">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-1 flex gap-1 w-full max-w-md mx-auto">
          {(['overview', 'basecamps', 'links'] as TabView[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all capitalize ${
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

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-6 shadow-lg">
                <h4 className="text-gray-400 text-sm mb-1">Active Context</h4>
                <p className="text-white text-xl font-semibold capitalize">{searchContext} Base Camp</p>
              </div>
              <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-6 shadow-lg">
                <h4 className="text-gray-400 text-sm mb-1">Saved Links</h4>
                <p className="text-white text-xl font-semibold">{places.length}</p>
              </div>
              <div className="bg-gray-900/80 border border-white/10 rounded-2xl p-6 shadow-lg">
                <h4 className="text-gray-400 text-sm mb-1">Basecamps Set</h4>
                <p className="text-white text-xl font-semibold">
                  {(isBasecampSet ? 1 : 0) + (personalBasecamp ? 1 : 0)} / 2
                </p>
              </div>
            </div>
          </div>
        )}

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
            onPlaceAdded={handlePlaceAdded}
            onPlaceRemoved={handlePlaceRemoved}
            onAddToLinks={handleAddToLinks}
            linkedPlaceIds={linkedPlaceIds}
            onEventAdded={handleEventAdded}
            onCenterMap={handleCenterMap}
            distanceUnit={distanceSettings.unit}
            preferredMode={distanceSettings.preferredMode}
          />
        )}
      </div>
    </div>
  );
};
