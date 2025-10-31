
export interface BasecampLocation {
  address: string;
  coordinates?: { lat: number; lng: number };
  name?: string;
  type: 'hotel' | 'short-term' | 'other';
}

export interface PlaceWithDistance {
  id: string;
  name: string;
  url: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  distanceFromBasecamp?: {
    driving?: number;
    walking?: number;
    straightLine?: number;
    unit: 'miles' | 'km';
  };
  distanceFromPersonalBasecamp?: {
    driving?: number;
    walking?: number;
    straightLine?: number;
    unit: 'miles' | 'km';
  };
  calculatedAt?: string;
  category?: PlaceCategory;
  website?: string;
  placeId?: string;
  rating?: number;
}

export type PlaceCategory = 'Food & Drink' | 'Attraction' | 'Activity' | 'Accommodation' | 'Other';

export const PlaceCategoryEnum: PlaceCategory[] = [
  'Food & Drink',
  'Attraction',
  'Activity',
  'Accommodation',
  'Other',
];

export interface DistanceCalculationSettings {
  preferredMode: 'driving' | 'walking' | 'straightLine';
  unit: 'miles' | 'km';
  showDistances: boolean;
}

export interface TripWithBasecamp {
  id: string;
  title: string;
  location: string;
  dateRange: string;
  basecamp?: BasecampLocation;
  places: PlaceWithDistance[];
  distanceSettings: DistanceCalculationSettings;
}
