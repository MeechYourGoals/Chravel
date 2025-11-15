/**
 * Organization Billing Portal
 * 
 * Creates a Stripe Customer Portal session for organization billing management.
 * Allows organization admins to manage subscription, payment methods, and view invoices.
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createSecureResponse, createErrorResponse, createOptionsResponse } from "../_shared/securityHeaders.ts";
import { sanitizeErrorForClient, logError } from "../_shared/errorHandling.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ORG-BILLING-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return createOptionsResponse();
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return createErrorResponse('Service configuration error', 500);
    }
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createErrorResponse('Authentication required', 401);
    }
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return createErrorResponse('Unauthorized', 401);
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Get organization ID from request body
    const { organizationId } = await req.json();
    if (!organizationId) {
      return createErrorResponse('Organization ID required', 400);
    }

    // Verify user is an admin of the organization
    const { data: membership, error: membershipError } = await supabaseClient
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (membershipError || !membership || !['owner', 'admin'].includes(membership.role)) {
      logStep("User not authorized for organization", { organizationId, userId: user.id });
      return createErrorResponse('Unauthorized - admin access required', 403);
    }
    logStep("Admin access verified", { organizationId, role: membership.role });

    // Get organization billing info
    const { data: billing, error: billingError } = await supabaseClient
      .from('organization_billing')
      .select('stripe_customer_id, billing_email')
      .eq('organization_id', organizationId)
      .single();

    if (billingError || !billing?.stripe_customer_id) {
      logStep("No Stripe customer found for organization", { organizationId });
      return createErrorResponse('Organization billing not set up', 404);
    }
    logStep("Found Stripe customer", { customerId: billing.stripe_customer_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://chravel.app";
    
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${origin}/settings/organization/billing`,
    });
    logStep("Portal session created", { sessionId: portalSession.id, url: portalSession.url });

    return createSecureResponse({ url: portalSession.url });
  } catch (error) {
    logError('ORG_BILLING_PORTAL', error);
    return createErrorResponse(sanitizeErrorForClient(error), 500);
  }
});
