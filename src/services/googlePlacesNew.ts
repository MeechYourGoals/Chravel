/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary until cache type constraints resolved
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
  PLACE_FIELDS,
} from '@/types/places';
import {
  generateCacheKey,
  getCachedPlace,
  setCachedPlace,
  recordApiUsage,
} from './googlePlacesCache';
import {
  searchPlacesOSM,
  geocodeAddressOSM,
  convertOSMToGoogleFormat,
  shouldUseOSMFallback,
} from './openStreetMapFallback';
import { toast } from 'sonner';

let mapsApi: typeof google.maps | null = null;
let loaderPromise: Promise<typeof google.maps> | null = null;

export type SearchOrigin = { lat: number; lng: number } | null;

/**
 * API Quota Monitor
 * Tracks API usage and provides fallback mechanisms
 */
class ApiQuotaMonitor {
  private dailyRequests: Map<string, number> = new Map();
  private hourlyRequests: Map<string, number> = new Map();
  private cachedResults: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour cache
  private readonly DAILY_LIMIT = 10000; // Conservative daily limit
  private readonly HOURLY_LIMIT = 1000; // Conservative hourly limit

  /**
   * Check if we're approaching quota limits
   */
  checkQuota(): { canProceed: boolean; reason?: string } {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH

    const dailyCount = this.dailyRequests.get(today) || 0;
    const hourlyCount = this.hourlyRequests.get(hour) || 0;

    if (dailyCount >= this.DAILY_LIMIT) {
      return { canProceed: false, reason: 'Daily quota exceeded' };
    }

    if (hourlyCount >= this.HOURLY_LIMIT) {
      return { canProceed: false, reason: 'Hourly quota exceeded' };
    }

    return { canProceed: true };
  }

  /**
   * Record an API request
   */
  recordRequest(): void {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().toISOString().slice(0, 13);

    this.dailyRequests.set(today, (this.dailyRequests.get(today) || 0) + 1);
    this.hourlyRequests.set(hour, (this.hourlyRequests.get(hour) || 0) + 1);

    // Clean up old entries (keep last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    for (const [date] of this.dailyRequests) {
      if (date < sevenDaysAgo.toISOString().split('T')[0]) {
        this.dailyRequests.delete(date);
      }
    }
  }

  /**
   * Cache a result with TTL
   */
  cacheResult(key: string, data: any): void {
    this.cachedResults.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Clean up expired cache entries
    for (const [cacheKey, value] of this.cachedResults) {
      if (Date.now() - value.timestamp > this.CACHE_TTL) {
        this.cachedResults.delete(cacheKey);
      }
    }
  }

  /**
   * Get cached result if available and not expired
   */
  getCachedResult(key: string): any | null {
    const cached = this.cachedResults.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cachedResults.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Generate cache key from query and origin
   */
  generateCacheKey(query: string, origin: SearchOrigin | null): string {
    const originStr = origin ? `${origin.lat},${origin.lng}` : 'no-origin';
    return `query:${query.toLowerCase().trim()}:origin:${originStr}`;
  }

  /**
   * Get quota usage statistics
   */
  getQuotaStats(): { daily: number; hourly: number; dailyLimit: number; hourlyLimit: number } {
    const today = new Date().toISOString().split('T')[0];
    const hour = new Date().toISOString().slice(0, 13);

    return {
      daily: this.dailyRequests.get(today) || 0,
      hourly: this.hourlyRequests.get(hour) || 0,
      dailyLimit: this.DAILY_LIMIT,
      hourlyLimit: this.HOURLY_LIMIT,
    };
  }
}

export const apiQuotaMonitor = new ApiQuotaMonitor();

/**
 * Retry utility with exponential backoff
 * @param operation - The async operation to retry
 * @param maxRetries - Maximum number of retries (default: 2, reduced for faster feedback)
 * @param baseDelay - Base delay in milliseconds (default: 500, reduced for speed)
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  baseDelay: number = 500,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on quota exhaustion - use cache instead
      if (
        (error as any)?.message?.includes('quota') ||
        (error as any)?.message?.includes('OVER_QUERY_LIMIT')
      ) {
        throw error;
      }

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Timeout wrapper for API calls to prevent indefinite hangs
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000,
  errorMsg: string = 'API request timed out',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), timeoutMs)),
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

    if (!apiKey || apiKey === 'placeholder') {
      const errorMsg = 'Google Maps API key is not configured. Check environment settings.';
      console.error('[GooglePlacesNew] ❌ API key missing or placeholder', {
        hasKey: Boolean(apiKey),
        isPlaceholder: apiKey === 'placeholder',
        envCheck: import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'present' : 'missing',
      });
      toast.error('Maps API key not configured');
      throw new Error(errorMsg);
    }

    console.info('[GooglePlacesNew] ℹ️ Loading Google Maps API...', {
      apiKeyLength: apiKey.length,
      version: 'weekly',
      libraries: ['places', 'geocoding', 'marker'],
    });

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geocoding', 'marker'],
    });

    loaderPromise = loader
      .load()
      .then(google => {
        mapsApi = google.maps;
        console.info('[GooglePlacesNew] ✅ Google Maps API loaded successfully');
        return mapsApi;
      })
      .catch(error => {
        console.error('[GooglePlacesNew] ❌ Failed to load Google Maps API', {
          error: error.message,
          code: error.code,
          stack: import.meta.env.DEV ? error.stack : undefined,
        });

        // More specific error messages
        let userMessage = 'Failed to load Google Maps';
        if (error.message?.includes('ApiNotActivatedMapError')) {
          userMessage = 'Maps API not enabled - check Google Cloud Console';
        } else if (error.message?.includes('RefererNotAllowedMapError')) {
          userMessage = 'Domain not authorized for this API key';
        } else if (error.message?.includes('InvalidKeyMapError')) {
          userMessage = 'Invalid API key';
        }

        toast.error(userMessage);
        loaderPromise = null;
        throw new Error(`Google Maps API failed to load: ${error.message}`);
      });
  }

  return loaderPromise;
}

/**
 * Extract photo URIs from Place photos array
 * Returns up to maxPhotos URIs with specified size
 */
export function extractPhotoUris(
  photos: any[],
  maxPhotos: number = 3,
  maxWidthPx: number = 800,
): string[] {
  if (!photos || photos.length === 0) return [];

  return photos
    .slice(0, maxPhotos)
    .map((photo: any) => {
      // New API: photos have getURI() method
      if (typeof photo.getURI === 'function') {
        return photo.getURI({ maxWidth: maxWidthPx });
      }
      // Fallback: direct URI access
      return photo.uri || '';
    })
    .filter(Boolean);
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
    geometry: place.location
      ? {
          location: place.location,
          viewport: place.viewport,
        }
      : undefined,
    rating: place.rating,
    website: place.websiteURI,
    url: place.googleMapsURI,
    types: place.types,
    photos: place.photos,
  };
}

/**
 * Normalize query text for better matching
 */
function preprocessQuery(query: string): string {
  const normalizations: Record<string, string> = {
    centre: 'center',
    theatre: 'theater',
    shoppe: 'shop',
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
  if (
    q.includes('restaurant') ||
    q.includes('food') ||
    q.includes('dining') ||
    q.includes('cafe') ||
    q.includes('coffee')
  )
    return 'restaurant';

  // Accommodation
  if (q.includes('hotel') || q.includes('lodging') || q.includes('motel') || q.includes('inn'))
    return 'lodging';

  // Entertainment & Sports - ENHANCED
  if (
    q.includes('stadium') ||
    q.includes('arena') ||
    q.includes('center') ||
    q.includes('coliseum') ||
    q.includes('amphitheater')
  )
    return 'stadium';
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
 * Detect if query is a proximity-based "near me" type search
 */
function isProximityQuery(query: string): boolean {
  const q = query.toLowerCase();
  const proximityPatterns = ['near me', 'nearby', 'close to me', 'around me', 'closest', 'nearest'];
  return proximityPatterns.some(pattern => q.includes(pattern));
}

/**
 * Map common search terms to Google Place types
 * Used for nearby search filtering
 */
function mapQueryToPlaceTypes(query: string): string[] {
  const q = preprocessQuery(query);

  // Food & Dining
  if (q.includes('coffee') || q.includes('cafe')) return ['cafe', 'coffee_shop'];
  if (q.includes('restaurant') || q.includes('food') || q.includes('dining')) return ['restaurant'];
  if (q.includes('pizza')) return ['pizza_restaurant'];
  if (q.includes('bar') || q.includes('pub')) return ['bar', 'night_club'];
  if (q.includes('bakery')) return ['bakery'];

  // Accommodation
  if (q.includes('hotel') || q.includes('lodging')) return ['lodging', 'hotel'];

  // Entertainment & Activities
  if (q.includes('gym') || q.includes('fitness')) return ['gym'];
  if (q.includes('park')) return ['park'];
  if (q.includes('museum')) return ['museum'];
  if (q.includes('movie') || q.includes('cinema') || q.includes('theater'))
    return ['movie_theater'];
  if (q.includes('shopping') || q.includes('mall')) return ['shopping_mall'];

  // Services
  if (q.includes('gas') || q.includes('fuel')) return ['gas_station'];
  if (q.includes('pharmacy') || q.includes('drugstore')) return ['pharmacy'];
  if (q.includes('atm') || q.includes('bank')) return ['atm', 'bank'];
  if (q.includes('hospital') || q.includes('clinic')) return ['hospital'];

  // Transportation
  if (q.includes('parking')) return ['parking'];
  if (q.includes('airport')) return ['airport'];
  if (q.includes('station')) return ['transit_station'];

  // Generic categories for broad searches
  if (q.includes('attraction')) return ['tourist_attraction'];
  if (q.includes('store') || q.includes('shop')) return ['store'];

  // Default: return empty to search all types
  return [];
}

/**
 * Search for nearby places using Nearby Search (New API)
 * Ideal for proximity-based queries like "coffee near me"
 * Includes Supabase caching and OSM fallback
 *
 * @param location - Center point for search
 * @param radius - Search radius in meters (default 5000m = 5km)
 * @param placeTypes - Optional place types to filter (e.g., ['restaurant', 'cafe'])
 * @param maxResults - Maximum number of results (default 10)
 */
export async function searchNearby(
  location: { lat: number; lng: number },
  radius: number = 5000,
  placeTypes: string[] = [],
  maxResults: number = 10,
): Promise<ConvertedPlace[]> {
  await loadMaps();

  // Check Supabase cache first
  const cacheKey = generateCacheKey('nearby-search', `${location.lat},${location.lng}`, null, {
    radius,
    types: placeTypes.join(','),
    maxResults,
  });
  const cached = await getCachedPlace<ConvertedPlace[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const { Place } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;

  const request: any = {
    locationRestriction: {
      circle: {
        center: { latitude: location.lat, longitude: location.lng },
        radius: radius,
      },
    },
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
      'priceLevel',
      'photos',
    ],
    maxResultCount: Math.min(maxResults, 20), // API limit
    languageCode: 'en',
  };

  // Add place type filtering if specified
  if (placeTypes.length > 0) {
    request.includedTypes = placeTypes;
  }

  try {
    // Record API usage
    await recordApiUsage('nearby-search');

    // @ts-ignore - New API method
    const { places } = await Place.searchNearby(request);

    if (!places || places.length === 0) {
      return [];
    }

    // Convert and sort by rating (with photos)
    const converted = places.map((place: any) =>
      convertPlaceToLegacy({
        id: place.id,
        displayName: place.displayName?.text,
        formattedAddress: place.formattedAddress,
        location: place.location,
        viewport: place.viewport,
        rating: place.rating,
        websiteURI: place.websiteURI,
        googleMapsURI: place.googleMapsURI,
        types: place.types,
        photos: place.photos ? extractPhotoUris(place.photos, 3) : undefined,
      }),
    );

    // Sort by rating (best first)
    const results = converted.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // Cache in Supabase (30-day TTL)
    await setCachedPlace(
      cacheKey,
      'nearby-search',
      `${location.lat},${location.lng}`,
      results,
      undefined,
      { lat: location.lat, lng: location.lng },
    );

    return results;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[GooglePlacesNew] searchNearby error:', error);
    }

    // Try OSM fallback if Google Maps API fails
    if (shouldUseOSMFallback(error)) {
      // OSM doesn't support nearby search with radius, so we use text search with location hint
      const query = placeTypes.length > 0 ? placeTypes[0] : 'place';
      const osmPlaces = await searchPlacesOSM(query, maxResults);
      return osmPlaces.map(osmPlace => {
        const converted = convertOSMToGoogleFormat(osmPlace);
        return {
          place_id: converted.place_id,
          name: converted.name,
          formatted_address: converted.formatted_address,
          geometry: converted.geometry,
        };
      });
    }

    return [];
  }
}

/**
 * Search for places using Text Search (New API)
 * Replaces legacy textSearch method
 * Includes Supabase caching and OSM fallback
 *
 * @param query - Search query text
 * @param origin - Optional origin for location bias
 * @param maxResults - Maximum number of results (default 5)
 */
export async function searchByText(
  query: string,
  origin: SearchOrigin = null,
  maxResults: number = 5,
): Promise<ConvertedPlace[]> {
  await loadMaps();

  // Check Supabase cache first
  const cacheKey = generateCacheKey('text-search', query, origin, { maxResults });
  const cached = await getCachedPlace<ConvertedPlace[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const { Place } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;

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
      'types',
      'photos',
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
    // Record API usage
    await recordApiUsage('text-search');

    // @ts-ignore - New API method not in @types yet
    const { places } = await Place.searchByText(request);

    if (!places || places.length === 0) {
      return [];
    }

    // Convert to legacy format with photos
    const results = places.map((place: any) =>
      convertPlaceToLegacy({
        id: place.id,
        displayName: place.displayName?.text,
        formattedAddress: place.formattedAddress,
        location: place.location,
        viewport: place.viewport,
        rating: place.rating,
        websiteURI: place.websiteURI,
        googleMapsURI: place.googleMapsURI,
        types: place.types,
        photos: place.photos ? extractPhotoUris(place.photos, 3) : undefined,
      }),
    );

    // Cache in Supabase (30-day TTL)
    await setCachedPlace(cacheKey, 'text-search', query, results, undefined, origin);

    return results;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[GooglePlacesNew] searchByText error:', error);
    }

    // Try OSM fallback if Google Maps API fails
    if (shouldUseOSMFallback(error)) {
      const osmPlaces = await searchPlacesOSM(query, maxResults);
      return osmPlaces.map(osmPlace => {
        const converted = convertOSMToGoogleFormat(osmPlace);
        return {
          place_id: converted.place_id,
          name: converted.name,
          formatted_address: converted.formatted_address,
          geometry: converted.geometry,
        };
      });
    }

    return [];
  }
}

/**
 * Get autocomplete suggestions using new AutocompleteSuggestion API
 * Replaces legacy AutocompleteService
 * Includes Supabase caching, quota monitoring, and OSM fallback
 */
export async function autocomplete(
  input: string,
  sessionToken: string,
  origin: SearchOrigin,
): Promise<ConvertedPrediction[]> {
  await loadMaps();

  // Check Supabase cache first (30-day TTL)
  const cacheKey = generateCacheKey('autocomplete', input, origin);
  const cached = await getCachedPlace<ConvertedPrediction[]>(cacheKey);
  if (cached) {
    return cached;
  }

  // Check client-side cache (1-hour TTL)
  const clientCacheKey = apiQuotaMonitor.generateCacheKey(`autocomplete:${input}`, origin);
  const clientCached = apiQuotaMonitor.getCachedResult(clientCacheKey);
  if (clientCached) {
    return clientCached;
  }

  // Check quota before making request
  const quotaCheck = apiQuotaMonitor.checkQuota();
  if (!quotaCheck.canProceed) {
    // Return cached results if available (even if expired)
    const expiredCache = apiQuotaMonitor.getCachedResult(clientCacheKey);
    if (expiredCache) {
      return expiredCache;
    }
    // Note: OSM doesn't support autocomplete, so we return empty array
    return [];
  }

  const { AutocompleteSuggestion } = (await google.maps.importLibrary(
    'places',
  )) as google.maps.PlacesLibrary;

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
    // Record API request
    apiQuotaMonitor.recordRequest();
    await recordApiUsage('autocomplete');

    // Retry with exponential backoff
    const { suggestions } = await retryWithBackoff(async () => {
      // @ts-ignore - New API method
      return await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
    });

    if (!suggestions || suggestions.length === 0) {
      return [];
    }

    // Convert to legacy prediction format
    const results = suggestions
      .filter((s: any) => s.placePrediction) // Only place predictions
      .map((s: any) => ({
        place_id: s.placePrediction.placeId,
        description: s.placePrediction.text.text,
        structured_formatting: s.placePrediction.structuredFormat
          ? {
              main_text: s.placePrediction.structuredFormat.mainText.text,
              secondary_text: s.placePrediction.structuredFormat.secondaryText?.text,
            }
          : undefined,
      }));

    // Cache results (both client-side and Supabase)
    apiQuotaMonitor.cacheResult(clientCacheKey, results);
    await setCachedPlace(cacheKey, 'autocomplete', input, results, undefined, origin);

    return results;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[GooglePlacesNew] Autocomplete error:', error);
    }

    // If quota error, try to return cached results
    if (
      (error as any)?.message?.includes('quota') ||
      (error as any)?.message?.includes('OVER_QUERY_LIMIT')
    ) {
      const expiredCache = apiQuotaMonitor.getCachedResult(clientCacheKey);
      if (expiredCache) {
        return expiredCache;
      }
    }

    // Note: OSM doesn't support autocomplete, so we return empty array
    return [];
  }
}

/**
 * Fetch place details by Place ID using new Place class
 * Replaces legacy PlacesService.getDetails
 * Includes Supabase caching (30-day TTL) and OSM fallback
 */
export async function fetchPlaceDetails(
  placeId: string,
  sessionToken?: string,
): Promise<ConvertedPlace | null> {
  await loadMaps();

  // Check Supabase cache first (30-day TTL)
  const cacheKey = generateCacheKey('place-details', placeId, null);
  const cached = await getCachedPlace<ConvertedPlace>(cacheKey);
  if (cached) {
    return cached;
  }

  const { Place } = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;

  try {
    // Record API usage
    await recordApiUsage('place-details');

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
        'priceLevel',
      ],
    });

    const result = convertPlaceToLegacy({
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

    // Cache in Supabase (30-day TTL)
    await setCachedPlace(cacheKey, 'place-details', placeId, result, placeId);

    return result;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[GooglePlacesNew] fetchPlaceDetails error:', error);
    }

    // Try OSM fallback if Google Maps API fails
    if (shouldUseOSMFallback(error)) {
      // OSM doesn't have place IDs, so we can't fetch details
      // Return null - caller should handle gracefully
      return null;
    }

    return null;
  }
}

/**
 * Resolve query using 5-tier cascade with NEW API + OSM fallback:
 * 1. Check Supabase cache (30-day TTL)
 * 2. Check client-side cache (1-hour TTL)
 * 3. searchNearby for proximity queries (NEW - Phase D)
 * 4. searchByText (replaces findPlaceFromQuery + textSearch)
 * 5. geocode (fallback for addresses)
 * 6. OSM fallback (if Google Maps API fails)
 *
 * Includes Supabase caching, quota monitoring, and OSM fallback
 *
 * @param query - Search query
 * @param origin - Optional origin for location bias
 * @param sessionToken - Session token for billing
 */
export async function resolveQuery(
  query: string,
  origin: SearchOrigin,
  sessionToken: string,
): Promise<ConvertedPlace | null> {
  await loadMaps();

  // Check Supabase cache first (30-day TTL)
  const cacheKey = generateCacheKey('text-search', query, origin);
  const cached = await getCachedPlace<ConvertedPlace>(cacheKey);
  if (cached) {
    return cached;
  }

  // Check client-side cache (1-hour TTL)
  const clientCacheKey = apiQuotaMonitor.generateCacheKey(`resolve:${query}`, origin);
  const clientCached = apiQuotaMonitor.getCachedResult(clientCacheKey);
  if (clientCached) {
    return clientCached;
  }

  // Check quota before making requests
  const quotaCheck = apiQuotaMonitor.checkQuota();
  if (!quotaCheck.canProceed) {
    // Return cached results if available (even if expired)
    const expiredCache = apiQuotaMonitor.getCachedResult(clientCacheKey);
    if (expiredCache) {
      return expiredCache;
    }
    // Try OSM fallback
    return await resolveQueryOSM(query, origin);
  }

  try {
    // Record API request
    apiQuotaMonitor.recordRequest();
    await recordApiUsage('text-search');

    // PHASE D: 1) Try nearby search for proximity queries
    if (isProximityQuery(query) && origin) {
      const placeTypes = mapQueryToPlaceTypes(query);
      const nearbyPlaces = await retryWithBackoff(async () =>
        searchNearby(origin, 5000, placeTypes, 5),
      );

      if (nearbyPlaces.length > 0) {
        const result = nearbyPlaces[0];
        // Cache result (both client-side and Supabase)
        apiQuotaMonitor.cacheResult(clientCacheKey, result);
        await setCachedPlace(cacheKey, 'text-search', query, result, result.place_id, origin);
        return result;
      }
    }

    // 2) Try searchByText with type detection
    const detectedType = detectPlaceType(query);

    const places = await retryWithBackoff(async () => searchByText(query, origin, 1));

    if (places.length > 0) {
      // Enrich with full details
      const enriched = await retryWithBackoff(async () =>
        fetchPlaceDetails(places[0].place_id, sessionToken),
      );
      const result = enriched || places[0];
      // Cache result (both client-side and Supabase)
      apiQuotaMonitor.cacheResult(clientCacheKey, result);
      await setCachedPlace(cacheKey, 'text-search', query, result, result.place_id, origin);
      return result;
    }

    // 3) Fallback to geocode for addresses
    await recordApiUsage('geocode');
    const geocoder = new google.maps.Geocoder();

    const result = await retryWithBackoff(async () => {
      const geoResult = await geocoder.geocode({
        address: query,
        ...(origin && {
          bounds: new google.maps.LatLngBounds(
            new google.maps.LatLng(origin.lat - 0.4, origin.lng - 0.4),
            new google.maps.LatLng(origin.lat + 0.4, origin.lng + 0.4),
          ),
        }),
      });

      const geo = geoResult.results?.[0];
      if (geo) {
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
      return null;
    });

    if (result) {
      // Cache result (both client-side and Supabase)
      apiQuotaMonitor.cacheResult(clientCacheKey, result);
      await setCachedPlace(cacheKey, 'text-search', query, result, result.place_id, origin);
      return result;
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[GooglePlacesNew] Resolve query error:', error);
    }

    // If quota error, try to return cached results
    if (
      (error as any)?.message?.includes('quota') ||
      (error as any)?.message?.includes('OVER_QUERY_LIMIT')
    ) {
      const expiredCache = apiQuotaMonitor.getCachedResult(clientCacheKey);
      if (expiredCache) {
        return expiredCache;
      }
    }

    // Try OSM fallback if Google Maps API fails
    if (shouldUseOSMFallback(error)) {
      return await resolveQueryOSM(query, origin);
    }
  }

  // Final fallback: Try OSM
  return await resolveQueryOSM(query, origin);
}

/**
 * Resolve query using OpenStreetMap (fallback when Google Maps API fails)
 */
async function resolveQueryOSM(
  query: string,
  origin: SearchOrigin,
): Promise<ConvertedPlace | null> {
  try {
    // Try OSM search
    const osmPlaces = await searchPlacesOSM(query, 1);
    if (osmPlaces.length > 0) {
      const osmPlace = osmPlaces[0];
      const converted = convertOSMToGoogleFormat(osmPlace);
      return {
        place_id: converted.place_id,
        name: converted.name,
        formatted_address: converted.formatted_address,
        geometry: converted.geometry,
      };
    }

    // Try OSM geocoding for addresses
    const geocodeResult = await geocodeAddressOSM(query);
    if (geocodeResult) {
      return {
        place_id: `osm_${geocodeResult.place_id}`,
        name: geocodeResult.display_name,
        formatted_address: geocodeResult.display_name,
        geometry: {
          location: new google.maps.LatLng(
            parseFloat(geocodeResult.lat),
            parseFloat(geocodeResult.lon),
          ),
        },
      };
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[GooglePlacesNew] OSM fallback error:', error);
    }
  }

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
