// Utility to detect trip tier for conditional features
export type TripTier = 'consumer' | 'pro' | 'event';

export const detectTripTier = (tripId: string): TripTier => {
  // Consumer trips are IDs 1-12 from tripsData.ts
  const consumerTripIds = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  if (consumerTripIds.includes(tripId)) {
    return 'consumer';
  }

  // Pro trips come from proTripMockData
  // Event trips come from eventsMockData
  // For now, assume anything else is pro (can be refined later)
  return 'pro';
};

export const isConsumerTrip = (tripId: string): boolean => {
  return detectTripTier(tripId) === 'consumer';
};

export const isProTrip = (tripId: string): boolean => {
  return detectTripTier(tripId) === 'pro';
};

export const isEventTrip = (tripId: string): boolean => {
  return detectTripTier(tripId) === 'event';
};
