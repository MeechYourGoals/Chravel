/**
 * Centralized Google Maps API Key Configuration
 * 
 * This key is PUBLIC (browser-side) and MUST be domain-restricted in Google Cloud Console.
 * 
 * SETUP:
 * 1. Add VITE_GOOGLE_MAPS_API_KEY secret in Lovable settings
 * 2. Or set VITE_GOOGLE_MAPS_API_KEY in .env file for local dev
 * 
 * The fallback key is for backwards compatibility but may have domain restrictions.
 */

const FALLBACK_PUBLIC_KEY = 'AIzaSyAz3raJADWR86fJEV5Hx1_6V_Pgyj3ozw4';

// Track initialization for debugging
let hasLoggedKeyStatus = false;

export function getGoogleMapsApiKey(): string {
  // Vite exposes env vars via import.meta.env
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  
  // Validate key - must not be empty, undefined, or placeholder
  const isValidKey = envKey && 
    envKey.length > 10 && 
    envKey !== 'placeholder' && 
    !envKey.includes('your_') &&
    !envKey.includes('YOUR_');
  
  const key = isValidKey ? envKey : FALLBACK_PUBLIC_KEY;
  
  // Log key status once for debugging (only in development)
  if (!hasLoggedKeyStatus && import.meta.env.DEV) {
    hasLoggedKeyStatus = true;
    console.info('[GoogleMaps Config]', {
      source: isValidKey ? 'VITE_GOOGLE_MAPS_API_KEY' : 'FALLBACK_KEY',
      keyLength: key.length,
      keyPrefix: key.substring(0, 8) + '...',
    });
  }
  
  return key;
}

// Export singleton key for consistent usage
export const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();
