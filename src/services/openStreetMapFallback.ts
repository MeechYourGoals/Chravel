/**
 * OpenStreetMap Fallback Service
 *
 * Provides fallback geocoding and place search when Google Maps API is unavailable:
 * - Quota exceeded
 * - API key invalid
 * - Network errors
 * - Service downtime
 *
 * Uses Nominatim API (free, no API key required):
 * - Geocoding: address → coordinates
 * - Reverse geocoding: coordinates → address
 * - Place search: query → places
 *
 * Limitations:
 * - Less accurate than Google Maps
 * - Rate limited (1 request/second, 1 request per IP)
 * - No autocomplete
 * - No place details (ratings, photos, etc.)
 *
 * Created: 2025-02-01
 * Purpose: Ensure app continues working if Google Maps API fails
 */

export type OSMPlace = {
  place_id: number;
  name: string;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
};

export type OSMGeocodeResult = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
};

/**
 * Search for places using OpenStreetMap Nominatim API
 * Fallback when Google Maps API is unavailable
 */
export async function searchPlacesOSM(query: string, limit: number = 5): Promise<OSMPlace[]> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('extratags', '1');

    // Required: User-Agent header (Nominatim ToS requirement)
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Chravel/1.0 (https://chravel.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`OSM API error: ${response.status}`);
    }

    const data = await response.json();
    return data as OSMPlace[];
  } catch (error) {
    console.error('[OSMFallback] Search error:', error);
    return [];
  }
}

/**
 * Geocode an address using OpenStreetMap Nominatim API
 * Fallback when Google Maps Geocoding API is unavailable
 */
export async function geocodeAddressOSM(address: string): Promise<OSMGeocodeResult | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', address);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Chravel/1.0 (https://chravel.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`OSM API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.length === 0) {
      return null;
    }

    const result = data[0];
    return {
      place_id: result.place_id,
      lat: result.lat,
      lon: result.lon,
      display_name: result.display_name,
      address: result.address,
    };
  } catch (error) {
    console.error('[OSMFallback] Geocode error:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates using OpenStreetMap Nominatim API
 * Fallback when Google Maps Geocoding API is unavailable
 */
export async function reverseGeocodeOSM(
  lat: number,
  lng: number,
): Promise<OSMGeocodeResult | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Chravel/1.0 (https://chravel.com)',
      },
    });

    if (!response.ok) {
      throw new Error(`OSM API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data) {
      return null;
    }

    return {
      place_id: data.place_id,
      lat: data.lat,
      lon: data.lon,
      display_name: data.display_name,
      address: data.address,
    };
  } catch (error) {
    console.error('[OSMFallback] Reverse geocode error:', error);
    return null;
  }
}

/**
 * Convert OSM place to Google Maps PlaceResult-like format
 * For compatibility with existing components
 */
export function convertOSMToGoogleFormat(osmPlace: OSMPlace): {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: google.maps.LatLng;
  };
} {
  return {
    place_id: `osm_${osmPlace.place_id}`,
    name: osmPlace.name || osmPlace.display_name,
    formatted_address: osmPlace.display_name,
    geometry: {
      location: new google.maps.LatLng(parseFloat(osmPlace.lat), parseFloat(osmPlace.lon)),
    },
  };
}

/**
 * Check if we should use OSM fallback
 * Returns true if Google Maps API error suggests fallback is needed
 */
export function shouldUseOSMFallback(error: Error | unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorMessage = error.message.toLowerCase();

  // Quota exceeded
  if (errorMessage.includes('quota') || errorMessage.includes('over_query_limit')) {
    return true;
  }

  // API key issues
  if (errorMessage.includes('api key') || errorMessage.includes('invalid key')) {
    return true;
  }

  // Network/service errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('service unavailable')
  ) {
    return true;
  }

  return false;
}
