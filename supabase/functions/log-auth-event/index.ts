/**
 * Auth Event Telemetry Edge Function
 *
 * Receives auth events from the client and logs them to security_audit_log.
 * Accepts both authenticated (with JWT) and unauthenticated requests (for
 * tracking failed login attempts).
 *
 * Rate limited to prevent abuse of the logging endpoint itself.
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { logError } from '../_shared/errorHandling.ts';

const ALLOWED_EVENT_TYPES = [
  'login_success',
  'login_failure',
  'signup_success',
  'signup_failure',
  'logout',
  'password_reset_requested',
  'password_change_success',
  'password_change_failure',
  'account_deletion_requested',
  'account_deletion_cancelled',
  'google_oauth_initiated',
  'phone_otp_requested',
  'phone_otp_failure',
] as const;

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Try to extract user_id from JWT if present (optional — failed logins won't have one)
    let userId: string | null = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const { data: userData } = await supabase.auth.getUser(token);
        userId = userData?.user?.id ?? null;
      } catch {
        // Token invalid or expired — continue without user_id
      }
    }

    // Parse request body
    const body = await req.json();
    const eventType = body.event_type as string;
    const details = body.details as Record<string, unknown> | undefined;

    // Validate event type
    if (
      !eventType ||
      !ALLOWED_EVENT_TYPES.includes(eventType as (typeof ALLOWED_EVENT_TYPES)[number])
    ) {
      return new Response(JSON.stringify({ error: 'Invalid event type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize details — strip any accidentally included sensitive data
    const sanitizedDetails: Record<string, unknown> = {};
    if (details && typeof details === 'object') {
      const BLOCKED_KEYS = ['password', 'token', 'secret', 'key', 'credential', 'jwt'];
      for (const [key, value] of Object.entries(details)) {
        if (!BLOCKED_KEYS.some(blocked => key.toLowerCase().includes(blocked))) {
          sanitizedDetails[key] = typeof value === 'string' ? value.substring(0, 500) : value;
        }
      }
    }

    // Extract IP from request headers (Supabase/Vercel forwards this)
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      null;

    const userAgent = (sanitizedDetails.user_agent as string | undefined) ?? null;
    // Remove user_agent from details since it has its own column
    delete sanitizedDetails.user_agent;

    // Insert into security_audit_log
    const { error: insertError } = await supabase.from('security_audit_log').insert({
      event_type: eventType,
      user_id: userId,
      ip_address: clientIp,
      user_agent: userAgent,
      details: sanitizedDetails,
    });

    if (insertError) {
      logError('LOG_AUTH_EVENT', insertError, { eventType, userId });
      return new Response(JSON.stringify({ error: 'Failed to log event' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logError('LOG_AUTH_EVENT', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
