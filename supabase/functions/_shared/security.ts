import { corsHeaders } from "../_shared/cors.ts";

// Input validation and sanitization for Edge Functions
export function validateAndSanitizeInput(data: any): { isValid: boolean; sanitized?: any; error?: string } {
  try {
    if (!data || typeof data !== 'object') {
      return { isValid: false, error: 'Invalid input data' };
    }

    const sanitized: any = {};

    // Sanitize string fields
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Remove potentially dangerous characters
        const cleaned = value
          .replace(/[<>'"]/g, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+=/gi, '')
          .trim();
        
        // Length validation
        if (cleaned.length > 10000) {
          return { isValid: false, error: `Field ${key} is too long` };
        }
        
        sanitized[key] = cleaned;
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        // Sanitize array elements
        sanitized[key] = value.map(item => 
          typeof item === 'string' 
            ? item.replace(/[<>'"]/g, '').trim().substring(0, 1000)
            : item
        );
      } else {
        sanitized[key] = value;
      }
    }

    return { isValid: true, sanitized };
  } catch (error) {
    return { isValid: false, error: 'Input validation failed' };
  }
}

// 🔒 SECURITY FIX: Distributed rate limiting using database
// Previous in-memory Map doesn't work across distributed edge function instances

/**
 * Database-backed distributed rate limiting
 * Uses Supabase RPC function increment_rate_limit for shared state
 * 
 * @param supabaseClient - Supabase client instance (use service role for edge functions)
 * @param identifier - Unique identifier (user ID, IP address, etc.)
 * @param maxRequests - Maximum requests allowed in window
 * @param windowSeconds - Time window in seconds (default 60s)
 * @returns Promise with allowed status and remaining count
 */
export async function checkRateLimit(
  supabaseClient: any,
  identifier: string, 
  maxRequests: number = 100, 
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const { data, error } = await supabaseClient.rpc('increment_rate_limit', {
      rate_key: identifier,
      max_requests: maxRequests,
      window_seconds: windowSeconds
    });
    
    if (error) {
      console.error('[Rate Limit] Database check failed:', error);
      // Fail open - allow request if rate limit check fails
      return { allowed: true, remaining: maxRequests };
    }
    
    if (!data || data.length === 0) {
      return { allowed: true, remaining: maxRequests };
    }
    
    const result = data[0];
    return {
      allowed: result.allowed,
      remaining: result.remaining
    };
  } catch (err) {
    console.error('[Rate Limit] Exception during check:', err);
    // Fail open on exception
    return { allowed: true, remaining: maxRequests };
  }
}

/**
 * Legacy in-memory rate limiting (deprecated)
 * ⚠️ WARNING: Does not work in distributed environments
 * Use checkRateLimit with database backend instead
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimitLocal(
  identifier: string, 
  maxRequests: number = 100, 
  windowMs: number = 60000
): { allowed: boolean; remaining: number } {
  console.warn('[Rate Limit] Using deprecated local rate limiting - not effective in distributed edge functions');
  
  const now = Date.now();
  const existing = rateLimitMap.get(identifier);
  
  if (!existing || now > existing.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }
  
  existing.count++;
  return { allowed: true, remaining: maxRequests - existing.count };
}

// Enhanced security headers for Edge Functions
export const securityHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  // Add enhanced security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;");
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}