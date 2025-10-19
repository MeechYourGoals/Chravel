
import React, { useState, useEffect } from 'react';
import { AddPlaceModal } from './AddPlaceModal';
import { WorkingGoogleMaps } from './WorkingGoogleMaps';
import { SetBasecampSquare } from './SetBasecampSquare';
import { TripPinsCard } from './TripPinsCard';
import { AccommodationSelector } from './AccommodationSelector';
import { BasecampLocation, PlaceWithDistance, DistanceCalculationSettings } from '../types/basecamp';
import { DistanceCalculator } from '../utils/distanceCalculator';
import { useTripVariant } from '../contexts/TripVariantContext';
import { AddToCalendarData } from '../types/calendar';
import { useFeatureToggle, DEFAULT_FEATURES } from '../hooks/useFeatureToggle';
import { usePlacesLinkSync } from '../hooks/usePlacesLinkSync';
import { Home, MapPin, Bed } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

import { useBasecamp } from '@/contexts/BasecampContext';


interface PlacesSectionProps {
  tripId?: string;
  tripName?: string;
}

export const PlacesSection = ({ tripId = '1', tripName = 'Your Trip' }: PlacesSectionProps) => {
  const { variant } = useTripVariant();
  const { user } = useAuth();
  const { isFeatureEnabled } = useFeatureToggle({ 
    trip_type: variant === 'consumer' ? 'consumer' : 'pro',
    enabled_features: [...DEFAULT_FEATURES] 
  });
  const { basecamp: contextBasecamp, setBasecamp: setContextBasecamp, isBasecampSet } = useBasecamp();
  const [isAddPlaceModalOpen, setIsAddPlaceModalOpen] = useState(false);
  const [places, setPlaces] = useState<PlaceWithDistance[]>([]);
  const [distanceSettings] = useState<DistanceCalculationSettings>({
    preferredMode: 'driving',
    unit: 'miles',
    showDistances: true
  });

  const { createLinkFromPlace, removeLinkByPlaceId, updateLinkByPlaceId } = usePlacesLinkSync();

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

  return (
    <div className="mb-12">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">Places</h2>
      </div>

      {/* Hero Map Section - Full Width */}
      <div className="mb-4 hero-map-section">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/50 h-96">
          <WorkingGoogleMaps className="w-full h-full" />
        </div>
      </div>
      
      {/* Base Camp Context Indicator */}
      {isBasecampSet && contextBasecamp && (
        <div className="mb-8 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <Home size={16} className="text-green-400 flex-shrink-0" />
            <span className="text-sm text-green-300">
              All searches use <strong>{contextBasecamp.name || contextBasecamp.address}</strong> as your starting point
            </span>
          </div>
        </div>
      )}

      {/* Accommodation and Places Tabs */}
      <Tabs defaultValue="accommodations" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="accommodations" className="flex items-center gap-2">
            <Bed size={16} />
            Accommodations
          </TabsTrigger>
          <TabsTrigger value="places" className="flex items-center gap-2">
            <MapPin size={16} />
            Places & Activities
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="accommodations" className="space-y-6">
          <AccommodationSelector 
            tripId={tripId}
            onLocationSet={(location, mode) => {
              if (mode === 'trip') {
                handleBasecampSet(location);
              }
              // Personal accommodation is handled internally by AccommodationSelector
            }}
          />
        </TabsContent>
        
        <TabsContent value="places" className="space-y-6">
          {/* Basecamp and Trip Pins Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Set Basecamp Square */}
            <SetBasecampSquare 
              basecamp={contextBasecamp} 
              onBasecampSet={handleBasecampSet} 
            />

            {/* Trip Pins Card */}
            <TripPinsCard
              places={places}
              basecamp={contextBasecamp}
              onPlaceAdded={handlePlaceAdded}
              onPlaceRemoved={handlePlaceRemoved}
              onEventAdded={handleEventAdded}
              distanceUnit={distanceSettings.unit}
              preferredMode={distanceSettings.preferredMode}
            />
          </div>
        </TabsContent>
      </Tabs>


      {/* Modals */}
      <AddPlaceModal 
        isOpen={isAddPlaceModalOpen}
        onClose={() => setIsAddPlaceModalOpen(false)}
        onPlaceAdded={handlePlaceAdded}
        basecamp={contextBasecamp}
      />
    </div>
  );
};
