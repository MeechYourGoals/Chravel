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
let cachedKeyStatus: GoogleMapsKeyStatus | null = null;

export type GoogleMapsKeySource = 'env' | 'fallback';

export interface GoogleMapsKeyStatus {
  key: string;
  source: GoogleMapsKeySource;
  isEnvKeyValid: boolean;
}

const resolveGoogleMapsKeyStatus = (): GoogleMapsKeyStatus => {
  if (cachedKeyStatus) {
    return cachedKeyStatus;
  }

  // Vite exposes env vars via import.meta.env
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  // Validate key - must not be empty, undefined, or placeholder
  const isEnvKeyValid = Boolean(
    envKey &&
    envKey.length > 10 &&
    envKey !== 'placeholder' &&
    !envKey.includes('your_') &&
    !envKey.includes('YOUR_'),
  );

  const key = isEnvKeyValid ? envKey : FALLBACK_PUBLIC_KEY;
  cachedKeyStatus = {
    key,
    source: isEnvKeyValid ? 'env' : 'fallback',
    isEnvKeyValid,
  };

  // Log key status once for debugging (only in development)
  if (!hasLoggedKeyStatus && import.meta.env.DEV) {
    hasLoggedKeyStatus = true;
    console.info('[GoogleMaps Config]', {
      source: isEnvKeyValid ? 'VITE_GOOGLE_MAPS_API_KEY' : 'FALLBACK_KEY',
      keyLength: key.length,
      keyPrefix: key.substring(0, 8) + '...',
    });
  }

  return cachedKeyStatus;
};

export function getGoogleMapsApiKey(): string {
  return resolveGoogleMapsKeyStatus().key;
}

export function getGoogleMapsApiKeyStatus(): GoogleMapsKeyStatus {
  return resolveGoogleMapsKeyStatus();
}

// Export singleton key for consistent usage
export const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();
