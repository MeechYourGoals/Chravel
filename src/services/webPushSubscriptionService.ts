/**
 * Web Push Subscription Service
 *
 * Manages web push subscriptions in Supabase.
 * Used by the useWebPush hook and notification service.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface WebPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_agent: string | null;
  device_name: string | null;
  is_active: boolean;
  last_used_at: string;
  failed_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSubscriptionInput {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  userAgent?: string;
  deviceName?: string;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Save or update a web push subscription for the current user
 */
export async function saveWebPushSubscription(
  userId: string,
  input: CreateSubscriptionInput,
): Promise<WebPushSubscription | null> {
  const { data, error } = await supabase
    .from('web_push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: input.endpoint,
        p256dh_key: input.p256dhKey,
        auth_key: input.authKey,
        user_agent: input.userAgent || null,
        device_name: input.deviceName || null,
        is_active: true,
        failed_count: 0,
        last_error: null,
      },
      {
        onConflict: 'user_id,endpoint',
      },
    )
    .select()
    .single();

  if (error) {
    console.error('[WebPushSubscriptionService] Failed to save subscription:', error);
    return null;
  }

  return data;
}

/**
 * Get all active subscriptions for a user
 */
export async function getUserSubscriptions(userId: string): Promise<WebPushSubscription[]> {
  const { data, error } = await supabase
    .from('web_push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[WebPushSubscriptionService] Failed to get subscriptions:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a specific subscription by endpoint
 */
export async function getSubscriptionByEndpoint(
  userId: string,
  endpoint: string,
): Promise<WebPushSubscription | null> {
  const { data, error } = await supabase
    .from('web_push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      // Not found is ok
      console.error('[WebPushSubscriptionService] Failed to get subscription:', error);
    }
    return null;
  }

  return data;
}

/**
 * Delete a subscription by endpoint
 */
export async function deleteSubscription(userId: string, endpoint: string): Promise<boolean> {
  const { error } = await supabase
    .from('web_push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) {
    console.error('[WebPushSubscriptionService] Failed to delete subscription:', error);
    return false;
  }

  return true;
}

/**
 * Delete all subscriptions for a user
 */
export async function deleteAllUserSubscriptions(userId: string): Promise<boolean> {
  const { error } = await supabase.from('web_push_subscriptions').delete().eq('user_id', userId);

  if (error) {
    console.error('[WebPushSubscriptionService] Failed to delete all subscriptions:', error);
    return false;
  }

  return true;
}

/**
 * Deactivate a subscription (soft delete)
 */
export async function deactivateSubscription(
  userId: string,
  endpoint: string,
  reason?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('web_push_subscriptions')
    .update({
      is_active: false,
      last_error: reason || 'Deactivated by user',
    })
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) {
    console.error('[WebPushSubscriptionService] Failed to deactivate subscription:', error);
    return false;
  }

  return true;
}

/**
 * Update last_used_at timestamp
 */
export async function updateLastUsed(subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from('web_push_subscriptions')
    .update({
      last_used_at: new Date().toISOString(),
      failed_count: 0,
      last_error: null,
    })
    .eq('id', subscriptionId);

  if (error) {
    console.warn('[WebPushSubscriptionService] Failed to update last_used_at:', error);
  }
}

/**
 * Increment failure count for a subscription
 */
export async function incrementFailureCount(
  subscriptionId: string,
  errorMessage?: string,
): Promise<void> {
  // First get current count
  const { data: current } = await supabase
    .from('web_push_subscriptions')
    .select('failed_count')
    .eq('id', subscriptionId)
    .single();

  const newCount = (current?.failed_count || 0) + 1;
  const shouldDeactivate = newCount >= 3;

  const { error } = await supabase
    .from('web_push_subscriptions')
    .update({
      failed_count: newCount,
      last_error: errorMessage || 'Delivery failed',
      is_active: !shouldDeactivate,
    })
    .eq('id', subscriptionId);

  if (error) {
    console.warn('[WebPushSubscriptionService] Failed to increment failure count:', error);
  }
}

/**
 * Get subscription count for a user
 */
export async function getSubscriptionCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('web_push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  if (error) {
    console.error('[WebPushSubscriptionService] Failed to get count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Check if user has any active subscriptions
 */
export async function hasActiveSubscriptions(userId: string): Promise<boolean> {
  const count = await getSubscriptionCount(userId);
  return count > 0;
}
