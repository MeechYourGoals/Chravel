import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createSecureResponse, createErrorResponse, createOptionsResponse } from "../_shared/securityHeaders.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Price ID mapping - UPDATED CONSUMER STRUCTURE
const PRICE_IDS = {
  // Consumer Plans - NEW STRUCTURE
  'consumer-starter-monthly': 'price_starter_monthly_9_99',
  'consumer-starter-annual': 'price_starter_annual_99_99',
  'consumer-explorer-monthly': 'price_explorer_monthly_19_99',
  'consumer-explorer-annual': 'price_explorer_annual_199_99',
  'consumer-unlimited-monthly': 'price_unlimited_monthly_39_99',
  'consumer-unlimited-annual': 'price_unlimited_annual_399_99',
  
  // Legacy Consumer Plus (map to starter)
  'consumer-plus': 'price_1SEw5402kHnoJKm0cVP4HlOh',
  
  // Pro Plans (unchanged)
  'pro-starter': 'price_1SEw6t02kHnoJKm0OmIvxWW9',
  'pro-growing': 'price_1SEw7E02kHnoJKm0HPnZzLrj',
  'pro-enterprise': 'price_1SEw7L02kHnoJKm0o0TLldSz',
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createOptionsResponse();
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { tier, billing_cycle = 'monthly' } = await req.json();
    
    // Validate tier and construct price ID key
    let priceIdKey: string;
    if (tier.startsWith('consumer-') && !tier.includes('plus')) {
      // New consumer tiers: consumer-starter, consumer-explorer, consumer-unlimited
      priceIdKey = `${tier}-${billing_cycle}`;
    } else if (tier === 'consumer-plus') {
      // Legacy consumer plus
      priceIdKey = tier;
    } else {
      // Pro tiers don't have billing cycle in key
      priceIdKey = tier;
    }
    
    if (!PRICE_IDS[priceIdKey as keyof typeof PRICE_IDS]) {
      throw new Error(`Invalid tier/billing combination: ${tier} + ${billing_cycle}`);
    }
    const priceId = PRICE_IDS[priceIdKey as keyof typeof PRICE_IDS];
    logStep("Tier selected", { tier, billing_cycle, priceIdKey, priceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer, will create during checkout");
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}/settings?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        tier: tier,
        billing_cycle: billing_cycle || 'monthly',
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return createSecureResponse({ url: session.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return createErrorResponse(errorMessage, 500);
  }
});
