import { Recommendation } from './types';
import { hotelRecommendations } from './hotels';
import { restaurantRecommendations } from './restaurants';
import { activityRecommendations } from './activities';
import { tourRecommendations } from './tours';
import { experienceRecommendations } from './experiences';
import { transportationRecommendations } from './transportation';

export * from './types';

export const recommendationsData: Recommendation[] = [
  ...hotelRecommendations,
  ...restaurantRecommendations,
  ...activityRecommendations,
  ...tourRecommendations,
  ...experienceRecommendations,
  ...transportationRecommendations,
];

export const getRecommendationsByType = (type?: string): Recommendation[] => {
  if (!type || type === 'all') return recommendationsData;
  return recommendationsData.filter(rec => rec.type === type);
};

export const getSponsoredRecommendations = (): Recommendation[] => {
  return recommendationsData.filter(rec => rec.isSponsored);
};

export const getRecommendationById = (id: number): Recommendation | null => {
  return recommendationsData.find(rec => rec.id === id) || null;
};
