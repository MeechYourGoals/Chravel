import { useMemo } from 'react';
import { getRecommendationsByType } from '../data/recommendations';

export const useRecommendations = (activeFilter: string = 'all') => {
  const staticRecommendations = useMemo(() => {
    return getRecommendationsByType(activeFilter);
  }, [activeFilter]);

  return {
    recommendations: staticRecommendations,
    hasRecommendations: staticRecommendations.length > 0,
  };
};
