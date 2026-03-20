/**
 * Edge Function Secret Validation
 *
 * Reusable helpers that validate required secrets exist and have correct format
 * before edge functions attempt to use them. Prevents cryptic downstream failures
 * from missing or malformed secrets.
 *
 * Usage:
 *   import { requireSecrets, requireStripeSecrets } from '../_shared/validateSecrets.ts';
 *
 *   // Generic — validate a list of keys
 *   const secrets = requireSecrets(['MY_API_KEY', 'MY_SECRET']);
 *
 *   // Provider-specific — validate and return typed secrets
 *   const { STRIPE_SECRET_KEY } = requireStripeSecrets();
 */

// ---------------------------------------------------------------------------
// Core validation
// ---------------------------------------------------------------------------

/**
 * Validates that all specified environment variables are set and non-empty.
 * Returns a record of key → value for convenience.
 * Throws with a clear error listing all missing keys.
 */
export function requireSecrets(keys: string[]): Record<string, string> {
  const missing: string[] = [];
  const values: Record<string, string> = {};

  for (const key of keys) {
    const val = Deno.env.get(key);
    if (!val || val.trim() === '') {
      missing.push(key);
    } else {
      values[key] = val;
    }
  }

  if (missing.length > 0) {
    const msg =
      `Missing required secrets: ${missing.join(', ')}. ` +
      `Configure these in Supabase Dashboard > Edge Functions > Secrets.`;
    throw new Error(msg);
  }

  return values;
}

/**
 * Validates a single secret exists and optionally matches a format regex.
 * Returns the value on success.
 */
export function requireSecret(key: string, formatRegex?: RegExp): string {
  const val = Deno.env.get(key);
  if (!val || val.trim() === '') {
    throw new Error(
      `Missing required secret: ${key}. Configure in Supabase Dashboard > Edge Functions > Secrets.`,
    );
  }
  if (formatRegex && !formatRegex.test(val)) {
    throw new Error(`Secret ${key} has invalid format. Expected pattern: ${formatRegex.source}`);
  }
  return val;
}

// ---------------------------------------------------------------------------
// Provider-specific validators
// ---------------------------------------------------------------------------

export function requireStripeSecrets(): {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
} {
  const STRIPE_SECRET_KEY = requireSecret('STRIPE_SECRET_KEY', /^sk_(test|live)_/);
  const STRIPE_WEBHOOK_SECRET = requireSecret('STRIPE_WEBHOOK_SECRET', /^whsec_/);
  return { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET };
}

export function requireGeminiSecrets(): { GEMINI_API_KEY: string } {
  const GEMINI_API_KEY = requireSecret('GEMINI_API_KEY');
  return { GEMINI_API_KEY };
}

export function requireVertexSecrets(): {
  VERTEX_PROJECT_ID: string;
  VERTEX_SERVICE_ACCOUNT_KEY: string;
  VERTEX_LOCATION: string;
} {
  const VERTEX_PROJECT_ID = requireSecret('VERTEX_PROJECT_ID');
  const VERTEX_SERVICE_ACCOUNT_KEY = requireSecret('VERTEX_SERVICE_ACCOUNT_KEY');
  const VERTEX_LOCATION = Deno.env.get('VERTEX_LOCATION') || 'us-central1';
  return { VERTEX_PROJECT_ID, VERTEX_SERVICE_ACCOUNT_KEY, VERTEX_LOCATION };
}

export function requireResendSecrets(): { RESEND_API_KEY: string; RESEND_FROM_EMAIL: string } {
  const RESEND_API_KEY = requireSecret('RESEND_API_KEY', /^re_/);
  const RESEND_FROM_EMAIL = requireSecret('RESEND_FROM_EMAIL');
  return { RESEND_API_KEY, RESEND_FROM_EMAIL };
}

export function requireVapidSecrets(): { VAPID_PRIVATE_KEY: string; VAPID_PUBLIC_KEY: string } {
  const VAPID_PRIVATE_KEY = requireSecret('VAPID_PRIVATE_KEY');
  const VAPID_PUBLIC_KEY = requireSecret('VAPID_PUBLIC_KEY');
  return { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY };
}

export function requireGoogleVisionSecrets(): { GOOGLE_VISION_API_KEY: string } {
  const GOOGLE_VISION_API_KEY = requireSecret('GOOGLE_VISION_API_KEY');
  return { GOOGLE_VISION_API_KEY };
}

export function requireAwsSecrets(): {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
} {
  const AWS_ACCESS_KEY_ID = requireSecret('AWS_ACCESS_KEY_ID');
  const AWS_SECRET_ACCESS_KEY = requireSecret('AWS_SECRET_ACCESS_KEY');
  const AWS_REGION = Deno.env.get('AWS_REGION') || 'us-east-1';
  return { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION };
}

/**
 * Validates Twilio secrets. Supports two auth modes:
 * - API Key (preferred, Lovable-compatible): TWILIO_API_KEY_SID (SK…) + TWILIO_API_KEY_SECRET
 * - Auth Token (legacy fallback): TWILIO_AUTH_TOKEN
 *
 * Always requires: TWILIO_ACCOUNT_SID (AC…) + TWILIO_PHONE_NUMBER (E.164)
 */
export function requireTwilioSecrets(): {
  TWILIO_ACCOUNT_SID: string;
  TWILIO_PHONE_NUMBER: string;
  authMode: 'api_key' | 'auth_token';
} {
  const TWILIO_ACCOUNT_SID = requireSecret('TWILIO_ACCOUNT_SID', /^AC[0-9a-fA-F]{32}$/);
  const TWILIO_PHONE_NUMBER = requireSecret('TWILIO_PHONE_NUMBER', /^\+[1-9]\d{4,14}$/);

  // Check for API Key first (preferred)
  const apiKeySid = Deno.env.get('TWILIO_API_KEY_SID') || '';
  const apiKeySecret = Deno.env.get('TWILIO_API_KEY_SECRET') || '';
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';

  let authMode: 'api_key' | 'auth_token';

  if (apiKeySid && apiKeySecret) {
    if (!/^SK[0-9a-fA-F]{32}$/.test(apiKeySid)) {
      throw new Error(
        `TWILIO_API_KEY_SID must start with "SK" followed by 32 hex characters. Got: ${apiKeySid.substring(0, 6)}…`,
      );
    }
    authMode = 'api_key';
  } else if (authToken) {
    authMode = 'auth_token';
  } else {
    throw new Error(
      'No Twilio auth configured. Set TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET (preferred) ' +
        'or TWILIO_AUTH_TOKEN in Supabase Dashboard > Edge Functions > Secrets.',
    );
  }

  return { TWILIO_ACCOUNT_SID, TWILIO_PHONE_NUMBER, authMode };
}

/**
 * Creates a standardized 500 response for missing secrets.
 * Use this in edge function catch blocks when requireSecrets throws.
 */
export function createMissingSecretResponse(
  error: unknown,
  corsHeaders: Record<string, string> = {},
): Response {
  const message = error instanceof Error ? error.message : 'Service configuration error';

  // Log full detail server-side
  console.error('[SECRET_VALIDATION_ERROR]', {
    message,
    timestamp: new Date().toISOString(),
  });

  // Return safe message to client
  return new Response(
    JSON.stringify({ error: 'Service configuration error. Please contact support.' }),
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    },
  );
}
