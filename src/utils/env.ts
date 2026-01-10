/**
 * Environment detection utilities
 * 
 * For environment variables/config, use: import { ... } from '@/config/env'
 * This file is for runtime environment detection only.
 */

// Re-export from centralized config for backwards compatibility
export { isLovablePreview, validateEnv, assertEnv } from '@/config/env';

/**
 * Gets the current environment mode
 */
export function getEnvironmentMode(): 'preview' | 'development' | 'production' {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (
      hostname.endsWith('lovable.app') ||
      hostname.endsWith('lovableproject.com') ||
      hostname === 'lovable.app' ||
      hostname === 'lovableproject.com'
    ) {
      return 'preview';
    }
  }
  if (import.meta.env.DEV) return 'development';
  return 'production';
}
