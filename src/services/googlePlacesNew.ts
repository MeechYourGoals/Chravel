/// <reference types="@types/google.maps" />

/**
 * Google Places API (New) 2024 Service
 * 
 * Migrated from legacy Places API to the new Place class-based API.
 * Key improvements:
 * - Better performance with field masks
 * - Improved billing control
 * - Modern async/await patterns
 * - Enhanced type safety
 * 
 * Documentation: https://developers.google.com/maps/documentation/javascript/place-class
 */

import { Loader } from '@googlemaps/js-api-loader';
import { getGoogleMapsApiKey } from '@/config/maps';
import type {
  PlaceData,
  ConvertedPlace,
  ConvertedPrediction,
  SearchByTextRequest,
  AutocompleteRequest,
  PLACE_FIELDS
} from '@/types/places';

let mapsApi: typeof google.maps | null = null;
let loaderPromise: Promise<typeof google.maps> | null = null;

export type SearchOrigin = { lat: number; lng: number } | null;

/**
 * Timeout wrapper for API calls to prevent indefinite hangs
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  errorMsg: string = 'API request timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), timeoutMs)
    ),
  ]);
}

/**
 * Load Google Maps JavaScript API with new Places library
 * Note: Uses 'places' library (not 'places' which is legacy)
 */
export async function loadMaps(): Promise<typeof google.maps> {
  if (mapsApi) return mapsApi;
  
  if (!loaderPromise) {
    const apiKey = getGoogleMapsApiKey();
    
    console.log('[GooglePlacesNew] Loading Google Maps API (New Places)...', { 
      keyPresent: !!apiKey,
      keyPrefix: apiKey?.substring(0, 10) + '...'
    });

    if (!apiKey || apiKey === 'placeholder') {
      throw new Error('Google Maps API key is not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.');
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geocoding', 'marker'], // New Places API
    });

    loaderPromise = loader.load()
      .then((google) => {
        mapsApi = google.maps;
        console.log('[GooglePlacesNew] ✅ Google Maps API (New) loaded successfully');
        return mapsApi;
      })
      .catch((error) => {
        console.error('[GooglePlacesNew] ❌ Failed to load Google Maps API:', error);
        loaderPromise = null;
        throw new Error(`Google Maps API failed to load: ${error.message}`);
      });
  }

  return loaderPromise;
}

/**
 * Convert new Place object to legacy PlaceResult format
 * Maintains backward compatibility with existing components
 */
export function convertPlaceToLegacy(place: PlaceData): ConvertedPlace {
  return {
    place_id: place.id,
    name: place.displayName || 'Unknown Place',
    formatted_address: place.formattedAddress,
    geometry: place.location ? {
      location: place.location,
      viewport: place.viewport,
    } : undefined,
    rating: place.rating,
    website: place.websiteURI,
    url: place.googleMapsURI,
    types: place.types,
  };
}

/**
 * Normalize query text for better matching
 */
function preprocessQuery(query: string): string {
  const normalizations: Record<string, string> = {
    'centre': 'center',
    'theatre': 'theater',
    'shoppe': 'shop',
  };
  
  let processed = query.toLowerCase();
  for (const [variant, standard] of Object.entries(normalizations)) {
    processed = processed.replace(new RegExp(variant, 'g'), standard);
  }
  
  return processed;
}

/**
 * Enhanced place type detection for semantic search
 * Expanded coverage for sports venues, landmarks, and business types
 */
function detectPlaceType(query: string): string | undefined {
  const q = preprocessQuery(query);

  // Food & Dining
  if (q.includes('restaurant') || q.includes('food') || q.includes('dining') ||
      q.includes('cafe') || q.includes('coffee')) return 'restaurant';

  // Accommodation
  if (q.includes('hotel') || q.includes('lodging') || q.includes('motel') ||
      q.includes('inn')) return 'lodging';

  // Entertainment & Sports - ENHANCED
  if (q.includes('stadium') || q.includes('arena') || q.includes('center') || 
      q.includes('coliseum') || q.includes('amphitheater')) return 'stadium';
  if (q.includes('theater') || q.includes('cinema') || q.includes('movie')) return 'movie_theater';
  if (q.includes('museum')) return 'museum';
  if (q.includes('park')) return 'park';

  // Points of Interest
  if (q.includes('landmark') || q.includes('monument')) return 'point_of_interest';
  if (q.includes('attraction')) return 'tourist_attraction';

  // Transportation
  if (q.includes('airport')) return 'airport';
  if (q.includes('train') || q.includes('station')) return 'transit_station';

  // Shopping
  if (q.includes('shop') || q.includes('store') || q.includes('mall')) return 'shopping_mall';

  // Nightlife
  if (q.includes('bar') || q.includes('pub') || q.includes('nightclub')) return 'bar';

  // Services
  if (q.includes('gym') || q.includes('fitness')) return 'gym';
  if (q.includes('spa')) return 'spa';
  if (q.includes('bank')) return 'bank';
  if (q.includes('hospital') || q.includes('clinic')) return 'hospital';

  // Business
  if (q.includes('office') || q.includes('building')) return 'premise';

  // Generic establishment fallback for named venues without street numbers
  if (!q.match(/\d{3,}/)) return 'establishment';

  return undefined;
}

/**
 * Search for places using Text Search (New API)
 * Replaces legacy textSearch method
 * 
 * @param query - Search query text
 * @param origin - Optional origin for location bias
 * @param maxResults - Maximum number of results (default 5)
 */
export async function searchByText(
  query: string,
  origin: SearchOrigin = null,
  maxResults: number = 5
): Promise<ConvertedPlace[]> {
  await loadMaps();
  
  const { Place } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
  
  const request: SearchByTextRequest = {
    textQuery: query,
    fields: [
      'id',
      'displayName',
      'formattedAddress',
      'location',
      'viewport',
      'rating',
      'websiteURI',
      'googleMapsURI',
      'types'
    ],
    maxResultCount: maxResults,
    languageCode: 'en',
  };

  // Add location bias if origin is provided
  if (origin) {
    request.locationBias = {
      circle: {
        center: { latitude: origin.lat, longitude: origin.lng },
        radius: 50000, // 50km radius
      },
    };
  }

  try {
    // @ts-ignore - New API method not in @types yet
    const { places } = await Place.searchByText(request);
    
    if (!places || places.length === 0) {
      console.log('[GooglePlacesNew] No results from searchByText');
      return [];
    }

    console.log(`[GooglePlacesNew] ✅ searchByText found ${places.length} results`);
    
    // Convert to legacy format
    return places.map((place: any) => convertPlaceToLegacy({
      id: place.id,
      displayName: place.displayName?.text,
      formattedAddress: place.formattedAddress,
      location: place.location,
      viewport: place.viewport,
      rating: place.rating,
      websiteURI: place.websiteURI,
      googleMapsURI: place.googleMapsURI,
      types: place.types,
    }));
  } catch (error) {
    console.error('[GooglePlacesNew] searchByText error:', error);
    return [];
  }
}

/**
 * Get autocomplete suggestions using new AutocompleteSuggestion API
 * Replaces legacy AutocompleteService
 */
export async function autocomplete(
  input: string,
  sessionToken: string,
  origin: SearchOrigin
): Promise<ConvertedPrediction[]> {
  await loadMaps();
  
  const { AutocompleteSuggestion } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
  
  const request: AutocompleteRequest = {
    input,
    sessionToken,
    languageCode: 'en',
  };

  // Add location bias if origin provided
  if (origin) {
    request.locationBias = {
      circle: {
        center: { latitude: origin.lat, longitude: origin.lng },
        radius: 50000,
      },
    };
    request.origin = { latitude: origin.lat, longitude: origin.lng };
  }

  try {
    // @ts-ignore - New API method
    const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
    
    if (!suggestions || suggestions.length === 0) {
      return [];
    }

    console.log(`[GooglePlacesNew] ✅ Autocomplete found ${suggestions.length} suggestions`);
    
    // Convert to legacy prediction format
    return suggestions
      .filter((s: any) => s.placePrediction) // Only place predictions
      .map((s: any) => ({
        place_id: s.placePrediction.placeId,
        description: s.placePrediction.text.text,
        structured_formatting: s.placePrediction.structuredFormat ? {
          main_text: s.placePrediction.structuredFormat.mainText.text,
          secondary_text: s.placePrediction.structuredFormat.secondaryText?.text,
        } : undefined,
      }));
  } catch (error) {
    console.error('[GooglePlacesNew] Autocomplete error:', error);
    return [];
  }
}

/**
 * Fetch place details by Place ID using new Place class
 * Replaces legacy PlacesService.getDetails
 */
export async function fetchPlaceDetails(
  placeId: string,
  sessionToken?: string
): Promise<ConvertedPlace | null> {
  await loadMaps();
  
  const { Place } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
  
  try {
    // @ts-ignore - New API
    const place = new Place({
      id: placeId,
      requestedLanguage: 'en',
    });

    await place.fetchFields({
      fields: [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'viewport',
        'rating',
        'websiteURI',
        'googleMapsURI',
        'types',
        'userRatingCount',
        'priceLevel'
      ],
    });

    console.log('[GooglePlacesNew] ✅ Place details fetched');
    
    return convertPlaceToLegacy({
      id: place.id,
      displayName: (place as any).displayName?.text || 'Unknown',
      formattedAddress: (place as any).formattedAddress,
      location: (place as any).location,
      viewport: (place as any).viewport,
      rating: (place as any).rating,
      websiteURI: (place as any).websiteURI,
      googleMapsURI: (place as any).googleMapsURI,
      types: (place as any).types,
    });
  } catch (error) {
    console.error('[GooglePlacesNew] fetchPlaceDetails error:', error);
    return null;
  }
}

/**
 * Resolve query using 3-tier cascade with NEW API:
 * 1. searchByText (replaces findPlaceFromQuery + textSearch)
 * 2. geocode (fallback for addresses)
 * 
 * @param query - Search query
 * @param origin - Optional origin for location bias
 * @param sessionToken - Session token for billing
 */
export async function resolveQuery(
  query: string,
  origin: SearchOrigin,
  sessionToken: string
): Promise<ConvertedPlace | null> {
  await loadMaps();
  
  console.log('[GooglePlacesNew] Resolving query:', query);

  // 1) Try searchByText with type detection
  const detectedType = detectPlaceType(query);
  console.log(`[GooglePlacesNew] Detected type: ${detectedType || 'none'}`);
  
  const places = await searchByText(query, origin, 1);
  
  if (places.length > 0) {
    // Enrich with full details
    const enriched = await fetchPlaceDetails(places[0].place_id, sessionToken);
    return enriched || places[0];
  }

  // 2) Fallback to geocode for addresses
  console.log('[GooglePlacesNew] Trying geocode fallback...');
  const geocoder = new google.maps.Geocoder();
  
  try {
    const result = await geocoder.geocode({
      address: query,
      ...(origin && {
        bounds: new google.maps.LatLngBounds(
          new google.maps.LatLng(origin.lat - 0.4, origin.lng - 0.4),
          new google.maps.LatLng(origin.lat + 0.4, origin.lng + 0.4)
        ),
      }),
    });

    const geo = result.results?.[0];
    if (geo) {
      console.log('[GooglePlacesNew] ✅ Geocode found result');
      return {
        place_id: geo.place_id!,
        name: geo.formatted_address || 'Unknown',
        formatted_address: geo.formatted_address,
        geometry: {
          location: geo.geometry.location,
          viewport: geo.geometry.viewport,
        },
      };
    }
  } catch (error) {
    console.error('[GooglePlacesNew] Geocode error:', error);
  }

  console.log('[GooglePlacesNew] ❌ No results found');
  return null;
}

/**
 * Center map on a place result
 */
export function centerMapOnPlace(map: google.maps.Map, place: ConvertedPlace) {
  const geometry = place.geometry;
  if (!geometry) return;
  
  if (geometry.viewport) {
    map.fitBounds(geometry.viewport);
  } else if (geometry.location) {
    map.setCenter(geometry.location);
    map.setZoom(15);
  }
}

/**
 * Generate a unique session token for autocomplete billing
 */
export function generateSessionToken(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
