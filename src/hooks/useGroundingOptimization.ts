import { useMemo } from 'react';

/**
 * Smart grounding optimization hook
 * Detects location-related queries to minimize API costs
 */
export const useGroundingOptimization = () => {
  const detectLocationQuery = (message: string): boolean => {
    const locationKeywords = [
      // Direct location queries
      'where',
      'location',
      'place',
      'address',
      'coordinates',

      // Venue types
      'restaurant',
      'hotel',
      'cafe',
      'bar',
      'attraction',
      'museum',
      'park',
      'club',
      'nightlife',
      'shopping',
      'store',
      'market',
      'gallery',
      'theater',
      'cinema',
      'stadium',
      'arena',
      'convention',
      'center',

      // Activities
      'eat',
      'drink',
      'food',
      'dining',
      'lunch',
      'dinner',
      'breakfast',
      'stay',
      'sleep',
      'accommodation',
      'hotel',
      'hostel',
      'airbnb',
      'visit',
      'see',
      'tour',
      'explore',
      'sightseeing',
      'attractions',
      'activity',
      'activities',
      'things to do',
      'entertainment',

      // Spatial relationships
      'near',
      'around',
      'close',
      'nearby',
      'within',
      'distance',
      'walking',
      'driving',
      'transit',
      'public transport',

      // Recommendations
      'best',
      'top',
      'popular',
      'recommended',
      'suggest',
      'recommend',
      'find',
      'search',
      'look for',
      'discover',

      // Specific categories
      'sushi',
      'pizza',
      'italian',
      'chinese',
      'mexican',
      'indian',
      'beach',
      'mountain',
      'hiking',
      'outdoor',
      'nature',
      'coffee',
      'tea',
      'wine',
      'cocktail',
      'beer',
      'brewery',
      'spa',
      'wellness',
      'gym',
      'fitness',
      'yoga',

      // Travel context
      'trip',
      'travel',
      'vacation',
      'holiday',
      'destination',
      'itinerary',
      'schedule',
      'plan',
      'booking',
      'reservation',
    ];

    const lowercaseMessage = message.toLowerCase();
    return locationKeywords.some(keyword => lowercaseMessage.includes(keyword));
  };

  const shouldEnableGrounding = (message: string, hasLocationContext: boolean): boolean => {
    // Only enable grounding if:
    // 1. Query mentions location-related terms
    // 2. We have basecamp coordinates for accurate grounding
    return detectLocationQuery(message) && hasLocationContext;
  };

  const getGroundingConfidence = (message: string): 'high' | 'medium' | 'low' => {
    const lowercaseMessage = message.toLowerCase();

    // High confidence: explicit location queries
    const highConfidenceKeywords = [
      'restaurant',
      'hotel',
      'cafe',
      'bar',
      'museum',
      'park',
      'attraction',
      'where is',
      'where are',
      'find me',
      'near me',
      'around me',
      'best restaurant',
      'top hotel',
      'popular cafe',
    ];

    if (highConfidenceKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      return 'high';
    }

    // Medium confidence: general location terms
    const mediumConfidenceKeywords = [
      'eat',
      'drink',
      'visit',
      'see',
      'go',
      'stay',
      'food',
      'place',
    ];

    if (mediumConfidenceKeywords.some(keyword => lowercaseMessage.includes(keyword))) {
      return 'medium';
    }

    return 'low';
  };

  const estimateGroundingCost = (message: string): number => {
    // Rough cost estimation based on message complexity
    const wordCount = message.split(' ').length;
    const hasLocationTerms = detectLocationQuery(message);

    if (!hasLocationTerms) return 0;

    // Base cost for grounding + complexity factor
    const baseCost = 0.032; // $32 per 1000 requests
    const complexityFactor = Math.min(wordCount / 10, 2); // Cap at 2x

    return baseCost * complexityFactor;
  };

  return {
    detectLocationQuery,
    shouldEnableGrounding,
    getGroundingConfidence,
    estimateGroundingCost,
  };
};
