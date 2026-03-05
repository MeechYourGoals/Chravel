import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') || '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') || '';
const REDIRECT_URI = Deno.env.get('GOOGLE_REDIRECT_URI') || 'http://localhost:8080/api/gmail/oauth/callback'; // Configure in prod to point to this edge function or a frontend route

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop(); // connect, callback, disconnect

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'connect') {
      // 1. Generate state parameter
      const stateBuffer = new Uint8Array(32);
      crypto.getRandomValues(stateBuffer);
      const stateHex = Array.from(stateBuffer).map(b => b.toString(16).padStart(2, '0')).join('');

      const statePayload = JSON.stringify({ uid: user.id, nonce: stateHex });
      const encodedState = btoa(statePayload);

      // 2. Build Google OAuth URL
      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      oauthUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      oauthUrl.searchParams.set('response_type', 'code');
      oauthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email');
      oauthUrl.searchParams.set('access_type', 'offline');
      oauthUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
      oauthUrl.searchParams.set('state', encodedState);

      return new Response(JSON.stringify({ url: oauthUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'callback') {
      const { code, state } = await req.json();

      if (!code || !state) {
        return new Response(JSON.stringify({ error: 'Missing code or state' }), { status: 400, headers: corsHeaders });
      }

      // 1. Verify State
      try {
        const decodedState = JSON.parse(atob(state));
        if (decodedState.uid !== user.id) {
          throw new Error('State UID mismatch');
        }
      } catch (e) {
        return new Response(JSON.stringify({ error: 'Invalid state parameter' }), { status: 403, headers: corsHeaders });
      }

      // 2. Exchange code for tokens
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
        console.error('Token exchange failed:', errorText);
        return new Response(JSON.stringify({ error: 'Token exchange failed' }), { status: 500, headers: corsHeaders });
      }

      const tokenData = await tokenResponse.json();

      // 3. Get user info (email, google id)
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userInfo = await userInfoResponse.json();

      // 4. Save to database
      // Using service role client to bypass RLS for upserting secure tokens, though user is authenticated
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      const adminClient = createClient(supabaseUrl, serviceRoleKey);

      const { error: dbError } = await adminClient
        .from('gmail_accounts')
        .upsert({
          user_id: user.id,
          google_user_id: userInfo.id,
          email: userInfo.email,
          refresh_token: tokenData.refresh_token, // Only provided on first consent or if prompt=consent
          access_token_hash: tokenData.access_token, // In a real app, encrypt this. We use simple storage for now.
          scopes: tokenData.scope ? tokenData.scope.split(' ') : [],
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id, google_user_id' });

      if (dbError) {
        console.error('Database error:', dbError);
        return new Response(JSON.stringify({ error: 'Failed to save account' }), { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, email: userInfo.email }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'disconnect') {
        const { accountId } = await req.json();

        if (!accountId) {
             return new Response(JSON.stringify({ error: 'Missing accountId' }), { status: 400, headers: corsHeaders });
        }

        // 1. Get token to revoke
        const { data: account, error: fetchError } = await supabaseClient
            .from('gmail_accounts')
            .select('refresh_token, access_token_hash')
            .eq('id', accountId)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !account) {
            return new Response(JSON.stringify({ error: 'Account not found' }), { status: 404, headers: corsHeaders });
        }

        // 2. Revoke from Google
        const tokenToRevoke = account.refresh_token || account.access_token_hash;
        if (tokenToRevoke) {
            await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenToRevoke}`, {
                method: 'POST',
                headers: { 'Content-type': 'application/x-www-form-urlencoded' }
            });
        }

        // 3. Delete from database
        const { error: deleteError } = await supabaseClient
            .from('gmail_accounts')
            .delete()
            .eq('id', accountId)
            .eq('user_id', user.id);

        if (deleteError) {
             return new Response(JSON.stringify({ error: 'Failed to delete account' }), { status: 500, headers: corsHeaders });
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
