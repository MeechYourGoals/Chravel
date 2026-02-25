import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Entitlement ID to plan mapping (must match RevenueCat dashboard)
const ENTITLEMENT_TO_PLAN: Record<string, string> = {
  chravel_explorer: 'explorer',
  chravel_frequent_chraveler: 'frequent-chraveler',
  chravel_pro_starter: 'pro-starter',
  chravel_pro_growth: 'pro-growth',
  chravel_pro_enterprise: 'pro-enterprise',
};

interface SyncRequest {
  customerInfo: {
    originalAppUserId: string;
    entitlements: {
      active: Record<
        string,
        { isActive: boolean; expirationDate: string | null; periodType?: string }
      >;
    };
    latestExpirationDate: string | null;
  };
}

serve(async req => {
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

    // Parse request body
    const body: SyncRequest = await req.json();
    const { customerInfo } = body;

    if (!customerInfo) {
      return new Response(JSON.stringify({ error: 'Missing customerInfo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[sync-rc] Syncing entitlements for user:', user.id);
    console.log(
      '[sync-rc] Active entitlements:',
      Object.keys(customerInfo.entitlements?.active || {}),
    );

    // Derive plan from entitlements
    let plan = 'free';
    let status = 'active';
    let currentPeriodEnd: string | null = null;
    const entitlementIds: string[] = [];

    const activeEntitlements = customerInfo.entitlements?.active || {};

    // Find highest tier entitlement
    for (const [entitlementId, info] of Object.entries(activeEntitlements)) {
      if (info.isActive) {
        entitlementIds.push(entitlementId);
        const mappedPlan = ENTITLEMENT_TO_PLAN[entitlementId];
        if (mappedPlan) {
          // Priority: pro-enterprise > pro-growth > pro-starter > frequent-chraveler > explorer
          const planPriority = [
            'free',
            'explorer',
            'frequent-chraveler',
            'pro-starter',
            'pro-growth',
            'pro-enterprise',
          ];
          if (planPriority.indexOf(mappedPlan) > planPriority.indexOf(plan)) {
            plan = mappedPlan;
          }
        }
        if (info.expirationDate) {
          currentPeriodEnd = info.expirationDate;
        }
        if (info.periodType === 'trial') {
          status = 'trialing';
        }
      }
    }

    // If no active entitlements, check if expired
    if (entitlementIds.length === 0 && customerInfo.latestExpirationDate) {
      const expDate = new Date(customerInfo.latestExpirationDate);
      if (expDate < new Date()) {
        status = 'expired';
      }
    }

    // Use service role client to upsert (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { error: upsertError } = await serviceClient.from('user_entitlements').upsert(
      {
        user_id: user.id,
        source: 'revenuecat',
        plan,
        status,
        current_period_end: currentPeriodEnd,
        entitlements: entitlementIds,
        revenuecat_customer_id: customerInfo.originalAppUserId,
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
