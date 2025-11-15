/**
 * Stripe Webhook Handler
 * 
 * Processes Stripe webhook events to sync subscription status with database.
 * Handles: subscription updates, cancellations, payment failures, invoice payments
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

async function handleSubscriptionUpdated(subscription: Stripe.Subscription, supabase: any) {
  logStep("Processing subscription update", { id: subscription.id, status: subscription.status });

  const customerId = subscription.customer as string;
  const productId = subscription.items.data[0]?.price.product as string;
  const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

  // Get customer to find user
  const { data: customers } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .limit(1);

  if (!customers || customers.length === 0) {
    logStep("Customer not found in profiles", { customerId });
    return;
  }

  const userId = customers[0].user_id;

  // Update profile with subscription details
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_product_id: productId,
      subscription_status: subscription.status,
      subscription_end: subscriptionEnd
    })
    .eq('user_id', userId);

  if (profileError) {
    logError('STRIPE_WEBHOOK', profileError);
    return;
  }

  // Grant pro role if subscription is active
  if (subscription.status === 'active') {
    await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: 'pro' })
      .onConflict('user_id,role')
      .ignore();
  }

  // Send realtime notification to user
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type: 'subscription',
      title: getSubscriptionNotificationTitle(subscription.status),
      message: getSubscriptionNotificationMessage(subscription.status, subscriptionEnd),
      metadata: {
        subscription_id: subscription.id,
        product_id: productId,
        status: subscription.status,
        action: 'subscription_updated'
      }
    });

  logStep("Subscription updated successfully with notification", { userId, status: subscription.status });
}

function getSubscriptionNotificationTitle(status: string): string {
  switch (status) {
    case 'active':
      return '✅ Subscription Activated';
    case 'past_due':
      return '⚠️ Payment Issue';
    case 'canceled':
      return 'Subscription Canceled';
    case 'trialing':
      return '🎉 Trial Started';
    default:
      return 'Subscription Updated';
  }
}

function getSubscriptionNotificationMessage(status: string, subscriptionEnd: string): string {
  const endDate = new Date(subscriptionEnd).toLocaleDateString();
  
  switch (status) {
    case 'active':
      return `Your Chravel Pro subscription is now active until ${endDate}.`;
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

  // Get user from customer ID
  const { data: customers } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .limit(1);

  if (!customers || customers.length === 0) {
    logStep("Customer not found", { customerId });
    return;
  }

  const userId = customers[0].user_id;

  // Update profile to remove subscription
  await supabase
    .from('profiles')
    .update({
      stripe_subscription_id: null,
      subscription_product_id: null,
      subscription_status: 'canceled',
      subscription_end: null
    })
    .eq('user_id', userId);

  // Remove pro role
  await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', 'pro');

  logStep("Subscription deleted successfully", { userId });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, supabase: any) {
  logStep("Processing successful payment", { id: invoice.id });
  
  // Invoice payments are handled by subscription events
  // This is mainly for logging/analytics
  logStep("Payment succeeded", { 
    customerId: invoice.customer,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, supabase: any) {
  logStep("Processing failed payment", { id: invoice.id });

  const customerId = invoice.customer as string;

  // Get user from customer ID
  const { data: customers } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .limit(1);

  if (!customers || customers.length === 0) {
    return;
  }

  const userId = customers[0].user_id;

  // Update subscription status to past_due
  await supabase
    .from('profiles')
    .update({ subscription_status: 'past_due' })
    .eq('user_id', userId);

  logStep("Payment failure recorded", { userId });
}
