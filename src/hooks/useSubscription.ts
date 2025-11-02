import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface Subscription {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'trial';
}

/**
 * Hook to manage user subscription status
 * Currently returns mock data - integrate with Stripe or Supabase subscriptions
 */
export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock subscription data - replace with actual API call
    if (user) {
      setSubscription({
        plan: 'free',
        status: 'active'
      });
    } else {
      setSubscription(null);
    }
    setLoading(false);
  }, [user]);

  return {
    subscription,
    loading,
    isPro: subscription?.plan === 'pro' || subscription?.plan === 'enterprise',
    isActive: subscription?.status === 'active' || subscription?.status === 'trial'
  };
}
