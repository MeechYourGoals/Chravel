/**
 * Stripe Checkout Session Creator
 *
 * Creates Stripe checkout sessions for subscription plans.
 * Environment: Configured via STRIPE_SECRET_KEY env var
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import {
  createSecureResponse,
  createErrorResponse,
  createOptionsResponse,
} from '../_shared/securityHeaders.ts';

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// ============================================================
// PRICE IDS - UPDATE THESE AFTER CREATING PRODUCTS IN STRIPE
// ============================================================
const PRICE_IDS: Record<string, string> = {
  // Consumer Plans - ChravelApp Plus
  'explorer-monthly': 'price_1SemRq3EeswiMlDC9yP0Dh5G',
  'explorer-annual': 'price_1SemRq3EeswiMlDCi0syvI3f',
  'frequent-chraveler-monthly': 'price_1SemV13EeswiMlDC2ykNdrif',
  'frequent-chraveler-annual': 'price_1SemV13EeswiMlDC2P2126NY',

  // Pro Plans - ChravelApp Pro
  'pro-starter': 'price_1SemXF3EeswiMlDCL1Unj0Er',
  'pro-growth': 'price_1SemYw3EeswiMlDCv27XvDMY',
  'pro-enterprise': 'price_1Semar3EeswiMlDCmEPBAvIt',

  // Trip Passes (one-time)
  'pass-explorer-45': 'price_1Sz6A53EeswiMlDCF51s1XOi',
  'pass-frequent-90': 'price_1Sz6A63EeswiMlDCGFASMBft',
};

// Duration mapping for Trip Passes
const PASS_DURATION_DAYS: Record<string, number> = {
  'pass-explorer-45': 45,
  'pass-frequent-90': 90,
};

// Tier mapping for Trip Passes
const PASS_TIER: Record<string, string> = {
  'pass-explorer-45': 'explorer',
  'pass-frequent-90': 'frequent-chraveler',
};

serve(async req => {
  if (req.method === 'OPTIONS') {
    return createOptionsResponse(req);
  }

  try {
    logStep('Function started');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY is not set');
    logStep('Stripe key verified');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');

    const token = authHeader.replace('Bearer ', '');
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error('User not authenticated or email not available');
    logStep('User authenticated', { userId: user.id });

    // Parse request
    const { tier, billing_cycle = 'monthly', purchase_type = 'subscription' } = await req.json();
    logStep('Request parsed', { tier, billing_cycle, purchase_type });

    const isPass = purchase_type === 'pass';

    // Build price ID key
    let priceIdKey: string;
    if (isPass) {
      // Trip Pass: tier is already the pass key like 'pass-explorer-45'
      priceIdKey = tier;
    } else {
      // Subscription: normalize tier
      const normalizedTier = tier.replace('consumer-', '');
      logStep('Normalized tier', { original: tier, normalized: normalizedTier });

      if (normalizedTier === 'explorer' || normalizedTier === 'frequent-chraveler') {
        priceIdKey = `${normalizedTier}-${billing_cycle}`;
      } else if (normalizedTier.startsWith('pro-')) {
        priceIdKey = normalizedTier;
      } else {
        throw new Error(`Invalid tier: ${tier}`);
      }
    }

    const priceId = PRICE_IDS[priceIdKey];
    if (!priceId || priceId.startsWith('PLACEHOLDER')) {
      throw new Error(
        `Price ID not configured for: ${priceIdKey}. Please update Stripe configuration.`,
      );
    }
    logStep('Price ID resolved', { priceIdKey, priceId });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;

    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep('Existing customer found', { customerId });
    } else {
      logStep('No existing customer, will create during checkout');
    }

    // Create checkout session
    const origin = req.headers.get('origin') || 'https://chravel.app';

    const sessionParams: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: isPass ? 'payment' : 'subscription',
      success_url: `${origin}/settings?checkout=success&tier=${isPass ? PASS_TIER[priceIdKey] || tier : tier}&purchase_type=${purchase_type}`,
      cancel_url: `${origin}/settings?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        tier: isPass ? PASS_TIER[priceIdKey] || tier : tier,
        billing_cycle: isPass ? 'one-time' : billing_cycle,
        purchase_type: purchase_type,
        duration_days: isPass ? String(PASS_DURATION_DAYS[priceIdKey] || 0) : '0',
      },
    };

    // Only add subscription_data for subscriptions
    if (!isPass) {
      sessionParams.subscription_data = {
        metadata: {
          user_id: user.id,
          tier: tier,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    logStep('Checkout session created', { sessionId: session.id, url: session.url });

    return createSecureResponse({ url: session.url });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR in create-checkout', { message: errorMessage });
    return createErrorResponse(errorMessage, 500);
  }
});
