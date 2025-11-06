import { getGoogleMapsApiKey } from '@/config/maps';

/**
 * Generate a Google Static Maps API URL for a map thumbnail
 * @param coordinates - Latitude and longitude of the location
 * @param width - Image width in pixels (default: 120)
 * @param height - Image height in pixels (default: 80)
 * @param zoom - Map zoom level (default: 15)
 * @returns Static map URL or empty string if no API key
 */
export const generateStaticMapUrl = (
  coordinates: { lat: number; lng: number },
  width: number = 120,
  height: number = 80,
  zoom: number = 15
): string => {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return ''; // Fallback: no thumbnail
  
  return `https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.lat},${coordinates.lng}&zoom=${zoom}&size=${width}x${height}&markers=color:red%7C${coordinates.lat},${coordinates.lng}&key=${apiKey}&style=feature:poi|visibility:off`;
};

/**
 * Extract coordinates from Google Maps URLs
 * @param url - Google Maps URL
 * @returns Coordinates object or null if not found
 */
export const extractCoordinatesFromUrl = (url: string): { lat: number; lng: number } | null => {
  // Extract from Google Maps URLs: /@lat,lng,zoom or /place/@lat,lng
  const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) {
    return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  }
  return null;
};
