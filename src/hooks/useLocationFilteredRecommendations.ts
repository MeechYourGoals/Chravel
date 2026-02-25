import { useMemo } from 'react';
import { getRecommendationsByType, Recommendation } from '../data/recommendations';

export const useLocationFilteredRecommendations = (
  activeFilter: string = 'all',
  manualLocation?: string,
) => {
  const recommendations = useMemo(() => {
    return getRecommendationsByType(activeFilter);
  }, [activeFilter]);

  const filteredRecommendations = useMemo(() => {
    // Return all sponsored items by default
    let filtered = recommendations.filter(rec => rec.isSponsored);

    // Only apply location filtering when manualLocation is explicitly provided
    if (manualLocation && manualLocation.trim()) {
      filtered = filtered.filter(
        rec =>
          rec.city.toLowerCase().includes(manualLocation.toLowerCase()) ||
          rec.location.toLowerCase().includes(manualLocation.toLowerCase()) ||
          // For transportation, also show global/multi-city services
          (rec.type === 'transportation' &&
            (rec.location.includes('Multiple Cities') ||
              rec.location.includes('All Major Airports') ||
              rec.location.includes('Business Travel Worldwide') ||
              rec.location.includes('Multi-City Business Travel') ||
              rec.distance === 'Available citywide' ||
              rec.distance === 'Worldwide availability' ||
              rec.distance === 'All locations' ||
              rec.distance === 'Global coverage' ||
              rec.distance === 'Available for teams')),
      );
    }

    return filtered;
  }, [recommendations, manualLocation]);

  const activeLocation = manualLocation || '';
  const isBasecampLocation = false;

  return {
    recommendations: filteredRecommendations,
    hasRecommendations: filteredRecommendations.length > 0,
    activeLocation,
    isBasecampLocation,
  };
};
