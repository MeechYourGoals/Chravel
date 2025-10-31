/**
 * Subscription Hook
 * Manages user subscription state
 */

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface Subscription {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'cancelled';
  expiresAt?: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // For now, return a default subscription
    // TODO: Fetch actual subscription from Supabase when subscription system is implemented
    if (user) {
      setSubscription({
        plan: 'free',
        status: 'active',
      });
    } else {
      setSubscription(null);
    }
    setIsLoading(false);
  }, [user]);

  return {
    subscription,
    isLoading,
  };
}
