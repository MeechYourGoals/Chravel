/**
 * Centralized Environment Configuration
 * 
 * All environment variables should be accessed through this module.
 * This provides runtime validation and type-safe access.
 * 
 * For Capacitor builds: env vars are baked in at build time.
 * Ensure `npm run build` runs with proper .env or env vars exported.
 */

// Access Vite environment variables safely
const getEnv = () => {
  if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
    return (import.meta as any).env;
  }
  return {};
};

const env = getEnv();

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const SUPABASE_URL = env.VITE_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Project ref extracted from URL for edge function calls
export const SUPABASE_PROJECT_REF = SUPABASE_URL
  ? new URL(SUPABASE_URL).hostname.split('.')[0]
  : undefined;

// Edge function base URL
export const SUPABASE_FUNCTIONS_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1`
  : undefined;

// ─────────────────────────────────────────────────────────────────────────────
// Google Maps Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const GOOGLE_MAPS_API_KEY = env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

// ─────────────────────────────────────────────────────────────────────────────
// Stream Chat Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const STREAM_API_KEY = env.VITE_STREAM_API_KEY as string | undefined;

// ─────────────────────────────────────────────────────────────────────────────
// RevenueCat Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const REVENUECAT_IOS_API_KEY = env.VITE_REVENUECAT_IOS_API_KEY as string | undefined;
export const REVENUECAT_ANDROID_API_KEY = env.VITE_REVENUECAT_ANDROID_API_KEY as string | undefined;
export const REVENUECAT_ENABLED = env.VITE_REVENUECAT_ENABLED === 'true';

// ─────────────────────────────────────────────────────────────────────────────
// App Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const APP_URL = env.VITE_APP_URL as string | undefined;
export const BUILD_ID = env.VITE_BUILD_ID as string | undefined;

// ─────────────────────────────────────────────────────────────────────────────
// Runtime Validation
// ─────────────────────────────────────────────────────────────────────────────

export interface EnvValidationResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validates that required environment variables are present.
 * Call this early in app initialization.
 */
export function validateEnv(): EnvValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Required for app to function
  if (!SUPABASE_URL) {
    missing.push('VITE_SUPABASE_URL');
  }
  if (!SUPABASE_ANON_KEY) {
    missing.push('VITE_SUPABASE_ANON_KEY');
  }

  // Optional but recommended
  if (!GOOGLE_MAPS_API_KEY) {
    warnings.push('VITE_GOOGLE_MAPS_API_KEY is not set - Places features will be limited');
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Throws an error if required environment variables are missing.
 * Use this for hard failures in production.
 */
export function assertEnv(): void {
  const result = validateEnv();
  
  if (!result.isValid) {
    const message = `Missing required environment variables: ${result.missing.join(', ')}. ` +
      'Please set these in your .env file or deployment environment.';
    
    // In development, log a detailed error
    if (import.meta.env.DEV) {
      console.error('[ENV] ' + message);
      console.error('[ENV] See .env.example for required variables');
    }
    
    throw new Error(message);
  }

  // Log warnings in development
  if (import.meta.env.DEV && result.warnings.length > 0) {
    result.warnings.forEach(warning => {
      console.warn('[ENV] ' + warning);
    });
  }
}

/**
 * Check if we're running in a preview/sandbox environment
 */
export function isLovablePreview(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.includes('lovable.dev') || 
         host.includes('lovableproject.com') || 
         host.includes('webcontainer.io');
}

/**
 * Get the base URL for edge function calls
 */
export function getEdgeFunctionUrl(functionName: string): string {
  if (!SUPABASE_FUNCTIONS_URL) {
    throw new Error('SUPABASE_URL is not configured');
  }
  return `${SUPABASE_FUNCTIONS_URL}/${functionName}`;
}

/**
 * Get headers for authenticated edge function calls
 */
export function getEdgeFunctionHeaders(accessToken?: string): Record<string, string> {
  if (!SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY is not configured');
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  };
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  return headers;
}
