/**
 * Rate Limit Guard for Edge Functions
 *
 * Provides a simple, consistent way to apply rate limiting to any edge function.
 * Uses the database-backed checkRateLimit when available, with a lightweight
 * in-process fallback for functions where DB access is expensive.
 *
 * Designed for easy adoption: single function call returns allow/deny + response.
 */

import { checkRateLimit } from './security.ts';

export interface RateLimitConfig {
  /** Unique identifier for the rate limit bucket (e.g., userId, IP, userId:action) */
  identifier: string;
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** CORS headers to include in 429 response */
  corsHeaders: Record<string, string>;
  /** Supabase client with service role for DB-backed rate limiting */
  supabaseClient?: unknown;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  response?: Response;
}

/**
 * Check rate limit and return a ready-to-use result.
 *
 * Usage:
 * ```ts
 * const rl = await applyRateLimit({
 *   identifier: `join-trip:${userId}`,
 *   maxRequests: 10,
 *   windowSeconds: 60,
 *   corsHeaders,
 *   supabaseClient: supabase,
 * });
 * if (!rl.allowed) return rl.response!;
 * ```
 */
export async function applyRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const { identifier, maxRequests, windowSeconds, corsHeaders, supabaseClient } = config;

  if (supabaseClient) {
    // Database-backed distributed rate limiting
    const result = await checkRateLimit(supabaseClient, identifier, maxRequests, windowSeconds);

    if (!result.allowed) {
      return {
        allowed: false,
        remaining: 0,
        response: new Response(
          JSON.stringify({
            error: 'Too many requests. Please try again later.',
            retryAfter: windowSeconds,
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Retry-After': String(windowSeconds),
            },
          },
        ),
      };
    }

    return { allowed: true, remaining: result.remaining };
  }

  // Fallback: in-process rate limiting (not distributed, but better than nothing)
  const result = checkInProcessRateLimit(identifier, maxRequests, windowSeconds * 1000);

  if (!result.allowed) {
    return {
      allowed: false,
      remaining: 0,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests. Please try again later.',
          retryAfter: windowSeconds,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(windowSeconds),
          },
        },
      ),
    };
  }

  return { allowed: true, remaining: result.remaining };
}

// In-process fallback (single instance only — not shared across edge function replicas)
const buckets = new Map<string, { count: number; resetAt: number }>();

function checkInProcessRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(identifier);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (bucket.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count++;
  return { allowed: true, remaining: maxRequests - bucket.count };
}
