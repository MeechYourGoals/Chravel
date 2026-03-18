// Allowed origins for CORS - restricts which domains can call Edge Functions.
// SECURITY: Only list specific known origins. Wildcard subdomain matchers like
// '.vercel.app' allow ANY project on that platform to call our edge functions.
// Use ADDITIONAL_ALLOWED_ORIGINS env var for preview/staging URLs.
const ALLOWED_ORIGINS = [
  // Production domains
  'https://chravel.app',
  'https://www.chravel.app',
  'https://app.chravel.com',
  // Specific Supabase project
  'https://jmjiyekmxwsxkfnqwyaa.supabase.co',
  // Local development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:8080',
  // Mobile app (Capacitor)
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  // Lovable preview/published domains (trusted platform)
  '.lovable.app',
  '.lovableproject.com',
];

const ENV_ALLOWED_ORIGINS = (Deno.env.get('ADDITIONAL_ALLOWED_ORIGINS') || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

/**
 * Validates if an origin is allowed to make requests to Edge Functions.
 * Supports exact matches and suffix matches for subdomains.
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const allowlist = [...ALLOWED_ORIGINS, ...ENV_ALLOWED_ORIGINS];

  return allowlist.some(allowed => {
    // Suffix match for subdomains (e.g., '.supabase.co' matches 'xyz.supabase.co')
    if (allowed.startsWith('.')) {
      return (
        origin.endsWith(allowed) ||
        origin === `https://${allowed.slice(1)}` ||
        origin === `http://${allowed.slice(1)}`
      );
    }
    // Exact match
    return origin === allowed;
  });
}

/**
 * Gets CORS headers with validated origin.
 * Returns the requesting origin if allowed, otherwise defaults to production domain.
 */
export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers?.get('origin') || '';
  const allowedOrigin = isOriginAllowed(origin) ? origin : 'https://chravel.app';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Legacy corsHeaders kept as a function alias to prevent wildcard CORS.
// All edge functions should use getCorsHeaders(req) directly.
// This export exists only for backwards compatibility during migration.
export const corsHeaders = getCorsHeaders();
