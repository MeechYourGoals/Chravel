/**
 * Twilio SMS Status Callback Handler
 *
 * Receives POST requests from Twilio with SMS delivery status updates
 * and updates the notification_logs table accordingly.
 *
 * Twilio sends status callbacks as application/x-www-form-urlencoded with fields:
 *   MessageSid, MessageStatus, ErrorCode, ErrorMessage, To, From, AccountSid
 *
 * Authentication:
 *   1. TWILIO_AUTH_TOKEN set -> validate X-Twilio-Signature (HMAC-SHA1)
 *   2. Fallback -> validate x-webhook-secret against TWILIO_WEBHOOK_SECRET env var
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from '../_shared/cors.ts';

// ---------------------------------------------------------------------------
// Logging helper
// ---------------------------------------------------------------------------

const LOG_PREFIX = '[TWILIO-STATUS-CALLBACK]';

function logStep(step: string, details?: Record<string, unknown>): void {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`${LOG_PREFIX} ${step}${detailsStr}`);
}

function logError(step: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${LOG_PREFIX} ${step}: ${message}`);
}

// ---------------------------------------------------------------------------
// Twilio signature validation (HMAC-SHA1 via Web Crypto API)
// ---------------------------------------------------------------------------

async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>,
): Promise<boolean> {
  // Twilio signature algorithm: HMAC-SHA1 of (url + sorted param key/value concatenation)
  const data =
    url +
    Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], '');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return computed === signature;
}

// ---------------------------------------------------------------------------
// Status mapping: Twilio status -> notification_logs status
// ---------------------------------------------------------------------------

type TwilioMessageStatus = 'queued' | 'sent' | 'delivered' | 'undelivered' | 'failed';

/**
 * Maps Twilio message statuses to the notification_logs status values.
 *   queued     -> sent   (still in-flight, keep as sent)
 *   sent       -> sent   (handed to carrier, not yet confirmed)
 *   delivered  -> delivered
 *   undelivered -> failed
 *   failed     -> failed
 */
function mapTwilioStatus(twilioStatus: string): 'sent' | 'delivered' | 'failed' {
  switch (twilioStatus) {
    case 'delivered':
      return 'delivered';
    case 'undelivered':
    case 'failed':
      return 'failed';
    case 'queued':
    case 'sent':
    default:
      return 'sent';
  }
}

const VALID_TWILIO_STATUSES: Set<string> = new Set([
  'queued',
  'sent',
  'delivered',
  'undelivered',
  'failed',
]);

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Twilio always POSTs status callbacks
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // -----------------------------------------------------------------------
    // 1. Parse the form-encoded body
    // -----------------------------------------------------------------------
    const bodyText = await req.text();
    const formParams = new URLSearchParams(bodyText);

    const params: Record<string, string> = {};
    for (const [key, value] of formParams.entries()) {
      params[key] = value;
    }

    const messageSid = params.MessageSid || '';
    const messageStatus = params.MessageStatus || '';
    const errorCode = params.ErrorCode || '';
    const errorMessage = params.ErrorMessage || '';
    const accountSid = params.AccountSid || '';
    const to = params.To || '';
    const from = params.From || '';

    // Basic validation: MessageSid and MessageStatus are required
    if (!messageSid || !messageStatus) {
      logError('Validation', new Error('Missing MessageSid or MessageStatus'));
      return new Response(
        JSON.stringify({ error: 'Missing required fields: MessageSid, MessageStatus' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!VALID_TWILIO_STATUSES.has(messageStatus)) {
      logError('Validation', new Error(`Invalid MessageStatus: ${messageStatus}`));
      return new Response(JSON.stringify({ error: `Invalid MessageStatus: ${messageStatus}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -----------------------------------------------------------------------
    // 2. Authenticate the request
    // -----------------------------------------------------------------------
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
    const webhookSecret = Deno.env.get('TWILIO_WEBHOOK_SECRET') || '';

    if (twilioAuthToken) {
      // Primary: validate Twilio signature using HMAC-SHA1
      const twilioSignature = req.headers.get('X-Twilio-Signature') || '';
      if (!twilioSignature) {
        logError('Auth', new Error('Missing X-Twilio-Signature header'));
        return new Response(JSON.stringify({ error: 'Missing Twilio signature' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Reconstruct the webhook URL from the request
      const webhookUrl =
        Deno.env.get('TWILIO_STATUS_CALLBACK_URL') || new URL(req.url).toString().split('?')[0];

      const isValid = await validateTwilioSignature(
        twilioAuthToken,
        twilioSignature,
        webhookUrl,
        params,
      );

      if (!isValid) {
        logError('Auth', new Error('Invalid Twilio signature'));
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      logStep('Twilio signature validated');
    } else if (webhookSecret) {
      // Fallback: shared secret header
      const providedSecret = req.headers.get('x-webhook-secret') || '';
      if (providedSecret !== webhookSecret) {
        logError('Auth', new Error('Invalid webhook secret'));
        return new Response(JSON.stringify({ error: 'Invalid webhook secret' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      logStep('Webhook secret validated');
    } else {
      // No auth configured — reject for safety
      logError(
        'Auth',
        new Error('No auth method configured (TWILIO_AUTH_TOKEN or TWILIO_WEBHOOK_SECRET)'),
      );
      return new Response(JSON.stringify({ error: 'Webhook authentication not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // -----------------------------------------------------------------------
    // 3. Update notification_logs
    // -----------------------------------------------------------------------
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const mappedStatus = mapTwilioStatus(messageStatus);
    const isTerminalFailure = messageStatus === 'failed' || messageStatus === 'undelivered';
    const isDelivered = messageStatus === 'delivered';
    const nowIso = new Date().toISOString();

    // Build the status metadata to merge into the data JSONB column
    const statusMetadata: Record<string, unknown> = {
      twilio_status: messageStatus,
      twilio_account_sid: accountSid,
      twilio_to: to,
      twilio_from: from,
      status_updated_at: nowIso,
    };

    if (errorCode) {
      statusMetadata.twilio_error_code = errorCode;
    }
    if (errorMessage) {
      statusMetadata.twilio_error_message = errorMessage;
    }

    // Build the update payload
    const updatePayload: Record<string, unknown> = {
      status: mappedStatus,
      data: statusMetadata,
    };

    if (isTerminalFailure) {
      const errorDetail = errorCode
        ? `Twilio error ${errorCode}: ${errorMessage || 'Unknown error'}`
        : `Message ${messageStatus}`;
      updatePayload.error_message = errorDetail;
      updatePayload.success = 0;
      updatePayload.failure = 1;
    }

    if (isDelivered) {
      updatePayload.success = 1;
      updatePayload.failure = 0;
      // Store delivered timestamp in data since there's no dedicated delivered_at column
      statusMetadata.delivered_at = nowIso;
      updatePayload.data = statusMetadata;
    }

    logStep('Updating notification_logs', {
      messageSid,
      messageStatus,
      mappedStatus,
      errorCode: errorCode || undefined,
    });

    const { data: updateResult, error: updateError } = await supabase
      .from('notification_logs')
      .update(updatePayload)
      .eq('external_id', messageSid)
      .select('id');

    if (updateError) {
      logError('DB update failed', updateError);
      // Still return 200 to Twilio so it doesn't retry endlessly
      return new Response(JSON.stringify({ received: true, error: 'DB update failed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rowsUpdated = updateResult?.length || 0;

    if (rowsUpdated === 0) {
      logStep('No matching notification_log found for MessageSid', { messageSid });
    } else {
      logStep('notification_logs updated', { messageSid, rowsUpdated, mappedStatus });
    }

    // Log errors for failed/undelivered messages at error level
    if (isTerminalFailure) {
      logError(
        'SMS delivery failed',
        new Error(
          `MessageSid=${messageSid} Status=${messageStatus} ErrorCode=${errorCode} ErrorMessage=${errorMessage} To=${to}`,
        ),
      );
    }

    // -----------------------------------------------------------------------
    // 4. Return 200 OK (Twilio expects this)
    // -----------------------------------------------------------------------
    return new Response(
      JSON.stringify({
        received: true,
        messageSid,
        status: mappedStatus,
        rowsUpdated,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    logError('Unhandled error', error);
    // Return 200 even on unexpected errors to prevent Twilio retry storms
    return new Response(
      JSON.stringify({
        received: true,
        error: error instanceof Error ? error.message : 'Internal error',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
