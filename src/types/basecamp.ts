
export interface BasecampLocation {
  address: string;
  coordinates?: { lat: number; lng: number };
  name?: string;
  type: 'hotel' | 'airbnb' | 'other';
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
  calculatedAt?: string;
  category?: 'restaurant' | 'attraction' | 'hotel' | 'activity' | 'fitness' | 'nightlife' | 'transportation';
}

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
