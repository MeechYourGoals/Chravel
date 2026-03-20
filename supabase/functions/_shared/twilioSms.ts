/**
 * Shared Twilio SMS Module
 *
 * Canonical Twilio Programmable Messaging client for all edge functions.
 * Supports both Auth Token and API Key authentication (API Key preferred
 * for Lovable connector compatibility and revocable credential security).
 *
 * Features:
 * - API Key auth (SK… + secret) with Auth Token fallback
 * - Messaging Service SID support (preferred over raw From number)
 * - Region-aware API endpoint
 * - StatusCallback URL for delivery tracking
 * - Structured error parsing with Twilio error codes
 * - Input validation (E.164 phone format)
 *
 * Usage:
 *   import { createTwilioClient, sendSms } from '../_shared/twilioSms.ts';
 *
 *   const client = createTwilioClient();       // reads env vars
 *   const result = await sendSms(client, '+15551234567', 'Hello!');
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TwilioCredentials {
  /** Twilio Account SID (AC…) */
  accountSid: string;
  /**
   * Auth method — API Key is preferred (Lovable connector compatible).
   * Falls back to Auth Token if API Key vars are not set.
   */
  auth:
    | { type: 'api_key'; apiKeySid: string; apiKeySecret: string }
    | { type: 'auth_token'; authToken: string };
  /** From phone number in E.164 (e.g. +15551234567). Used when no Messaging Service. */
  fromNumber: string;
  /** Optional Messaging Service SID (MG…). Preferred over raw From number. */
  messagingServiceSid?: string;
  /** Twilio API region — default is US1 (api.twilio.com). */
  region: TwilioRegion;
  /** Optional StatusCallback URL for delivery tracking webhook. */
  statusCallbackUrl?: string;
}

export type TwilioRegion = 'us1' | 'au1' | 'ie1';

export interface TwilioSendResult {
  ok: boolean;
  /** Twilio Message SID (SM…) — present on success. */
  messageSid?: string;
  /** Twilio-reported initial message status (queued, sent, etc.). */
  twilioStatus?: string;
  /** Human-readable error message on failure. */
  error?: string;
  /** Twilio numeric error code (e.g. 21608, 21211). */
  errorCode?: number;
  /** HTTP status code from Twilio API. */
  httpStatus?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REGION_HOSTS: Record<TwilioRegion, string> = {
  us1: 'api.twilio.com',
  au1: 'api.au1.twilio.com',
  ie1: 'api.ie1.twilio.com',
};

const E164_REGEX = /^\+[1-9]\d{4,14}$/;
const ACCOUNT_SID_REGEX = /^AC[0-9a-fA-F]{32}$/;
const API_KEY_SID_REGEX = /^SK[0-9a-fA-F]{32}$/;
const MESSAGING_SERVICE_SID_REGEX = /^MG[0-9a-fA-F]{32}$/;

// ---------------------------------------------------------------------------
// Client Factory
// ---------------------------------------------------------------------------

/**
 * Creates a TwilioCredentials object from environment variables.
 *
 * Env vars read:
 *   TWILIO_ACCOUNT_SID        (required, AC…)
 *   TWILIO_API_KEY_SID         (optional, SK… — preferred auth)
 *   TWILIO_API_KEY_SECRET      (required if SID set)
 *   TWILIO_AUTH_TOKEN           (fallback auth if no API Key)
 *   TWILIO_PHONE_NUMBER         (required, E.164)
 *   TWILIO_MESSAGING_SERVICE_SID (optional, MG…)
 *   TWILIO_REGION               (optional, default us1)
 *   TWILIO_STATUS_CALLBACK_URL  (optional)
 *
 * Throws with actionable message if required vars are missing/malformed.
 */
export function createTwilioClient(): TwilioCredentials {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
  const apiKeySid = Deno.env.get('TWILIO_API_KEY_SID') || '';
  const apiKeySecret = Deno.env.get('TWILIO_API_KEY_SECRET') || '';
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '';
  const messagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID') || '';
  const regionRaw = (Deno.env.get('TWILIO_REGION') || 'us1').toLowerCase();
  const statusCallbackUrl = Deno.env.get('TWILIO_STATUS_CALLBACK_URL') || '';

  // --- Validate Account SID ---
  if (!accountSid) {
    throw new Error(
      'Missing TWILIO_ACCOUNT_SID. Set it in Supabase Dashboard > Edge Functions > Secrets.',
    );
  }
  if (!ACCOUNT_SID_REGEX.test(accountSid)) {
    throw new Error(
      `TWILIO_ACCOUNT_SID must start with "AC" followed by 32 hex characters. Got: ${accountSid.substring(0, 6)}…`,
    );
  }

  // --- Validate Auth (API Key preferred, Auth Token fallback) ---
  let auth: TwilioCredentials['auth'];

  if (apiKeySid) {
    if (!API_KEY_SID_REGEX.test(apiKeySid)) {
      throw new Error(
        `TWILIO_API_KEY_SID must start with "SK" followed by 32 hex characters. Got: ${apiKeySid.substring(0, 6)}…`,
      );
    }
    if (!apiKeySecret) {
      throw new Error(
        'TWILIO_API_KEY_SECRET is required when TWILIO_API_KEY_SID is set. ' +
          'Set it in Supabase Dashboard > Edge Functions > Secrets.',
      );
    }
    auth = { type: 'api_key', apiKeySid, apiKeySecret };
  } else if (authToken) {
    auth = { type: 'auth_token', authToken };
  } else {
    throw new Error(
      'No Twilio auth configured. Set either TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET (preferred) ' +
        'or TWILIO_AUTH_TOKEN in Supabase Dashboard > Edge Functions > Secrets.',
    );
  }

  // --- Validate From Number ---
  if (!fromNumber) {
    throw new Error(
      'Missing TWILIO_PHONE_NUMBER. Set it in Supabase Dashboard > Edge Functions > Secrets.',
    );
  }
  if (!E164_REGEX.test(fromNumber)) {
    throw new Error(
      `TWILIO_PHONE_NUMBER must be E.164 format (e.g. +15551234567). Got: ${fromNumber}`,
    );
  }

  // --- Validate optional Messaging Service SID ---
  if (messagingServiceSid && !MESSAGING_SERVICE_SID_REGEX.test(messagingServiceSid)) {
    throw new Error(
      `TWILIO_MESSAGING_SERVICE_SID must start with "MG" followed by 32 hex characters. Got: ${messagingServiceSid.substring(0, 6)}…`,
    );
  }

  // --- Validate Region ---
  const region = (['us1', 'au1', 'ie1'].includes(regionRaw) ? regionRaw : 'us1') as TwilioRegion;

  return {
    accountSid,
    auth,
    fromNumber,
    ...(messagingServiceSid ? { messagingServiceSid } : {}),
    region,
    ...(statusCallbackUrl ? { statusCallbackUrl } : {}),
  };
}

// ---------------------------------------------------------------------------
// Send SMS
// ---------------------------------------------------------------------------

/**
 * Sends an SMS via Twilio Programmable Messaging API.
 *
 * - Uses Messaging Service SID if configured (better deliverability, compliance).
 * - Falls back to From number.
 * - Includes StatusCallback URL if configured.
 * - Returns structured result with Twilio SID, status, or error details.
 */
export async function sendSms(
  client: TwilioCredentials,
  toPhone: string,
  messageBody: string,
): Promise<TwilioSendResult> {
  // Validate destination
  if (!toPhone || !E164_REGEX.test(toPhone)) {
    return {
      ok: false,
      error: `Invalid destination phone number: must be E.164 format. Got: ${toPhone || '(empty)'}`,
      httpStatus: 0,
    };
  }

  if (!messageBody || messageBody.trim().length === 0) {
    return { ok: false, error: 'Message body cannot be empty', httpStatus: 0 };
  }

  // Build auth header
  const authString =
    client.auth.type === 'api_key'
      ? `${client.auth.apiKeySid}:${client.auth.apiKeySecret}`
      : `${client.accountSid}:${client.auth.authToken}`;
  const credentials = btoa(authString);

  // Build form body
  const params = new URLSearchParams({
    To: toPhone,
    Body: messageBody,
  });

  // Prefer Messaging Service over raw From number
  if (client.messagingServiceSid) {
    params.set('MessagingServiceSid', client.messagingServiceSid);
  } else {
    params.set('From', client.fromNumber);
  }

  // StatusCallback for delivery tracking
  if (client.statusCallbackUrl) {
    params.set('StatusCallback', client.statusCallbackUrl);
  }

  const host = REGION_HOSTS[client.region];
  const url = `https://${host}/2010-04-01/Accounts/${client.accountSid}/Messages.json`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
      signal: AbortSignal.timeout(15_000),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return parseTwilioError(response.status, responseText);
    }

    return parseTwilioSuccess(responseText);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, error: 'Twilio API request timed out after 15s', httpStatus: 0 };
    }
    return {
      ok: false,
      error: `Twilio request failed: ${err instanceof Error ? err.message : String(err)}`,
      httpStatus: 0,
    };
  }
}

// ---------------------------------------------------------------------------
// Response Parsers
// ---------------------------------------------------------------------------

function parseTwilioError(httpStatus: number, responseText: string): TwilioSendResult {
  let errorCode: number | undefined;
  let errorMessage = responseText.substring(0, 300);

  try {
    const body = JSON.parse(responseText);
    errorCode = body.code ?? body.error_code ?? undefined;
    errorMessage = body.message ?? body.error_message ?? errorMessage;
  } catch {
    // Keep raw text as error message
  }

  return {
    ok: false,
    error: `Twilio API error (HTTP ${httpStatus}): ${errorMessage}`,
    errorCode,
    httpStatus,
  };
}

function parseTwilioSuccess(responseText: string): TwilioSendResult {
  let parsed: { sid?: string; status?: string; error_code?: number; error_message?: string };
  try {
    parsed = JSON.parse(responseText);
  } catch {
    return {
      ok: false,
      error: 'Twilio returned invalid JSON response',
      httpStatus: 200,
    };
  }

  const messageSid = parsed.sid;
  if (!messageSid || typeof messageSid !== 'string' || !messageSid.startsWith('SM')) {
    return {
      ok: false,
      error: `Twilio did not return a valid Message SID (expected SM…). Got: ${messageSid || '(none)'}`,
      httpStatus: 200,
    };
  }

  return {
    ok: true,
    messageSid,
    twilioStatus: parsed.status || 'unknown',
    errorCode: parsed.error_code ?? undefined,
    httpStatus: 200,
  };
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

/**
 * Returns a diagnostic summary of the Twilio configuration.
 * Safe to log — redacts secrets.
 */
export function describeTwilioConfig(client: TwilioCredentials): Record<string, string> {
  return {
    accountSid: `${client.accountSid.substring(0, 6)}…`,
    authType: client.auth.type,
    fromNumber: `${client.fromNumber.substring(0, 6)}***`,
    messagingService: client.messagingServiceSid
      ? `${client.messagingServiceSid.substring(0, 6)}…`
      : '(none — using From number)',
    region: client.region,
    statusCallback: client.statusCallbackUrl || '(not configured)',
  };
}

/**
 * Maps common Twilio error codes to human-readable diagnostic messages.
 * Useful for UI error hints and logging.
 */
export function diagnoseTwilioError(errorCode: number | undefined): string {
  if (!errorCode) return '';

  const diagnostics: Record<number, string> = {
    // Auth / credential issues
    20003: 'Authentication failed. Check TWILIO_ACCOUNT_SID and auth credentials.',
    20404: 'Twilio resource not found. Verify Account SID is correct.',

    // Trial account restrictions
    21608:
      'Trial account: recipient number is not verified. ' +
      'Add it in Twilio Console > Phone Numbers > Verified Caller IDs, or upgrade your account.',

    // Number / sender issues
    21211: 'Invalid "To" phone number. Ensure E.164 format (+1…).',
    21214: 'Invalid "From" phone number. Check TWILIO_PHONE_NUMBER.',
    21606: '"From" number is not SMS-capable. Use an SMS-enabled number in Twilio Console.',
    21610: 'Recipient has opted out of messages from this number (STOP keyword).',
    21612: '"From" number is not owned by your Twilio account.',
    21614: '"To" number is not a valid mobile number.',

    // Messaging Service issues
    21701: 'Messaging Service has no phone numbers in its sender pool.',
    21703: 'Messaging Service SID is invalid.',

    // Compliance / filtering
    30003: 'Unreachable destination. Carrier may have blocked the message.',
    30004:
      'Message blocked by Twilio or carrier. Check compliance (A2P 10DLC / toll-free verification).',
    30005: 'Unknown destination. Number may not exist.',
    30006: 'Landline or unreachable number. SMS cannot be delivered.',
    30007:
      'Message filtered by carrier. Likely needs A2P 10DLC registration or toll-free verification.',
    30008: 'Unknown error from carrier.',

    // Rate / queue issues
    14107: 'Message rate limit exceeded. Slow down sending.',
    30010: 'Message price exceeds max price.',
  };

  return (
    diagnostics[errorCode] ||
    `Twilio error code ${errorCode}. See https://www.twilio.com/docs/api/errors/${errorCode}`
  );
}
