/**
 * Type definitions for Google Places API (New) 2024
 *
 * These types supplement the official @types/google.maps package
 * for the new Places API that was released in 2024.
 */

/**
 * Place data structure from the new Places API
 * Replaces the legacy PlaceResult interface
 */
export interface PlaceData {
  id: string; // Place ID
  displayName?: string;
  formattedAddress?: string;
  location?: google.maps.LatLng;
  viewport?: google.maps.LatLngBounds;
  rating?: number;
  websiteURI?: string;
  googleMapsURI?: string;
  types?: string[];
  businessStatus?: string;
  userRatingCount?: number;
  priceLevel?: string;
  addressComponents?: google.maps.GeocoderAddressComponent[];
  photos?: string[]; // Array of photo URIs
}

/**
 * Converted place format for backward compatibility
 * Matches the legacy PlaceResult structure used throughout the app
 */
export interface ConvertedPlace {
  place_id: string;
  name: string;
  formatted_address?: string;
  geometry?: {
    location: google.maps.LatLng;
    viewport?: google.maps.LatLngBounds;
  };
  rating?: number;
  website?: string;
  url?: string;
  types?: string[];
  photos?: string[]; // Array of photo URIs
}

/**
 * Autocomplete suggestion from the new API
 */
export interface AutocompleteSuggestionData {
  placePrediction?: {
    placeId: string;
    text: {
      text: string;
    };
    structuredFormat?: {
      mainText: {
        text: string;
      };
      secondaryText?: {
        text: string;
      };
    };
  };
}

/**
 * Converted autocomplete prediction for backward compatibility
 */
export interface ConvertedPrediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text?: string;
  };
  photoUri?: string; // First photo preview for autocomplete
}

/**
 * Field masks for the new Places API
 * Replaces the old 'fields' array approach
 */
export const PLACE_FIELDS = {
  BASIC: ['id', 'displayName', 'formattedAddress', 'location', 'types'],
  CONTACT: ['websiteURI', 'googleMapsURI'],
  ATMOSPHERE: ['rating', 'userRatingCount', 'priceLevel'],
  GEOMETRY: ['location', 'viewport'],
  PHOTOS: ['photos'], // Photo field for image previews
  ALL: [
    'id',
    'displayName',
    'formattedAddress',
    'location',
    'viewport',
    'rating',
    'websiteURI',
    'googleMapsURI',
    'types',
    'businessStatus',
    'userRatingCount',
    'priceLevel',
    'photos',
  ],
} as const;

/**
 * Search request options for the new API
 */
export interface SearchByTextRequest {
  textQuery: string;
  fields?: string[];
  locationBias?: {
    circle?: {
      center: { latitude: number; longitude: number };
      radius: number;
    };
  };
  maxResultCount?: number;
  languageCode?: string;
}

/**
 * Autocomplete request options for the new API
 */
export interface AutocompleteRequest {
  input: string;
  sessionToken?: string;
  locationBias?: {
    circle?: {
      center: { latitude: number; longitude: number };
      radius: number;
    };
  };
  origin?: { latitude: number; longitude: number };
  languageCode?: string;
}
