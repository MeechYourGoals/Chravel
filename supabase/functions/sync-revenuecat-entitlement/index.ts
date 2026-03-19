import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createMissingSecretResponse } from '../_shared/validateSecrets.ts';
import {
  deriveRevenueCatEntitlementState,
  fetchRevenueCatSubscriber,
  resolveRevenueCatServerApiKey,
} from './revenuecat.ts';

serve(async req => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with user's token
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error('[sync-rc] Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let revenueCatApiKey: string;
    try {
      revenueCatApiKey = resolveRevenueCatServerApiKey();
    } catch (secretError) {
      return createMissingSecretResponse(secretError, corsHeaders);
    }

    console.log('[sync-rc] Syncing entitlements for user:', user.id);

    const subscriber = await fetchRevenueCatSubscriber(fetch, revenueCatApiKey, user.id);
    const { plan, status, currentPeriodEnd, entitlementIds, revenueCatCustomerId } =
      deriveRevenueCatEntitlementState(subscriber);

    console.log('[sync-rc] Active entitlements:', entitlementIds);
    console.log(
      '[sync-rc] RevenueCat customer resolved:',
      revenueCatCustomerId ?? 'subscriber_not_found',
    );

    // Use service role client to upsert (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Idempotency guard: skip DB write when nothing has changed.
    // RevenueCat sync is user-triggered and may fire repeatedly with identical state.
    const { data: existing } = await serviceClient
      .from('user_entitlements')
      .select('plan, status, current_period_end')
      .eq('user_id', user.id)
      .eq('source', 'revenuecat')
      .maybeSingle();

    const normalizedPeriodEnd = currentPeriodEnd ? new Date(currentPeriodEnd).toISOString() : null;
    const existingPeriodEnd = existing?.current_period_end
      ? new Date(existing.current_period_end).toISOString()
      : null;

    if (
      existing &&
      existing.plan === plan &&
      existing.status === status &&
      existingPeriodEnd === normalizedPeriodEnd
    ) {
      console.log('[sync-rc] No change detected — skipping DB write');
      return new Response(
        JSON.stringify({
          success: true,
          synced: false,
          reason: 'no_change',
          plan,
          status,
          currentPeriodEnd,
          entitlements: entitlementIds,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { error: upsertError } = await serviceClient.from('user_entitlements').upsert(
      {
        user_id: user.id,
        source: 'revenuecat',
        plan,
        status,
        purchase_type: 'subscription',
        current_period_end: currentPeriodEnd,
        entitlements: entitlementIds,
        revenuecat_customer_id: revenueCatCustomerId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      },
    );

    if (upsertError) {
      console.error('[sync-rc] Upsert error:', upsertError);
      return new Response(JSON.stringify({ error: 'Failed to sync entitlements' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[sync-rc] Successfully synced:', { plan, status, entitlements: entitlementIds });

    return new Response(
      JSON.stringify({
        success: true,
        synced: true,
        plan,
        status,
        currentPeriodEnd,
        entitlements: entitlementIds,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    console.error('[sync-rc] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
