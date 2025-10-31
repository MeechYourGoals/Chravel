// Centralized access for Google Maps API key
// This key is PUBLIC (browser) and should be domain-restricted in Google Cloud.
// We fall back to the provided key if the env var is missing so previews and builds are stable.

const FALLBACK_PUBLIC_KEY = 'AIzaSyAz3raJADWR86fJEV5Hx1_6V_Pgyj3ozw4';

export function getGoogleMapsApiKey(): string {
  // Vite exposes env vars via import.meta.env; if unavailable, use fallback
  const envKey = (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const key = envKey && envKey !== 'placeholder' ? envKey : FALLBACK_PUBLIC_KEY;
  return key;
}

export const GOOGLE_MAPS_API_KEY = getGoogleMapsApiKey();
