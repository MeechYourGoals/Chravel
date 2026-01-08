// Allowed origins for CORS - restricts which domains can call Edge Functions
const ALLOWED_ORIGINS = [
  // Production domains
  'https://chravel.app',
  'https://www.chravel.app',
  'https://app.chravel.com',
  // Supabase hosted preview domains
  '.supabase.co',
  // Lovable preview domains
  '.lovable.app',
  '.lovableproject.com',
  // Local development
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  // Mobile app (Capacitor)
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
];

/**
 * Validates if an origin is allowed to make requests to Edge Functions.
 * Supports exact matches and suffix matches for subdomains.
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  return ALLOWED_ORIGINS.some(allowed => {
    // Suffix match for subdomains (e.g., '.supabase.co' matches 'xyz.supabase.co')
    if (allowed.startsWith('.')) {
      return origin.endsWith(allowed) || origin === `https://${allowed.slice(1)}` || origin === `http://${allowed.slice(1)}`;
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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Legacy export for backwards compatibility - will be replaced by getCorsHeaders(req)
// Using wildcard temporarily to avoid breaking existing functions during transition
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
