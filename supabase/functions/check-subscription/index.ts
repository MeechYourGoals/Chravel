/**
 * Stripe Subscription Checker
 * 
 * Checks user's subscription status and returns tier information.
 * Account: christian@chravelapp.com (TEST MODE)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createSecureResponse, createErrorResponse, createOptionsResponse } from "../_shared/securityHeaders.ts";
import { sanitizeErrorForClient, logError } from "../_shared/errorHandling.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// ============================================================
// PRODUCT IDS - UPDATE THESE AFTER CREATING PRODUCTS IN STRIPE
// ============================================================
const PRODUCT_TO_TIER: Record<string, string> = {
  // Consumer Plans - ChravelApp Plus
  'prod_Tc0SWNhLkoCDIi': 'explorer',
  'prod_Tc0WEzRDTCkfPM': 'frequent-chraveler',
  
  // Pro Plans - ChravelApp Pro
  'prod_Tc0YVR1N0fmtDG': 'pro-starter',
  'prod_Tc0afc0pIUt87D': 'pro-growth',
  'prod_Tc0cJshKNpvxV0': 'pro-enterprise',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createOptionsResponse();
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return createErrorResponse('Service configuration error', 500);
    }
    logStep("Stripe key verified");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse('Authentication required', 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      return createErrorResponse('Unauthorized', 401);
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Super admin bypass - return max tier without Stripe check
    const SUPER_ADMIN_EMAILS = ['ccamechi@gmail.com'];
    if (user.email && SUPER_ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      logStep("Super admin detected - bypassing Stripe check", { email: user.email });
      return createSecureResponse({
        subscribed: true,
        tier: 'pro-enterprise',
        product_id: 'super_admin_bypass',
        subscription_end: null, // Never expires
        is_super_admin: true
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return createSecureResponse({ 
        subscribed: false, 
        tier: 'free',
        product_id: null,
        subscription_end: null 
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Update private profile with stripe_customer_id
    await supabaseClient
      .from('private_profiles')
      .upsert({ id: user.id, stripe_customer_id: customerId })
      .select();

    // Check for active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    if (subscriptions.data.length === 0) {
      logStep("No active subscription");
      
      // Clear subscription info
      await supabaseClient
        .from('profiles')
        .update({ 
          subscription_product_id: null,
          subscription_status: null,
          subscription_end: null 
        })
        .eq('user_id', user.id);
        
      return createSecureResponse({
        subscribed: false,
        tier: 'free',
        product_id: null,
        subscription_end: null
      });
    }

    // Process active subscription
    const subscription = subscriptions.data[0];
    const productId = subscription.items.data[0].price.product as string;
    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
    
    // Determine tier from product ID
    const tier = PRODUCT_TO_TIER[productId] || 'free';
    logStep("Active subscription found", { 
      subscriptionId: subscription.id, 
      productId, 
      tier,
      endDate: subscriptionEnd 
    });

    // Update profile with subscription info
    await supabaseClient
      .from('profiles')
      .update({ 
        subscription_product_id: productId,
        subscription_status: subscription.status,
        subscription_end: subscriptionEnd,
      })
      .eq('user_id', user.id);

    return createSecureResponse({
      subscribed: true,
      tier: tier,
      product_id: productId,
      subscription_end: subscriptionEnd
    });
    
  } catch (error) {
    logError('CHECK_SUBSCRIPTION', error);
    return createErrorResponse(sanitizeErrorForClient(error), 500);
  }
});
