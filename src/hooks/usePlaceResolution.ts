import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LinkOption {
  type: string;
  label: string;
  url: string;
  description: string;
  isPrimary?: boolean;
}

interface ResolvedPlace {
  name: string;
  formatted_address: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  rating?: number;
  price_level?: number;
  photos?: any[];
  types: string[];
  place_id: string;
  website?: string;
}

interface PlaceResolutionResult {
  success: boolean;
  place?: ResolvedPlace;
  linkOptions?: LinkOption[];
  error?: string;
}

export const usePlaceResolution = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvePlaceName = async (placeName: string): Promise<PlaceResolutionResult> => {
    if (!placeName.trim()) {
      return { success: false, error: 'Place name is required' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('venue-enricher', {
        body: {
          action: 'resolve_place_links',
          query: placeName
        }
      });

      if (functionError) {
        throw functionError;
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Failed to resolve place' };
      }

      return {
        success: true,
        place: data.place,
        linkOptions: data.linkOptions
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const categorizePlaceType = (placeTypes: string[]): string => {
    if (placeTypes.includes('lodging') || placeTypes.includes('hotel')) return 'housing';
    if (placeTypes.includes('restaurant') || placeTypes.includes('food') || placeTypes.includes('meal_takeaway')) return 'eats';
    if (placeTypes.includes('tourist_attraction') || placeTypes.includes('museum') || placeTypes.includes('amusement_park')) return 'day-activities';
    if (placeTypes.includes('night_club') || placeTypes.includes('bar')) return 'nightlife';
    if (placeTypes.includes('gym') || placeTypes.includes('spa')) return 'fitness';
    if (placeTypes.includes('travel_agency') || placeTypes.includes('airport') || placeTypes.includes('bus_station')) return 'transportation';
    return 'other';
  };

  return {
    resolvePlaceName,
    categorizePlaceType,
    isLoading,
    error
  };
};