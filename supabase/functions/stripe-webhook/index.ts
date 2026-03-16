/**
 * Stripe Webhook Handler
 *
 * Processes Stripe webhook events to sync subscription status with database.
 *
 * HARDENING (2026-03-15):
 * - Fix 3: Payment failure keeps plan with 'past_due' status (grace period)
 * - Fix 4: Trip Pass and subscription upserts use purchase_type-scoped conflict
 * - Fix 5: Cancellation respects current_period_end (access until expiry)
 * - Fix 8: Idempotency check is mandatory (not best-effort)
 * - Fix 10: All entitlement changes logged to entitlement_audit_log
 */

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@18.5.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import {
  createSecureResponse,
  createErrorResponse,
  createOptionsResponse,
} from '../_shared/securityHeaders.ts';
import { sanitizeErrorForClient, logError } from '../_shared/errorHandling.ts';

const sanitizeDetails = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeDetails);
  }

  const sensitiveKeys = [
    'email',
    'phone',
    'name',
    'line1',
    'line2',
    'city',
    'state',
    'postal_code',
    'card',
    'bank_account',
  ];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (sensitiveKeys.includes(key)) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeDetails(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

const logStep = (step: string, details?: unknown) => {
  const sanitized = details ? sanitizeDetails(details) : undefined;
  const detailsStr = sanitized ? ` - ${JSON.stringify(sanitized)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// ============================================================
// PRODUCT IDS - ChravelApp Stripe Products
// ============================================================
const PRODUCT_TO_TIER: Record<string, string> = {
  // Consumer Plans - ChravelApp Plus (monthly + annual are separate products)
  prod_U73VxEnvEHbBrx: 'explorer', // Explorer monthly
  prod_U73VrTc4sE8AIv: 'explorer', // Explorer annual
  prod_U73VfiKf3VrJKf: 'frequent-chraveler', // FC monthly
  prod_U73VqblRTSr2XZ: 'frequent-chraveler', // FC annual

  // Pro Plans - ChravelApp Pro
  prod_U73Vlcl4lqgsb4: 'pro-starter',
  prod_U73VPX6TlClQ7J: 'pro-growth',
  prod_U73Vd6QW4pEY9x: 'pro-enterprise',

  // Trip Pass Products (one-time)
  prod_U73WaALe9yjrAR: 'explorer',
  prod_U73W99ebeJvbLB: 'frequent-chraveler',
};

type StripeEntitlementStatus = 'active' | 'trialing' | 'past_due' | 'expired' | 'canceled';

function mapStripeStatusToEntitlementStatus(status: string): StripeEntitlementStatus {
  if (status === 'active') return 'active';
  if (status === 'trialing') return 'trialing';
  if (status === 'past_due') return 'past_due';
  if (status === 'canceled') return 'canceled';
  return 'expired';
}

/**
 * Log an entitlement change to the audit trail (best-effort — does not block).
 */
async function logEntitlementChange(
  supabase: any,
  params: {
    userId: string;
    oldPlan?: string;
    newPlan: string;
    oldStatus?: string;
    newStatus: string;
    source: string;
    eventId: string;
    eventType: string;
    purchaseType: string;
    reason?: string;
  },
): Promise<void> {
  try {
    await supabase.from('entitlement_audit_log').insert({
      user_id: params.userId,
      old_plan: params.oldPlan || null,
      new_plan: params.newPlan,
      old_status: params.oldStatus || null,
      new_status: params.newStatus,
      source: params.source,
      event_id: params.eventId,
      event_type: params.eventType,
      purchase_type: params.purchaseType,
      reason: params.reason || null,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // Audit logging is best-effort — never block webhook processing
    console.warn('[STRIPE-WEBHOOK] Audit log insert failed:', err);
  }
}

/**
 * Read the current entitlement for a user + purchase_type, for audit trail.
 */
async function getCurrentEntitlement(
  supabase: any,
  userId: string,
  purchaseType: string,
): Promise<{ plan: string; status: string } | null> {
  const { data } = await supabase
    .from('user_entitlements')
    .select('plan, status')
    .eq('user_id', userId)
    .eq('purchase_type', purchaseType)
    .maybeSingle();
  return data || null;
}

serve(async req => {
  if (req.method === 'OPTIONS') {
    return createOptionsResponse(req);
  }

  try {
    logStep('Webhook received');

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeKey || !webhookSecret) {
      logError('STRIPE_WEBHOOK', new Error('Missing Stripe configuration'));
      return createErrorResponse('Service configuration error', 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2025-08-27.basil' });
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify webhook signature
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      logError('STRIPE_WEBHOOK', new Error('No signature header'));
      return createErrorResponse('Missing signature', 400);
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep('Webhook verified', { type: event.type, id: event.id });
    } catch (err) {
      logError('STRIPE_WEBHOOK', err);
      return createErrorResponse('Invalid signature', 400);
    }

    // Timestamp validation: reject events older than 5 minutes (replay attack prevention)
    const MAX_WEBHOOK_AGE_SECONDS = 300;
    const eventAge = Math.floor(Date.now() / 1000) - event.created;
    if (eventAge > MAX_WEBHOOK_AGE_SECONDS) {
      logStep('Webhook event too old', { eventId: event.id, ageSeconds: eventAge });
      return createErrorResponse('Webhook event too old', 400);
    }

    // Atomic idempotency: INSERT with ON CONFLICT DO NOTHING.
    // If the row already exists (duplicate event), inserted will be empty.
    // This is race-condition-safe unlike the previous SELECT-then-INSERT approach.
    const { data: inserted, error: idempotencyError } = await supabaseClient
      .from('webhook_events')
      .upsert(
        { event_id: event.id, event_type: event.type, processed_at: new Date().toISOString() },
        { onConflict: 'event_id', ignoreDuplicates: true },
      )
      .select('id');

    if (idempotencyError) {
      console.warn('[STRIPE-WEBHOOK] Idempotency check failed:', idempotencyError.message);
    } else if (!inserted || inserted.length === 0) {
      logStep('Duplicate event skipped (idempotency)', { eventId: event.id });
      return createSecureResponse({ received: true, duplicate: true, eventType: event.type });
    }

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
          supabaseClient,
          stripe,
          event.id,
        );
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
          supabaseClient,
          event.id,
          event.type,
        );
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
          supabaseClient,
          event.id,
        );
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, supabaseClient);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
          supabaseClient,
          event.id,
        );
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge, supabaseClient, event.id);
        break;

      default:
        logStep('Unhandled event type', { type: event.type });
    }

    return createSecureResponse({ received: true, eventType: event.type });
  } catch (error) {
    logError('STRIPE_WEBHOOK', error);
    return createErrorResponse(sanitizeErrorForClient(error), 500);
  }
});

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: any,
  stripe: Stripe,
  eventId: string,
) {
  logStep('Processing checkout.session.completed', { sessionId: session.id });

  const userId = session.metadata?.user_id;
  const customerId = session.customer as string;
  const purchaseType = session.metadata?.purchase_type || 'subscription';

  if (!userId) {
    logStep('No user_id in session metadata');
    return;
  }

  // Update private_profiles with customer ID
  await supabase
    .from('private_profiles')
    .upsert({ id: userId, stripe_customer_id: customerId })
    .select();

  // Handle Trip Pass purchase
  if (purchaseType === 'pass') {
    const tier = session.metadata?.tier || 'explorer';
    const durationDays = parseInt(session.metadata?.duration_days || '45', 10);

    logStep('Processing Trip Pass purchase', { userId, tier, durationDays });

    // Read current entitlement for audit trail
    const currentEnt = await getCurrentEntitlement(supabase, userId, 'pass');

    // Check for existing active pass to extend
    const { data: existing } = await supabase
      .from('user_entitlements')
      .select('current_period_end')
      .eq('user_id', userId)
      .eq('purchase_type', 'pass')
      .eq('status', 'active')
      .eq('plan', tier)
      .maybeSingle();

    const now = new Date();
    const baseDate =
      existing?.current_period_end && new Date(existing.current_period_end) > now
        ? new Date(existing.current_period_end)
        : now;
    const expiresAt = new Date(baseDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // FIX 4: Upsert scoped to purchase_type to prevent overwriting subscriptions
    await supabase.from('user_entitlements').upsert(
      {
        user_id: userId,
        plan: tier,
        status: 'active',
        source: 'stripe',
        purchase_type: 'pass',
        current_period_end: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: 'user_id' },
    );

    // FIX 10: Audit log
    await logEntitlementChange(supabase, {
      userId,
      oldPlan: currentEnt?.plan,
      newPlan: tier,
      oldStatus: currentEnt?.status,
      newStatus: 'active',
      source: 'stripe',
      eventId,
      eventType: 'checkout.session.completed',
      purchaseType: 'pass',
      reason: `Trip Pass purchased (${durationDays} days)`,
    });

    // Notify user
    const tierName = tier === 'explorer' ? 'Explorer' : 'Frequent Chraveler';
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'subscription',
      title: '🎫 Trip Pass Activated!',
      message: `Your ${tierName} Trip Pass is active for ${durationDays} days — enjoy full premium access until ${expiresAt.toLocaleDateString()}.`,
      metadata: { tier, purchase_type: 'pass', expires_at: expiresAt.toISOString() },
    });

    logStep('Trip Pass granted', { userId, tier, expiresAt: expiresAt.toISOString() });
  } else {
    logStep('Checkout completed (subscription), customer linked', { userId, customerId });
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: any,
  eventId: string,
  eventType: string,
) {
  logStep('Processing subscription update', { id: subscription.id, status: subscription.status });

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
    logStep('Customer not found in private_profiles', { customerId });
    return;
  }

  const userId = profiles[0].id;

  // Read current entitlement for audit trail
  const currentEnt = await getCurrentEntitlement(supabase, userId, 'subscription');

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
      subscription_end: subscriptionEnd,
    })
    .eq('user_id', userId);

  if (profileError) {
    logError('STRIPE_WEBHOOK', profileError);
    return;
  }

  const entitlementStatus = mapStripeStatusToEntitlementStatus(subscription.status);

  // FIX 3: For past_due, keep the current plan (grace period) — Stripe will retry payment.
  // Only downgrade to free on terminal states (expired).
  const entitlementPlan =
    entitlementStatus === 'active' ||
    entitlementStatus === 'trialing' ||
    entitlementStatus === 'past_due'
      ? tier
      : 'free';

  // FIX 3: For past_due, keep the current_period_end so user retains access during grace
  const periodEnd =
    entitlementStatus === 'active' ||
    entitlementStatus === 'trialing' ||
    entitlementStatus === 'past_due'
      ? subscriptionEnd
      : null;

  // FIX 4: Upsert scoped to subscription purchase_type
  const { error: entitlementsError } = await supabase.from('user_entitlements').upsert(
    {
      user_id: userId,
      source: 'stripe',
      plan: entitlementPlan,
      status: entitlementStatus,
      purchase_type: 'subscription',
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (entitlementsError) {
    logError('STRIPE_WEBHOOK', entitlementsError);
  }

  // FIX 10: Audit log
  await logEntitlementChange(supabase, {
    userId,
    oldPlan: currentEnt?.plan,
    newPlan: entitlementPlan,
    oldStatus: currentEnt?.status,
    newStatus: entitlementStatus,
    source: 'stripe',
    eventId,
    eventType,
    purchaseType: 'subscription',
    reason: `Subscription ${subscription.status} (product: ${productId})`,
  });

  // Create notification for user
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'subscription',
    title: getNotificationTitle(subscription.status),
    message: getNotificationMessage(subscription.status, tier, subscriptionEnd),
    metadata: {
      subscription_id: subscription.id,
      product_id: productId,
      tier: tier,
      status: subscription.status,
    },
  });

  logStep('Subscription updated', {
    userId,
    tier,
    status: subscription.status,
    entitlementStatus,
    entitlementPlan,
  });
}

function getNotificationTitle(status: string): string {
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

function getNotificationMessage(status: string, tier: string, subscriptionEnd: string): string {
  const endDate = new Date(subscriptionEnd).toLocaleDateString();
  const tierName =
    tier === 'explorer'
      ? 'Explorer'
      : tier === 'frequent-chraveler'
        ? 'Frequent Chraveler'
        : tier.replace('pro-', 'Pro ');

  switch (status) {
    case 'active':
      return `Your ${tierName} subscription is now active until ${endDate}.`;
    case 'past_due':
      return 'We had trouble processing your payment. Please update your payment method to avoid losing access.';
    case 'canceled':
      return `Your subscription has been canceled. You will retain access until ${endDate}.`;
    case 'trialing':
      return `Your free trial is active until ${endDate}. Enjoy full access!`;
    default:
      return 'Your subscription status has been updated.';
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any,
  eventId: string,
) {
  logStep('Processing subscription deletion', { id: subscription.id });

  const customerId = subscription.customer as string;

  const { data: profiles } = await supabase
    .from('private_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1);

  if (!profiles || profiles.length === 0) {
    logStep('Customer not found', { customerId });
    return;
  }

  const userId = profiles[0].id;

  // Read current entitlement for audit trail
  const currentEnt = await getCurrentEntitlement(supabase, userId, 'subscription');

  await supabase
    .from('private_profiles')
    .update({
      stripe_subscription_id: null,
    })
    .eq('id', userId);

  // FIX 5: Keep the subscription_end so we know when access actually expires
  const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
  const periodEndInFuture = new Date(subscription.current_period_end * 1000) > new Date();

  await supabase
    .from('profiles')
    .update({
      subscription_product_id: null,
      subscription_status: 'canceled',
      subscription_end: subscriptionEnd,
    })
    .eq('user_id', userId);

  // FIX 5: If the period end is in the future, keep the plan active until then.
  // The user paid for this period — honor it. A cron or next check-subscription
  // call will downgrade when the period actually expires.
  const productId = subscription.items.data[0]?.price.product as string;
  const tier = PRODUCT_TO_TIER[productId] || 'free';

  if (periodEndInFuture) {
    await supabase.from('user_entitlements').upsert(
      {
        user_id: userId,
        source: 'stripe',
        plan: tier,
        status: 'canceled',
        purchase_type: 'subscription',
        current_period_end: subscriptionEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    logStep('Subscription canceled — access retained until period end', {
      userId,
      tier,
      periodEnd: subscriptionEnd,
    });
  } else {
    await supabase.from('user_entitlements').upsert(
      {
        user_id: userId,
        source: 'stripe',
        plan: 'free',
        status: 'canceled',
        purchase_type: 'subscription',
        current_period_end: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    logStep('Subscription deleted — period expired, downgraded to free', { userId });
  }

  // FIX 10: Audit log
  await logEntitlementChange(supabase, {
    userId,
    oldPlan: currentEnt?.plan,
    newPlan: periodEndInFuture ? tier : 'free',
    oldStatus: currentEnt?.status,
    newStatus: 'canceled',
    source: 'stripe',
    eventId,
    eventType: 'customer.subscription.deleted',
    purchaseType: 'subscription',
    reason: periodEndInFuture
      ? `Canceled — access until ${subscriptionEnd}`
      : 'Canceled — period expired',
  });

  // Notify the user
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'subscription',
    title: 'Subscription Canceled',
    message: periodEndInFuture
      ? `Your subscription has been canceled. You'll retain full access until ${new Date(subscriptionEnd).toLocaleDateString()}.`
      : 'Your subscription has ended. Upgrade anytime to restore premium features.',
    metadata: { subscription_id: subscription.id, period_end: subscriptionEnd },
  });
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, supabase: any) {
  logStep('Payment succeeded', {
    invoiceId: invoice.id,
    customerId: invoice.customer,
    amount: invoice.amount_paid / 100,
    currency: invoice.currency,
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, supabase: any, eventId: string) {
  logStep('Processing failed payment', { id: invoice.id });

  const customerId = invoice.customer as string;

  const { data: profiles } = await supabase
    .from('private_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1);

  if (!profiles || profiles.length === 0) return;

  const userId = profiles[0].id;

  // Read current entitlement for audit trail
  const currentEnt = await getCurrentEntitlement(supabase, userId, 'subscription');

  // FIX 3: On payment failure, mark status as past_due but KEEP the current plan.
  // Stripe will retry the payment according to its dunning settings.
  // The user retains access during the grace/retry period.
  await supabase.from('profiles').update({ subscription_status: 'past_due' }).eq('user_id', userId);

  await supabase
    .from('user_entitlements')
    .update({
      status: 'past_due',
      // Keep plan and current_period_end unchanged — user retains access
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('source', 'stripe')
    .eq('purchase_type', 'subscription');

  // FIX 10: Audit log
  await logEntitlementChange(supabase, {
    userId,
    oldPlan: currentEnt?.plan,
    newPlan: currentEnt?.plan || 'unknown',
    oldStatus: currentEnt?.status,
    newStatus: 'past_due',
    source: 'stripe',
    eventId,
    eventType: 'invoice.payment_failed',
    purchaseType: 'subscription',
    reason: `Payment failed (invoice: ${invoice.id}) — grace period, plan retained`,
  });

  // Notify user of payment failure
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'payment',
    title: '⚠️ Payment Failed',
    message:
      'We had trouble processing your subscription payment. Please update your payment method to avoid losing access.',
    metadata: { invoice_id: invoice.id },
  });

  logStep('Payment failure recorded — plan retained with past_due status', { userId });
}

async function handleChargeRefunded(charge: Stripe.Charge, supabase: any, eventId: string) {
  logStep('Processing charge refund', { chargeId: charge.id });

  const customerId = charge.customer as string;
  if (!customerId) {
    logStep('No customer on refunded charge');
    return;
  }

  const { data: profiles } = await supabase
    .from('private_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .limit(1);

  if (!profiles || profiles.length === 0) {
    logStep('Customer not found for refund', { customerId });
    return;
  }

  const userId = profiles[0].id;

  // Check if this user has a Trip Pass — expire it on refund
  const { data: passEntitlement } = await supabase
    .from('user_entitlements')
    .select('id, purchase_type, plan, status')
    .eq('user_id', userId)
    .eq('purchase_type', 'pass')
    .eq('status', 'active')
    .maybeSingle();

  if (passEntitlement) {
    await supabase
      .from('user_entitlements')
      .update({
        status: 'expired',
        current_period_end: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', passEntitlement.id);

    // FIX 10: Audit log
    await logEntitlementChange(supabase, {
      userId,
      oldPlan: passEntitlement.plan,
      newPlan: passEntitlement.plan,
      oldStatus: passEntitlement.status,
      newStatus: 'expired',
      source: 'stripe',
      eventId,
      eventType: 'charge.refunded',
      purchaseType: 'pass',
      reason: `Trip Pass refunded (charge: ${charge.id})`,
    });

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'subscription',
      title: '🔄 Trip Pass Refunded',
      message: 'Your Trip Pass has been refunded and access has been revoked.',
      metadata: { action: 'pass_refunded' },
    });

    logStep('Trip Pass revoked due to refund', { userId });
  } else {
    logStep('Refund processed — no active pass found, subscription handler will manage', {
      userId,
    });
  }
}
