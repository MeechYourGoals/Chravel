/**
 * Token Validation Utilities
 *
 * Validates JWT tokens to detect malformed/corrupted sessions
 * that cause "403: invalid claim: missing sub claim" errors.
 */

export interface TokenPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string;
  role?: string;
  email?: string;
}

/**
 * JWTs use base64url encoding (RFC 7515) which is not directly compatible with `atob`.
 * This normalizes base64url -> base64 and adds padding.
 */
function decodeBase64Url(base64Url: string): string | null {
  try {
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    if (typeof globalThis.atob !== 'function') {
      // In practice this file runs in the browser; keep safe for non-browser environments.
      return null;
    }

    return globalThis.atob(padded);
  } catch {
    return null;
  }
}

/**
 * Safely decode and parse a JWT token payload.
 * Returns null if the token is malformed or cannot be parsed.
 */
export function parseJwtPayload(token: string): TokenPayload | null {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('[TokenValidation] Invalid JWT structure - expected 3 parts, got', parts.length);
      return null;
    }

    const payloadBase64 = parts[1];
    const payloadJson = decodeBase64Url(payloadBase64);
    if (!payloadJson) {
      console.warn('[TokenValidation] Failed to base64url-decode JWT payload');
      return null;
    }
    const payload = JSON.parse(payloadJson);

    return payload as TokenPayload;
  } catch (error) {
    console.error('[TokenValidation] Failed to parse JWT:', error);
    return null;
  }
}

/**
 * Validates that a token has all required claims for Supabase auth.
 * Returns an object with validation status and reason.
 */
export function validateToken(token: string): { valid: boolean; reason?: string } {
  const payload = parseJwtPayload(token);

  if (!payload) {
    return { valid: false, reason: 'TOKEN_PARSE_FAILED' };
  }

  // Check for required 'sub' claim (user ID) - this is the main cause of 403 errors
  if (!payload.sub) {
    return { valid: false, reason: 'MISSING_SUB_CLAIM' };
  }

  // Check if token is expired
  if (payload.exp) {
    const expiresAt = payload.exp * 1000;
    if (Date.now() > expiresAt) {
      return { valid: false, reason: 'TOKEN_EXPIRED' };
    }
  }

  // Validate sub is a valid UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(payload.sub)) {
    return { valid: false, reason: 'INVALID_SUB_FORMAT' };
  }

  return { valid: true };
}

/**
 * Check if a session's access token is valid.
 * Returns true if valid, false if corrupted/expired.
 */
export function isSessionTokenValid(accessToken: string | undefined): boolean {
  if (!accessToken) {
    return false;
  }

  const result = validateToken(accessToken);

  if (!result.valid && import.meta.env.DEV) {
    console.warn('[TokenValidation] Invalid token detected:', result.reason);
  }

  return result.valid;
}

/**
 * Log detailed token info for debugging (dev mode only).
 */
export function logTokenDebug(context: string, token: string | undefined): void {
  if (!import.meta.env.DEV) return;

  if (!token) {
    console.log(`[TokenDebug - ${context}] No token present`);
    return;
  }

  const payload = parseJwtPayload(token);

  if (!payload) {
    console.error(`[TokenDebug - ${context}] Failed to parse token`);
    return;
  }

  console.log(`[TokenDebug - ${context}]`, {
    hasSub: !!payload.sub,
    sub: payload.sub?.slice(0, 8) + '...',
    exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'none',
    isExpired: payload.exp ? Date.now() > payload.exp * 1000 : 'unknown',
    iss: payload.iss,
  });
}
