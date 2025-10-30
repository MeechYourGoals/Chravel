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

  const categorizePlaceType = (placeTypes: string[]): PlaceCategory => {
    // Mapping from new categories to Google Place types
    const categoryMap: { [key in PlaceCategory]?: string[] } = {
      'Accommodations': ['lodging', 'hotel', 'motel', 'resort', 'hostel', 'rv_park'],
      'Food & Drink': ['restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway', 'meal_delivery'],
      'Experience': ['tourist_attraction', 'museum', 'amusement_park', 'zoo', 'aquarium', 'art_gallery', 'park', 'church', 'mosque', 'synagogue', 'hindu_temple', 'stadium', 'movie_theater', 'casino', 'night_club', 'spa'],
      'Attraction': ['landmark', 'point_of_interest'], // Keep this for more specific landmarks if needed, but 'Experience' is broader
    };

    for (const [category, types] of Object.entries(categoryMap)) {
      if (types.some(type => placeTypes.includes(type))) {
        return category as PlaceCategory;
      }
    }

    // Default to 'Other'
    return 'Other';
  };

  return {
    resolvePlaceName,
    categorizePlaceType,
    isLoading,
    error
  };
};