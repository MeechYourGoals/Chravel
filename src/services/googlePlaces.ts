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
export async function loadMaps(): Promise<typeof google.maps> {
  if (mapsApi) return mapsApi;
  
  if (!loaderPromise) {
    const apiKey = getGoogleMapsApiKey();
    
    console.log('[GooglePlaces] Loading Google Maps API...', { 
      keyPresent: !!apiKey,
      keyPrefix: apiKey?.substring(0, 10) + '...'
    });

    if (!apiKey || apiKey === 'placeholder') {
      throw new Error('Google Maps API key is not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your .env file.');
    }

    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geocoding'],
    });

    loaderPromise = loader.load()
      .then((google) => {
        mapsApi = google.maps;
        console.log('[GooglePlaces] ✅ Google Maps API loaded successfully');
        return mapsApi;
      })
      .catch((error) => {
        console.error('[GooglePlaces] ❌ Failed to load Google Maps API:', error);
        loaderPromise = null; // Reset to allow retry
        throw new Error(`Google Maps API failed to load: ${error.message}. Please check your API key and billing status.`);
      });
  }

  return loaderPromise;
}

/**
 * Create Places and Geocoder service instances
 * Requires an initialized map instance for PlacesService
 */
export async function createServices(map: google.maps.Map) {
await loadMaps();
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
await loadMaps();
const svc = new google.maps.places.AutocompleteService();
return new Promise((resolve, reject) => {
const req: google.maps.places.AutocompletionRequest = {
input,
sessionToken,
// Prefer near origin if we have it
...(origin && { locationBias: new google.maps.LatLng(origin.lat, origin.lng) }),
};
svc.getPlacePredictions(req, (preds, status) => {
if (status === google.maps.places.PlacesServiceStatus.OK && preds) return resolve(preds);
if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) return resolve([]);
reject(new Error(`autocomplete failed: ${status}`));
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
await loadMaps();
// 1) findPlaceFromQuery (precise)
const findPlace = await new Promise<google.maps.places.PlaceResult[] | null>(res => {
    services.places.findPlaceFromQuery(
      {
        query,
        fields: ['place_id', 'geometry', 'name', 'formatted_address'],
        ...(origin && { locationBias: new google.maps.LatLng(origin.lat, origin.lng) }),
      },
      (results, status) => res(status === google.maps.places.PlacesServiceStatus.OK ? results! : null)
    );
});
let candidate = findPlace?.[0];

// 2) textSearch (broader)
if (!candidate) {
const text = await new Promise<google.maps.places.PlaceResult[] | null>(res => {
services.places.textSearch(
{
query,
...(origin && {
location: new google.maps.LatLng(origin.lat, origin.lng),
radius: 50000, // 50km default; tune if needed
}),
// region/strictBounds can be added if you want to confine results
},
(results, status) => res(status === google.maps.places.PlacesServiceStatus.OK ? results! : null)
);
});
candidate = text?.[0] ?? null;
}

// 3) geocode (addresses)
if (!candidate) {
const geo = await services.geocoder.geocode({
address: query,
...(origin && {
bounds: new google.maps.LatLngBounds(
new google.maps.LatLng(origin.lat - 0.4, origin.lng - 0.4),
new google.maps.LatLng(origin.lat + 0.4, origin.lng + 0.4)
),
}),
});
const g = geo.results?.[0];
if (g) {
return {
place_id: g.place_id!,
name: g.formatted_address,
formatted_address: g.formatted_address,
geometry: {
location: g.geometry.location,
viewport: g.geometry.viewport,
} as any,
};
}
return null;
}

// If we have a place_id, enrich via getDetails
if (candidate.place_id) {
const details = await new Promise<google.maps.places.PlaceResult | null>(res => {
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
],
sessionToken,
},
(r, status) => res(status === google.maps.places.PlacesServiceStatus.OK ? r! : candidate!)
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
const g = place.geometry;
if (!g) return;
if (g.viewport) {
map.fitBounds(g.viewport);
} else if (g.location) {
map.setCenter(g.location);
map.setZoom(15);
}
}
