/**
 * Centralized environment detection utilities
 * 
 * CRITICAL: This determines whether we're in Lovable's preview environment.
 * Used to prevent service worker registration and handle Supabase fallbacks.
 */

/**
 * Detects if the app is running in any Lovable preview environment
 * Includes: lovable.app, *.lovable.app, lovableproject.com, *.lovableproject.com
 */
export function isLovablePreview(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  
  return (
    hostname.endsWith('lovable.app') ||
    hostname.endsWith('lovableproject.com') ||
    hostname === 'lovable.app' ||
    hostname === 'lovableproject.com'
  );
}

/**
 * Gets the current environment mode
 */
export function getEnvironmentMode(): 'preview' | 'development' | 'production' {
  if (isLovablePreview()) return 'preview';
  if (import.meta.env.DEV) return 'development';
  return 'production';
}
