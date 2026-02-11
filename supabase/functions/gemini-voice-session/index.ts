import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ALLOWED_PLANS = new Set([
  'frequent-chraveler',
  'pro-starter',
  'pro-growth',
  'pro-enterprise',
]);

const ACTIVE_STATUSES = new Set(['active', 'trialing', 'trial']);

// Stripe product IDs used by this repo's billing config.
// Keep this list in sync with src/billing/config.ts and Stripe webhook mappings.
const ALLOWED_STRIPE_PRODUCT_IDS = new Set([
  'prod_Tc0WEzRDTCkfPM', // frequent-chraveler
  'prod_Tc0YVR1N0fmtDG', // pro-starter
  'prod_Tc0afc0pIUt87D', // pro-growth
  'prod_Tc0cJshKNpvxV0', // pro-enterprise
]);

const DEFAULT_SUPER_ADMIN_EMAILS = [
  'ccamechi@gmail.com',
  'demetriusmills8@gmail.com',
  'meech@chravel.com',
];
const GEMINI_EPHEMERAL_ENDPOINT = 'https://generativelanguage.googleapis.com/v1alpha/auth_tokens';
const DEFAULT_TOKEN_USES = 1;
const DEFAULT_TOKEN_EXPIRE_MINUTES = 30;
const DEFAULT_NEW_SESSION_EXPIRE_SECONDS = 60;

function parseSuperAdminAllowlist(): Set<string> {
  const envList = (Deno.env.get('SUPER_ADMIN_EMAILS') ?? '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

  return new Set([...DEFAULT_SUPER_ADMIN_EMAILS, ...envList]);
}

function isEligibleFromLegacyProfile(
  subscriptionStatus?: string | null,
  subscriptionProductId?: string | null,
): boolean {
  if (!subscriptionStatus || !ACTIVE_STATUSES.has(subscriptionStatus)) {
    return false;
  }

  const rawProductId = (subscriptionProductId ?? '').trim();
  const productKey = rawProductId.toLowerCase();
  if (!productKey) {
    return false;
  }

  if (ALLOWED_STRIPE_PRODUCT_IDS.has(rawProductId)) {
    return true;
  }

  return ['frequent', 'pro-starter', 'pro-growth', 'pro-enterprise', 'consumer-frequent'].some(
    flag => productKey.includes(flag),
  );
}

function readBoundedIntEnv(envKey: string, fallback: number, min: number, max: number): number {
  const rawValue = Deno.env.get(envKey);
  if (!rawValue) return fallback;

  const parsed = Number.parseInt(rawValue, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

interface GeminiAuthTokenResponse {
  name?: string;
  expireTime?: string;
  newSessionExpireTime?: string;
}

async function createGeminiEphemeralToken(geminiApiKey: string) {
  const expiresInMinutes = readBoundedIntEnv(
    'GEMINI_EPHEMERAL_EXPIRE_MINUTES',
    DEFAULT_TOKEN_EXPIRE_MINUTES,
    1,
    1200,
  );
  const newSessionExpiresInSeconds = readBoundedIntEnv(
    'GEMINI_EPHEMERAL_NEW_SESSION_EXPIRE_SECONDS',
    DEFAULT_NEW_SESSION_EXPIRE_SECONDS,
    10,
    600,
  );
  const uses = readBoundedIntEnv('GEMINI_EPHEMERAL_USES', DEFAULT_TOKEN_USES, 1, 10);

  const nowMs = Date.now();
  const requestedExpireTime = new Date(nowMs + expiresInMinutes * 60 * 1000).toISOString();
  const requestedNewSessionExpireTime = new Date(
    nowMs + newSessionExpiresInSeconds * 1000,
  ).toISOString();

  const response = await fetch(
    `${GEMINI_EPHEMERAL_ENDPOINT}?key=${encodeURIComponent(geminiApiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uses,
        expireTime: requestedExpireTime,
        newSessionExpireTime: requestedNewSessionExpireTime,
      }),
    },
  );

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(
      `Token provisioning failed (${response.status}): ${responseText.slice(0, 500)}`,
    );
  }

  const payload = (await response.json()) as GeminiAuthTokenResponse;
  const tokenName = typeof payload?.name === 'string' ? payload.name.trim() : '';
  if (!tokenName.startsWith('auth_tokens/')) {
    throw new Error('Token provisioning succeeded but returned an invalid token name');
  }

  return {
    tokenName,
    expireTime: payload.expireTime ?? requestedExpireTime,
    newSessionExpireTime: payload.newSessionExpireTime ?? requestedNewSessionExpireTime,
    uses,
  };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = authHeader.replace('Bearer ', '').trim();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    const user = userData?.user;

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'UNAUTHORIZED' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [{ data: entitlements }, { data: profile }] = await Promise.all([
      supabase
        .from('user_entitlements')
        .select('plan, status')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('email, app_role, subscription_status, subscription_product_id')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    const email = (profile?.email ?? user.email ?? '').toLowerCase();
    const appRole = (profile?.app_role ?? '').toLowerCase();
    const superAdminAllowlist = parseSuperAdminAllowlist();
    const isSuperAdmin =
      Boolean(email && superAdminAllowlist.has(email)) ||
      appRole === 'super_admin' ||
      appRole === 'enterprise_admin';

    const plan = entitlements?.plan ?? 'free';
    const status = entitlements?.status ?? 'active';
    const hasPlanAccess = ALLOWED_PLANS.has(plan) && ACTIVE_STATUSES.has(status);
    const hasLegacyProfileAccess = isEligibleFromLegacyProfile(
      profile?.subscription_status,
      profile?.subscription_product_id,
    );

    if (!isSuperAdmin && !hasPlanAccess && !hasLegacyProfileAccess) {
      console.warn('[gemini-voice-session] Voice access denied', {
        user_id: user.id,
        entitlement_plan: plan,
        entitlement_status: status,
        legacy_subscription_status: profile?.subscription_status ?? null,
        legacy_subscription_product_id: profile?.subscription_product_id ?? null,
      });
      return new Response(JSON.stringify({ error: 'VOICE_NOT_INCLUDED' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('[gemini-voice-session] Missing GEMINI_API_KEY secret');
      return new Response(JSON.stringify({ error: 'VOICE_NOT_CONFIGURED' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    try {
      const token = await createGeminiEphemeralToken(geminiApiKey);

      return new Response(
        JSON.stringify({
          access_token: token.tokenName,
          token_type: 'ephemeral',
          api_version: 'v1alpha',
          expire_time: token.expireTime,
          new_session_expire_time: token.newSessionExpireTime,
          uses: token.uses,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    } catch (tokenError) {
      console.error('[gemini-voice-session] Failed to create ephemeral token:', tokenError);
      return new Response(
        JSON.stringify({
          error: 'VOICE_TOKEN_CREATION_FAILED',
          message: 'Unable to start secure voice session right now. Please try again.',
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }
  } catch (error) {
    console.error('[gemini-voice-session] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'INTERNAL_SERVER_ERROR' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
