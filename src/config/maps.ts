/**
 * Centralized Google Maps API Key Configuration
 * 
 * This key is PUBLIC (browser-side) and MUST be domain-restricted in Google Cloud Console.
 * 
 * SETUP:
 * 1. Add VITE_GOOGLE_MAPS_API_KEY secret in Lovable settings
 * 2. Or set VITE_GOOGLE_MAPS_API_KEY in .env file for local dev
 * 
 * SECURITY: No fallback key is provided. If the env var is missing, Maps features
 * will be disabled. This prevents accidental key exposure in the client bundle.
 */

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
  
  if (!isValidKey) {
    if (!hasLoggedKeyStatus) {
      hasLoggedKeyStatus = true;
      console.warn(
        '[GoogleMaps Config] VITE_GOOGLE_MAPS_API_KEY is not set or invalid. ' +
        'Maps features will be disabled. Add the key in Lovable settings or .env file.'
      );
    }
    return '';
  }
  
  // Log key status once for debugging (only in development)
  if (!hasLoggedKeyStatus && import.meta.env.DEV) {
    hasLoggedKeyStatus = true;
    console.info('[GoogleMaps Config]', {
      source: 'VITE_GOOGLE_MAPS_API_KEY',
      keyLength: envKey.length,
      keyPrefix: envKey.substring(0, 8) + '...',
    });
  }
  
  return envKey;
}

// Export singleton key for consistent usage
export const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();
