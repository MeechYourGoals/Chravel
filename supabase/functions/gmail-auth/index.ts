import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

// ── Config: fail fast if required secrets are missing ──
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';

// Redirect URI: explicit per environment. No silent localhost fallback in production.
// Set GOOGLE_REDIRECT_URI in Supabase Edge Function secrets for production.
// Local dev: defaults to localhost:5173 only if GOOGLE_REDIRECT_URI is not set.
const REDIRECT_URI =
  Deno.env.get('GOOGLE_REDIRECT_URI') || 'http://localhost:5173/api/gmail/oauth/callback';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Return a JSON error response with consistent structure */
function errorResponse(message: string, status: number, detail?: string): Response {
  console.error(`[gmail-auth] ${message}`, detail ? `| ${detail}` : '');
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Validate that all required Google OAuth secrets are configured */
function validateGoogleConfig(): string | null {
  if (!GOOGLE_CLIENT_ID) {
    return 'GOOGLE_CLIENT_ID secret is not set. Configure it in Supabase Edge Function secrets.';
  }
  if (!GOOGLE_CLIENT_SECRET) {
    return 'GOOGLE_CLIENT_SECRET secret is not set. Configure it in Supabase Edge Function secrets.';
  }
  return null;
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Fail fast: check Google OAuth config before doing any work
    const configError = validateGoogleConfig();
    if (configError) {
      return errorResponse(configError, 503);
    }

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop(); // connect, callback, disconnect

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    // ── CONNECT: initiate Google OAuth flow ──
    if (action === 'connect') {
      // Generate cryptographic state parameter
      const stateBuffer = new Uint8Array(32);
      crypto.getRandomValues(stateBuffer);
      const stateHex = Array.from(stateBuffer)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const statePayload = JSON.stringify({ uid: user.id, nonce: stateHex });
      const encodedState = btoa(statePayload);

      // Build Google OAuth URL
      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      oauthUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set(
        'scope',
        'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email',
      );
      oauthUrl.searchParams.set('access_type', 'offline');
      oauthUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
      oauthUrl.searchParams.set('state', encodedState);

      console.log(
        `[gmail-auth] Connect initiated for user ${user.id}, redirect_uri=${REDIRECT_URI}`,
      );

      return new Response(JSON.stringify({ url: oauthUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── CALLBACK: exchange code for tokens ──
    if (action === 'callback') {
      const { code, state } = await req.json();

      if (!code || !state) {
        return errorResponse('Missing code or state', 400);
      }

      // Verify state parameter
      try {
        const decodedState = JSON.parse(atob(state));
        if (decodedState.uid !== user.id) {
          throw new Error('State UID mismatch');
        }
      } catch {
        return errorResponse('Invalid state parameter', 403);
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        return errorResponse('Token exchange failed', 500, errorText);
      }

      const tokenData = await tokenResponse.json();

      // Fetch Google user info
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userInfoResponse.ok) {
        return errorResponse('Failed to fetch Google user info', 500);
      }

      const userInfo = await userInfoResponse.json();

      // Save to database using service role (bypasses RLS for token columns)
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const adminClient = createClient(supabaseUrl, serviceRoleKey);

      // Compute token expiry with a 60s safety buffer
      const tokenExpiresAt = tokenData.expires_in
        ? new Date(Date.now() + (tokenData.expires_in - 60) * 1000).toISOString()
        : null;

      const { error: dbError } = await adminClient.from('gmail_accounts').upsert(
        {
          user_id: user.id,
          google_user_id: userInfo.id,
          email: userInfo.email,
          refresh_token: tokenData.refresh_token,
          access_token: tokenData.access_token,
          scopes: tokenData.scope ? tokenData.scope.split(' ') : [],
          ...(tokenExpiresAt && { token_expires_at: tokenExpiresAt }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, google_user_id' },
      );

      if (dbError) {
        // Detect missing table (migration not applied)
        if (dbError.code === '42P01' || dbError.message?.includes('gmail_accounts')) {
          return errorResponse(
            'Gmail integration tables not found. The smart_import migration must be applied to the database.',
            503,
            dbError.message,
          );
        }
        return errorResponse('Failed to save account', 500, dbError.message);
      }

      console.log(`[gmail-auth] Successfully connected ${userInfo.email} for user ${user.id}`);
      return new Response(JSON.stringify({ success: true, email: userInfo.email }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── DISCONNECT: revoke tokens and remove account ──
    if (action === 'disconnect') {
      const { accountId } = await req.json();

      if (!accountId) {
        return errorResponse('Missing accountId', 400);
      }

      // Use service role to read token-bearing columns (frontend RLS blocks these)
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const adminClient = createClient(supabaseUrl, serviceRoleKey);

      // Fetch tokens — service role reads, but verify ownership via user_id
      const { data: account, error: fetchError } = await adminClient
        .from('gmail_accounts')
        .select('refresh_token, access_token')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !account) {
        return errorResponse('Account not found', 404);
      }

      // Revoke token from Google (best effort — don't fail if revocation errors)
      const tokenToRevoke = account.refresh_token || account.access_token;
      if (tokenToRevoke) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenToRevoke}`, {
            method: 'POST',
            headers: { 'Content-type': 'application/x-www-form-urlencoded' },
          });
        } catch (revokeErr) {
          console.warn(
            '[gmail-auth] Token revocation failed (proceeding with deletion):',
            revokeErr,
          );
        }
      }

      // Delete from database — use user-scoped client so RLS enforces ownership
      const { error: deleteError } = await supabaseClient
        .from('gmail_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (deleteError) {
        return errorResponse('Failed to delete account', 500, deleteError.message);
      }

      console.log(`[gmail-auth] Disconnected account ${accountId} for user ${user.id}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return errorResponse('Not found', 404);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[gmail-auth] Unexpected error:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
