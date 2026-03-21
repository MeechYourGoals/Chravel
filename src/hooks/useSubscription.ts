import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface Subscription {
  plan:
    | 'free'
    | 'explorer'
    | 'frequent-chraveler'
    | 'pro-starter'
    | 'pro-growth'
    | 'pro-enterprise';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'inactive';
  productId?: string | null;
  currentPeriodEnd?: string | null;
  purchaseType?: 'subscription' | 'pass' | null;
}

/**
 * Hook to manage user subscription status.
 *
 * Checks user_entitlements first (source of truth populated by webhooks),
 * then falls back to profiles table for legacy compatibility.
 */
export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const checkSubscription = async () => {
      try {
        // Primary: check user_entitlements table (populated by Stripe webhook / RevenueCat sync)
        const { data: entitlement, error: entError } = await supabase
          .from('user_entitlements')
          .select('plan, status, current_period_end, purchase_type, source')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!entError && entitlement && entitlement.plan !== 'free') {
          const plan = entitlement.plan as Subscription['plan'];
          const status = entitlement.status as Subscription['status'];
          const periodEnd = entitlement.current_period_end || null;

          // For canceled subscriptions, check if period end is in the future
          const isStillAccessible =
            status === 'active' ||
            status === 'trialing' ||
            status === 'past_due' ||
            (status === 'canceled' && periodEnd && new Date(periodEnd) > new Date());

          setSubscription({
            plan: isStillAccessible ? plan : 'free',
            status: isStillAccessible ? status : 'expired',
            currentPeriodEnd: periodEnd,
            purchaseType: (entitlement.purchase_type as Subscription['purchaseType']) || null,
          });
          setLoading(false);
          return;
        }

        // Fallback: check profiles table (legacy path)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_product_id, subscription_end')
          .eq('user_id', user.id)
          .single();

        if (profileError || !profile) {
          setSubscription({ plan: 'free', status: 'inactive' });
          setLoading(false);
          return;
        }

        let plan: Subscription['plan'] = 'free';
        const productId = profile.subscription_product_id;
        const subStatus = profile.subscription_status;

        const isActive =
          subStatus === 'active' || subStatus === 'trialing' || subStatus === 'past_due';

        if (isActive && productId) {
          if (productId.includes('explorer')) {
            plan = 'explorer';
          } else if (productId.includes('frequent') || productId.includes('chraveler')) {
            plan = 'frequent-chraveler';
          } else if (productId.includes('enterprise')) {
            plan = 'pro-enterprise';
          } else if (productId.includes('growth')) {
            plan = 'pro-growth';
          } else if (productId.includes('starter') || productId.includes('pro')) {
            plan = 'pro-starter';
          } else {
            plan = 'explorer';
          }
        }

        setSubscription({
          plan,
          status: isActive ? (subStatus as Subscription['status']) : 'inactive',
          productId,
          currentPeriodEnd: profile.subscription_end || null,
        });
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('Subscription check error:', err);
        }
        setSubscription({ plan: 'free', status: 'inactive' });
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user]);

  const plan = subscription?.plan ?? 'free';
  const status = subscription?.status ?? 'inactive';
  const isActive = status === 'active' || status === 'trialing' || status === 'past_due';
  const isPaidPlan = plan !== 'free';

  return {
    subscription,
    loading,
    // Convenience booleans
    isPro: isPaidPlan && isActive,
    isExplorer: plan === 'explorer' && isActive,
    isFrequentChraveler: plan === 'frequent-chraveler' && isActive,
    isProStarter: plan === 'pro-starter' && isActive,
    isProGrowth: plan === 'pro-growth' && isActive,
    isEnterprise: plan === 'pro-enterprise' && isActive,
    isActive,
    isTrialing: status === 'trialing',
    isPastDue: status === 'past_due',
    isCanceled: status === 'canceled',
    isFree: !isPaidPlan || !isActive,
  };
}
