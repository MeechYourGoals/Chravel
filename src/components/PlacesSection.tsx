import React, { useState, useEffect, useRef } from 'react';
import { MapCanvas, MapCanvasRef } from './places/MapCanvas';
import { MapOverlayChips } from './places/MapOverlayChips';
import { GreenNotice } from './places/GreenNotice';
import { BasecampsPanel } from './places/BasecampsPanel';
import { PlacesPanel } from './places/PlacesPanel';
import { PinsPanel } from './places/PinsPanel';
import { BasecampLocation, PlaceWithDistance, DistanceCalculationSettings } from '../types/basecamp';
import { DistanceCalculator } from '../utils/distanceCalculator';
import { useTripVariant } from '../contexts/TripVariantContext';
import { AddToCalendarData } from '../types/calendar';
import { useFeatureToggle, DEFAULT_FEATURES } from '../hooks/useFeatureToggle';
import { usePlacesLinkSync } from '../hooks/usePlacesLinkSync';
import { useAuth } from '@/hooks/useAuth';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useBasecamp } from '@/contexts/BasecampContext';
import { basecampService, PersonalBasecamp } from '@/services/basecampService';
import { demoModeService } from '@/services/demoModeService';

interface PlacesSectionProps {
  tripId?: string;
  tripName?: string;
}

type TabView = 'overview' | 'basecamps' | 'places' | 'pins';

export const PlacesSection = ({ tripId = '1', tripName = 'Your Trip' }: PlacesSectionProps) => {
  const { variant } = useTripVariant();
  const { user } = useAuth();
  const { isDemoMode } = useDemoMode();
  const { basecamp: contextBasecamp, setBasecamp: setContextBasecamp, isBasecampSet } = useBasecamp();
  const mapRef = useRef<MapCanvasRef>(null);

  // State
  const [activeTab, setActiveTab] = useState<TabView>('basecamps');
  const [places, setPlaces] = useState<PlaceWithDistance[]>([]);
  const [searchContext, setSearchContext] = useState<'trip' | 'personal'>('trip');
  const [personalBasecamp, setPersonalBasecamp] = useState<PersonalBasecamp | null>(null);
  const [layers, setLayers] = useState({
    pins: true,
    places: true,
    saved: true,
    venues: true
  });
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
    
    // Create corresponding link
    await createLinkFromPlace(newPlace, 'You', tripId, user?.id);
  };

  const handlePlaceRemoved = async (placeId: string) => {
    setPlaces(prev => prev.filter(place => place.id !== placeId));
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

  const handleLayerToggle = (layerKey: keyof typeof layers, enabled: boolean) => {
    setLayers(prev => ({ ...prev, [layerKey]: enabled }));
  };

  const handlePlaceSelect = (place: PlaceWithDistance) => {
    if (place.coordinates) {
      handleCenterMap(place.coordinates);
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

      {/* Single Map with Overlays - Sticky at top */}
      <div className="sticky top-[72px] z-30 mb-6">
        <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl">
          <MapCanvas
            ref={mapRef}
            activeContext={searchContext}
            tripBasecamp={contextBasecamp}
            personalBasecamp={personalBasecamp ? toBasecampLocation(personalBasecamp) : null}
            layers={layers}
            className="w-full h-full"
          />

          {/* Map Overlay Chips - floating on map */}
          <MapOverlayChips
            activeContext={searchContext}
            onContextChange={setSearchContext}
            layers={layers}
            onLayerToggle={handleLayerToggle}
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
      <div className="mb-6">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-1 inline-flex gap-1">
          {(['overview', 'basecamps', 'places', 'pins'] as TabView[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-white/10 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'places' ? 'Places & Activities' : tab}
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
                <h4 className="text-gray-400 text-sm mb-1">Saved Pins</h4>
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
            onContextChange={setSearchContext}
          />
        )}

        {activeTab === 'places' && (
          <PlacesPanel
            places={places}
            basecamp={contextBasecamp}
            onPlaceSelect={handlePlaceSelect}
            onCenterMap={handleCenterMap}
          />
        )}

        {activeTab === 'pins' && (
          <PinsPanel
            places={places}
            basecamp={contextBasecamp}
            onPlaceAdded={handlePlaceAdded}
            onPlaceRemoved={handlePlaceRemoved}
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
