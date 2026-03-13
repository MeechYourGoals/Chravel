import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';
import { decryptToken, encryptToken } from '../_shared/gmailTokenCrypto.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
const GMAIL_TOKEN_ENCRYPTION_KEY = Deno.env.get('GMAIL_TOKEN_ENCRYPTION_KEY') ?? '';
const OAUTH_STATE_SIGNING_SECRET = Deno.env.get('OAUTH_STATE_SIGNING_SECRET') ?? '';
const REDIRECT_URI =
  Deno.env.get('GOOGLE_REDIRECT_URI') || 'http://localhost:5173/api/gmail/oauth/callback';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function errorResponse(message: string, status: number, detail?: string): Response {
  console.error(`[gmail-auth] ${message}`, detail ? `| ${detail}` : '');
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function bytesToBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

async function signState(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(OAUTH_STATE_SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)),
  );
  return bytesToBase64Url(signature);
}

async function verifyState(payload: string, signature: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(OAUTH_STATE_SIGNING_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  return await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlToBytes(signature),
    new TextEncoder().encode(payload),
  );
}

function validateGoogleConfig(): string | null {
  if (!GOOGLE_CLIENT_ID) return 'GOOGLE_CLIENT_ID secret is not set.';
  if (!GOOGLE_CLIENT_SECRET) return 'GOOGLE_CLIENT_SECRET secret is not set.';
  if (!GMAIL_TOKEN_ENCRYPTION_KEY) return 'GMAIL_TOKEN_ENCRYPTION_KEY secret is not set.';
  if (!OAUTH_STATE_SIGNING_SECRET) return 'OAUTH_STATE_SIGNING_SECRET secret is not set.';
  return null;
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const configError = validateGoogleConfig();
    if (configError) return errorResponse(configError, 503);

    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) return errorResponse('Unauthorized', 401);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (action === 'connect') {
      const nonce = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
      const payloadObj = {
        uid: user.id,
        nonce,
        exp: Date.now() + 10 * 60 * 1000,
      };
      const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payloadObj)));
      const signature = await signState(payload);

      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      oauthUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set(
        'scope',
        'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email',
      );
      oauthUrl.searchParams.set('access_type', 'offline');
      oauthUrl.searchParams.set('prompt', 'consent');
      oauthUrl.searchParams.set('state', `${payload}.${signature}`);

      return new Response(JSON.stringify({ url: oauthUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'callback') {
      const { code, state } = await req.json();
      if (!code || !state || typeof state !== 'string' || !state.includes('.')) {
        return errorResponse('Missing code or state', 400);
      }

      const [payload, signature] = state.split('.');
      const signatureValid = await verifyState(payload, signature);
      if (!signatureValid) return errorResponse('Invalid state signature', 403);

      const decodedState = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
      if (decodedState.uid !== user.id) return errorResponse('State UID mismatch', 403);
      if (Date.now() > decodedState.exp) return errorResponse('OAuth state expired', 403);

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
        return errorResponse('Token exchange failed', 500, await tokenResponse.text());
      }

      const tokenData = await tokenResponse.json();

      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userInfoResponse.ok) {
        return errorResponse('Failed to fetch Google user info', 500);
      }

      const userInfo = await userInfoResponse.json();
      const encryptedAccessToken = await encryptToken(
        tokenData.access_token,
        GMAIL_TOKEN_ENCRYPTION_KEY,
      );
      const refreshTokenRaw = tokenData.refresh_token;
      const encryptedRefreshToken = refreshTokenRaw
        ? await encryptToken(refreshTokenRaw, GMAIL_TOKEN_ENCRYPTION_KEY)
        : null;

      const { data: existing } = await adminClient
        .from('gmail_accounts')
        .select('refresh_token')
        .eq('user_id', user.id)
        .eq('google_user_id', userInfo.id)
        .maybeSingle();

      const refreshTokenToStore = encryptedRefreshToken || existing?.refresh_token || null;

      const { error: dbError } = await adminClient.from('gmail_accounts').upsert(
        {
          user_id: user.id,
          google_user_id: userInfo.id,
          email: userInfo.email,
          refresh_token: refreshTokenToStore,
          access_token: encryptedAccessToken,
          scopes: tokenData.scope ? tokenData.scope.split(' ') : [],
          token_expires_at:
            typeof tokenData.expires_in === 'number'
              ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
              : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, google_user_id' },
      );

      if (dbError) {
        if (dbError.code === '42P01' || dbError.message?.includes('gmail_accounts')) {
          return errorResponse(
            'Gmail integration tables not found. Apply smart_import migrations.',
            503,
            dbError.message,
          );
        }
        return errorResponse('Failed to save account', 500, dbError.message);
      }

      await adminClient.from('gmail_token_audit_logs').insert({
        user_id: user.id,
        gmail_account_email: userInfo.email,
        action: 'oauth_connect',
      });

      return new Response(JSON.stringify({ success: true, email: userInfo.email }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disconnect') {
      const { accountId } = await req.json();
      if (!accountId) return errorResponse('Missing accountId', 400);

      const { data: account, error: fetchError } = await adminClient
        .from('gmail_accounts')
        .select('email, refresh_token, access_token')
        .eq('id', accountId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !account) return errorResponse('Account not found', 404);

      const refreshToken = await decryptToken(account.refresh_token, GMAIL_TOKEN_ENCRYPTION_KEY);
      const accessToken = await decryptToken(account.access_token, GMAIL_TOKEN_ENCRYPTION_KEY);
      const tokenToRevoke = refreshToken || accessToken;

      if (tokenToRevoke) {
        try {
          await fetch(
            `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`,
            {
              method: 'POST',
              headers: { 'Content-type': 'application/x-www-form-urlencoded' },
            },
          );
        } catch (revokeErr) {
          console.warn(
            '[gmail-auth] Token revocation failed (proceeding with deletion):',
            revokeErr,
          );
        }
      }

      const { error: deleteError } = await supabaseClient
        .from('gmail_accounts')
        .delete()
        .eq('id', accountId)
        .eq('user_id', user.id);

      if (deleteError) return errorResponse('Failed to delete account', 500, deleteError.message);

      await adminClient.from('gmail_token_audit_logs').insert({
        user_id: user.id,
        gmail_account_email: account.email,
        action: 'oauth_disconnect',
      });

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
