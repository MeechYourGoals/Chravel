import { getCorsHeaders, corsHeaders } from "./cors.ts";

// Enhanced security headers for all edge functions
export const securityHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Content Security Policy
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;",
  // HTTP Strict Transport Security (HSTS)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  // Permissions Policy (formerly Feature Policy)
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

/**
 * Get security headers with validated CORS origin.
 * Use this for responses that need proper origin validation.
 */
export function getSecurityHeaders(req?: Request): Record<string, string> {
  return {
    ...getCorsHeaders(req),
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
}

// Helper to create consistent response with security headers
export function createSecureResponse(
  body: unknown,
  status: number = 200,
  additionalHeaders: Record<string, string> = {},
  req?: Request
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...(req ? getSecurityHeaders(req) : securityHeaders),
        ...additionalHeaders
      }
    }
  );
}

// Helper for error responses
export function createErrorResponse(
  error: string | Error,
  status: number = 400,
  req?: Request
): Response {
  const message = typeof error === 'string' ? error : error.message;
  return createSecureResponse(
    { error: message },
    status,
    {},
    req
  );
}

// Helper for OPTIONS (CORS preflight) responses
export function createOptionsResponse(req?: Request): Response {
  return new Response(null, { headers: req ? getCorsHeaders(req) : corsHeaders });
}
