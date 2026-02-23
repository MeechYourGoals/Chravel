/**
 * execute-concierge-tool
 *
 * Server-side bridge for Gemini Live voice tool calls.
 *
 * When the voice client receives a `toolCall` event from the Gemini Live
 * WebSocket, it cannot execute tools directly (no API keys on the client).
 * This endpoint accepts an authenticated POST with { toolName, args, tripId },
 * runs the tool via the shared functionExecutor (same logic as lovable-concierge),
 * and returns the structured result which the client relays back to the WebSocket
 * as a `toolResponse`.
 *
 * Security:
 *  - Requires valid Supabase JWT (Authorization: Bearer <token>)
 *  - Uses the authenticated client so Supabase RLS applies to all DB writes
 *  - Google API calls happen server-side (keys never reach the browser)
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { executeFunctionCall } from '../_shared/functionExecutor.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ── Auth ───────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use the caller's JWT so Supabase RLS applies to DB operations.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Parse body ─────────────────────────────────────────────────────────
    let body: { toolName?: unknown; args?: unknown; tripId?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { toolName, args, tripId } = body;

    if (typeof toolName !== 'string' || !toolName) {
      return new Response(JSON.stringify({ error: 'toolName (string) is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tripIdStr = typeof tripId === 'string' ? tripId : '';
    const argsObj: Record<string, unknown> =
      args !== null && typeof args === 'object' && !Array.isArray(args)
        ? (args as Record<string, unknown>)
        : {};

    // ── Execute ────────────────────────────────────────────────────────────
    const result = await executeFunctionCall(
      supabase,
      toolName,
      argsObj,
      tripIdStr,
      user.id,
      null, // locationContext — voice doesn't pass lat/lng here
    );

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[execute-concierge-tool] Unhandled error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
