import { getCorsHeaders } from './cors.ts';

// Input validation and sanitization for Edge Functions
export function validateAndSanitizeInput(data: any): {
  isValid: boolean;
  sanitized?: any;
  error?: string;
} {
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
            ? item
                .replace(/[<>'"]/g, '')
                .trim()
                .substring(0, 1000)
            : item,
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

export interface JsonBodyParseResult<T> {
  data?: T;
  error?: string;
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown-ip';
  }

  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('fly-client-ip') ??
    'unknown-ip'
  );
}

export function redactSensitiveToken(value: string): string {
  const trimmedValue = value.trim();
  if (trimmedValue.length <= 8) {
    return `${trimmedValue.slice(0, 2)}***`;
  }

  return `${trimmedValue.slice(0, 4)}***${trimmedValue.slice(-2)}`;
}

export async function readJsonBody<T>(
  req: Request,
  maxBytes: number,
): Promise<JsonBodyParseResult<T>> {
  const rawBody = await req.text();
  const bodyBytes = new TextEncoder().encode(rawBody).length;

  if (bodyBytes > maxBytes) {
    return { error: 'Request body too large.' };
  }

  if (!rawBody.trim()) {
    return { error: 'Request body is required.' };
  }

  try {
    const data = JSON.parse(rawBody) as T;
    return { data };
  } catch {
    return { error: 'Invalid request body JSON.' };
  }
}

// ── Security Audit Log ──────────────────────────────────────────────────────

export type SecurityEventType =
  | 'auth_failure'
  | 'authz_denied'
  | 'privilege_escalation'
  | 'sensitive_operation'
  | 'rate_limit_exceeded'
  | 'tool_execution'
  | 'tool_blocked'
  | 'webhook_received'
  | 'upload_rejected'
  | 'invite_probe';

/**
 * Write a structured entry to the security_audit_log table.
 * Fire-and-forget: never throws, so callers don't need try/catch around it.
 */
export async function logSecurityEvent(
  supabaseClient: any,
  eventType: SecurityEventType,
  userId: string | null,
  details: Record<string, unknown>,
  ip?: string,
): Promise<void> {
  try {
    await supabaseClient.from('security_audit_log').insert({
      event_type: eventType,
      user_id: userId,
      details,
      ip_address: ip ?? null,
    });
  } catch (err) {
    // Logging must never break the calling code path
    console.error('[SecurityLog] Failed to write audit event:', eventType, err);
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
 * @param userId - Optional user ID for audit logging when limit is exceeded
 * @param endpoint - Optional endpoint name for audit logging
 * @returns Promise with allowed status and remaining count
 */
export async function checkRateLimit(
  supabaseClient: any,
  identifier: string,
  maxRequests: number = 100,
  windowSeconds: number = 60,
  userId?: string | null,
  endpoint?: string,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const { data, error } = await supabaseClient.rpc('increment_rate_limit', {
      rate_key: identifier,
      max_requests: maxRequests,
      window_seconds: windowSeconds,
    });

    if (error) {
      console.error('[Rate Limit] Database check failed:', error);
      // Fail closed - deny request if rate limit check fails (security over availability)
      return { allowed: false, remaining: 0 };
    }

    if (!data || data.length === 0) {
      return { allowed: true, remaining: maxRequests };
    }

    const result = data[0];

    if (!result.allowed) {
      // Fire-and-forget audit log entry for rate limit hits
      logSecurityEvent(supabaseClient, 'rate_limit_exceeded', userId ?? null, {
        identifier,
        endpoint: endpoint ?? 'unknown',
        max_requests: maxRequests,
        window_seconds: windowSeconds,
      }).catch(() => {
        // intentionally swallow — logSecurityEvent already handles errors
      });
    }

    return {
      allowed: result.allowed,
      remaining: result.remaining,
    };
  } catch (err) {
    console.error('[Rate Limit] Exception during check:', err);
    // Fail closed on exception (security over availability)
    return { allowed: false, remaining: 0 };
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
  windowMs: number = 60000,
): { allowed: boolean; remaining: number } {
  console.warn(
    '[Rate Limit] Using deprecated local rate limiting - not effective in distributed edge functions',
  );

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

// Enhanced security headers for Edge Functions (uses validated CORS, not wildcard)
export const securityHeaders = {
  ...getCorsHeaders(),
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  // Add enhanced security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:;",
  );
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
