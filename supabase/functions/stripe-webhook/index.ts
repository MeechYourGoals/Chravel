/**
 * Stripe Webhook Handler
 * 
 * Processes Stripe webhook events to sync subscription status with database.
 * Account: christian@chravelapp.com (TEST MODE)
 */

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { createSecureResponse, createErrorResponse, createOptionsResponse } from "../_shared/securityHeaders.ts";
import { sanitizeErrorForClient, logError } from "../_shared/errorHandling.ts";

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// ============================================================
// PRODUCT IDS - ChravelApp Stripe Products
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

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      logError('STRIPE_WEBHOOK', new Error('Missing Stripe configuration'));
      return createErrorResponse('Service configuration error', 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify webhook signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logError('STRIPE_WEBHOOK', new Error('No signature header'));
      return createErrorResponse('Missing signature', 400);
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook verified", { type: event.type, id: event.id });
    } catch (err) {
      logError('STRIPE_WEBHOOK', err);
      return createErrorResponse('Invalid signature', 400);
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabaseClient, stripe);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabaseClient);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabaseClient);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, supabaseClient);
        break;
      
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, supabaseClient);
        break;

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return createSecureResponse({ received: true, eventType: event.type });
  } catch (error) {
    logError('STRIPE_WEBHOOK', error);
    return createErrorResponse(sanitizeErrorForClient(error), 500);
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, supabase: any, stripe: Stripe) {
  logStep("Processing checkout.session.completed", { sessionId: session.id });
  
  const userId = session.metadata?.user_id;
  const customerEmail = session.customer_email;
  const customerId = session.customer as string;
  
  if (!userId) {
    logStep("No user_id in session metadata");
    return;
  }

  // Update private_profiles with customer ID
  await supabase
    .from('private_profiles')
    .upsert({ id: userId, stripe_customer_id: customerId })
    .select();

  logStep("Checkout completed, customer linked", { userId, customerId });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, supabase: any) {
  logStep("Processing subscription update", { id: subscription.id, status: subscription.status });

  const customerId = subscription.customer as string;
  const productId = subscription.items.data[0]?.price.product as string;
  const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const tier = PRODUCT_TO_TIER[productId] || 'free';

  // Find user by customer ID
  const { data: profiles } = await supabase
    .from('private_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1);

  if (!profiles || profiles.length === 0) {
    logStep("Customer not found in private_profiles", { customerId });
    return;
  }

  const userId = profiles[0].id;

  // Update private_profiles with subscription details
  await supabase
    .from('private_profiles')
    .update({
      stripe_subscription_id: subscription.id,
    })
    .eq('id', userId);

  // Update public profile with subscription status
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      subscription_product_id: productId,
      subscription_status: subscription.status,
      subscription_end: subscriptionEnd
    })
    .eq('id', userId);

  if (profileError) {
    logError('STRIPE_WEBHOOK', profileError);
    return;
  }

  // Create notification for user
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: 'subscription',
      title: getNotificationTitle(subscription.status),
      message: getNotificationMessage(subscription.status, tier, subscriptionEnd),
      metadata: {
        subscription_id: subscription.id,
        product_id: productId,
        tier: tier,
        status: subscription.status,
      }
    });

  logStep("Subscription updated", { userId, tier, status: subscription.status });
}

function getNotificationTitle(status: string): string {
  switch (status) {
    case 'active': return '✅ Subscription Activated';
    case 'past_due': return '⚠️ Payment Issue';
    case 'canceled': return 'Subscription Canceled';
    case 'trialing': return '🎉 Trial Started';
    default: return 'Subscription Updated';
  }
}

function getNotificationMessage(status: string, tier: string, subscriptionEnd: string): string {
  const endDate = new Date(subscriptionEnd).toLocaleDateString();
  const tierName = tier === 'explorer' ? 'Explorer' : 
                   tier === 'frequent-chraveler' ? 'Frequent Chraveler' : 
                   tier.replace('pro-', 'Pro ');
  
  switch (status) {
    case 'active':
      return `Your ${tierName} subscription is now active until ${endDate}.`;
    case 'past_due':
      return 'We had trouble processing your payment. Please update your payment method.';
    case 'canceled':
      return `Your subscription has been canceled and will end on ${endDate}.`;
    case 'trialing':
      return `Your free trial is active until ${endDate}. Enjoy full access!`;
    default:
      return 'Your subscription status has been updated.';
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabase: any) {
  logStep("Processing subscription deletion", { id: subscription.id });

  const customerId = subscription.customer as string;

  const { data: profiles } = await supabase
    .from('private_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1);

  if (!profiles || profiles.length === 0) {
    logStep("Customer not found", { customerId });
    return;
  }

  const userId = profiles[0].id;

  await supabase
    .from('private_profiles')
    .update({
      stripe_subscription_id: null
    })
    .eq('id', userId);

  await supabase
    .from('profiles')
    .update({
      subscription_product_id: null,
      subscription_status: 'canceled',
      subscription_end: null
    })
    .eq('id', userId);

  logStep("Subscription deleted", { userId });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, supabase: any) {
  logStep("Payment succeeded", { 
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, supabase: any) {
  logStep("Processing failed payment", { id: invoice.id });

  const customerId = invoice.customer as string;

  const { data: profiles } = await supabase
    .from('private_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1);

  if (!profiles || profiles.length === 0) return;

  const userId = profiles[0].id;

  await supabase
    .from('profiles')
    .update({ subscription_status: 'past_due' })
    .eq('id', userId);

  // Notify user of payment failure
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: 'payment',
      title: '⚠️ Payment Failed',
      message: 'We had trouble processing your subscription payment. Please update your payment method to avoid service interruption.',
      metadata: { invoice_id: invoice.id }
    });

  logStep("Payment failure recorded", { userId });
}
