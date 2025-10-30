/// <reference types="@types/google.maps" />

/**
 * Google Places API Service
 * 
 * Provides client-side Google Maps JavaScript API integration for:
 * - Autocomplete suggestions
 * - Place search (findPlaceFromQuery → textSearch → geocode cascade)
 * - Place details enrichment
 * - Map centering utilities
 * 
 * Uses @googlemaps/js-api-loader for lazy loading with Places & Geocoding libraries.
 */

import { Loader } from '@googlemaps/js-api-loader';
import { getGoogleMapsApiKey } from '@/config/maps';

let mapsApi: typeof google.maps | null = null;
let loaderPromise: Promise<typeof google.maps> | null = null;

export type SearchOrigin = { lat: number; lng: number } | null;

/**
 * Lazy-load Google Maps JavaScript API with Places & Geocoding libraries
 */
export async function loadMapsApi(): Promise<typeof google.maps> {
  if (mapsApi) return mapsApi;
  
  if (!loaderPromise) {
    const apiKey = getGoogleMapsApiKey();

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geocoding'],
    });

    loaderPromise = loader.load().then(google => {
      mapsApi = google.maps;
      return google.maps;
    });
  }

  return loaderPromise;
}

/**
 * Create Places and Geocoder service instances
 * Requires an initialized map instance for PlacesService
 */
export async function createServices(map: google.maps.Map) {
  await loadMapsApi();
  return {
    places: new google.maps.places.PlacesService(map),
    geocoder: new google.maps.Geocoder(),
  };
}

/**
 * Get autocomplete predictions for a search query
 * 
 * @param input - User's search query text
 * @param sessionToken - Session token for billing grouping
 * @param origin - Optional origin coordinates for location bias
 * @returns Array of autocomplete predictions
 */
export async function autocomplete(
  input: string,
  sessionToken: google.maps.places.AutocompleteSessionToken,
  origin: SearchOrigin
): Promise<google.maps.places.AutocompletePrediction[]> {
  await loadMapsApi();
  const service = new google.maps.places.AutocompleteService();
  
  return new Promise((resolve, reject) => {
    const request: google.maps.places.AutocompletionRequest = {
      input,
      sessionToken,
      // Bias results toward origin if provided
      ...(origin && { 
        locationBias: new google.maps.LatLng(origin.lat, origin.lng),
      }),
    };

    service.getPlacePredictions(request, (predictions, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
        return resolve(predictions);
      }
      if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        return resolve([]);
      }
      reject(new Error(`Autocomplete failed: ${status}`));
    });
  });
}

/**
 * Resolve a search query to a place using a 3-tier cascade:
 * 1. findPlaceFromQuery (fast, high precision)
 * 2. textSearch (broader, natural language)
 * 3. geocode (addresses, fallback)
 * 
 * Enriches result with getDetails if place_id is available.
 * 
 * @param map - Google Maps instance
 * @param services - Places and Geocoder services
 * @param query - Search query string
 * @param origin - Optional origin for location bias
 * @param sessionToken - Session token for billing
 * @returns Resolved place result or null if not found
 */
export async function resolveQuery(
  map: google.maps.Map,
  services: { places: google.maps.places.PlacesService; geocoder: google.maps.Geocoder },
  query: string,
  origin: SearchOrigin,
  sessionToken: google.maps.places.AutocompleteSessionToken
): Promise<google.maps.places.PlaceResult | null> {
  await loadMapsApi();

  // Tier 1: findPlaceFromQuery (precise, best for known places)
  const findPlaceResults = await new Promise<google.maps.places.PlaceResult[] | null>(resolve => {
    services.places.findPlaceFromQuery(
      {
        query,
        fields: ['place_id', 'geometry', 'name', 'formatted_address'],
        ...(origin && { 
          locationBias: new google.maps.LatLng(origin.lat, origin.lng),
        }),
        // @ts-ignore - sessionToken is valid but types might be outdated
        sessionToken,
      },
      (results, status) => {
        resolve(status === google.maps.places.PlacesServiceStatus.OK ? results! : null);
      }
    );
  });

  let candidate = findPlaceResults?.[0];

  // Tier 2: textSearch (broader natural language search)
  if (!candidate) {
    const textSearchResults = await new Promise<google.maps.places.PlaceResult[] | null>(resolve => {
      services.places.textSearch(
        {
          query,
          ...(origin && {
            location: new google.maps.LatLng(origin.lat, origin.lng),
            radius: 50000, // 50km search radius - tune based on use case
          }),
        },
        (results, status) => {
          resolve(status === google.maps.places.PlacesServiceStatus.OK ? results! : null);
        }
      );
    });
    candidate = textSearchResults?.[0] ?? null;
  }

  // Tier 3: geocode (addresses, final fallback)
  if (!candidate) {
    try {
      const geocodeResult = await services.geocoder.geocode({
        address: query,
        ...(origin && {
          bounds: new google.maps.LatLngBounds(
            new google.maps.LatLng(origin.lat - 0.4, origin.lng - 0.4),
            new google.maps.LatLng(origin.lat + 0.4, origin.lng + 0.4)
          ),
        }),
      });

      const geocoded = geocodeResult.results?.[0];
      if (geocoded) {
        return {
          place_id: geocoded.place_id!,
          name: geocoded.formatted_address,
          formatted_address: geocoded.formatted_address,
          geometry: {
            location: geocoded.geometry.location,
            viewport: geocoded.geometry.viewport,
          } as any,
        };
      }
    } catch (error) {
      console.error('Geocode fallback error:', error);
    }

    return null;
  }

  // Enrich candidate with full details if we have a place_id
  if (candidate.place_id) {
    const details = await new Promise<google.maps.places.PlaceResult | null>(resolve => {
      services.places.getDetails(
        {
          placeId: candidate!.place_id!,
          fields: [
            'place_id',
            'name',
            'formatted_address',
            'geometry',
            'url',
            'website',
            'rating',
            'types',
            'photos',
          ],
          sessionToken,
        },
        (result, status) => {
          resolve(status === google.maps.places.PlacesServiceStatus.OK ? result! : candidate!);
        }
      );
    });
    return details;
  }

  return candidate;
}

/**
 * Center map on a place result
 * Prioritizes viewport (for fitting regions) over location (for points)
 * 
 * @param map - Google Maps instance
 * @param place - Place result with geometry
 */
export function centerMapOnPlace(map: google.maps.Map, place: google.maps.places.PlaceResult) {
  const geometry = place.geometry;
  if (!geometry) {
    console.warn('Cannot center map: place has no geometry', place);
    return;
  }

  if (geometry.viewport) {
    // Fit bounds to show the entire viewport (better for regions/areas)
    map.fitBounds(geometry.viewport);
  } else if (geometry.location) {
    // Center on point location with default zoom
    map.setCenter(geometry.location);
    map.setZoom(15);
  }
}

/**
 * Create a session token for autocomplete/search billing grouping
 * Call this once per search session, reset after a confirmed selection
 */
export async function createSessionToken(): Promise<google.maps.places.AutocompleteSessionToken> {
  await loadMapsApi();
  return new google.maps.places.AutocompleteSessionToken();
}
