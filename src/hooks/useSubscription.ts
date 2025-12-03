import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface Subscription {
  plan: 'free' | 'explorer' | 'frequent-chraveler' | 'pro' | 'enterprise';
  status: 'active' | 'inactive' | 'trial';
  productId?: string | null;
}

/**
 * Hook to manage user subscription status
 * Checks real subscription status from Supabase profiles table
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
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_product_id')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching subscription:', error);
          // Default to free if error
          setSubscription({ plan: 'free', status: 'inactive' });
          setLoading(false);
          return;
        }

        // Determine plan from product_id
        let plan: Subscription['plan'] = 'free';
        const productId = profile?.subscription_product_id;
        
        if (profile?.subscription_status === 'active' && productId) {
          if (productId.includes('explorer')) {
            plan = 'explorer';
          } else if (productId.includes('frequent') || productId.includes('chraveler')) {
            plan = 'frequent-chraveler';
          } else if (productId.includes('enterprise')) {
            plan = 'enterprise';
          } else if (productId.includes('pro')) {
            plan = 'pro';
          } else {
            // Default paid tier if product exists
            plan = 'explorer';
          }
        }

        setSubscription({
          plan,
          status: profile?.subscription_status === 'active' ? 'active' : 'inactive',
          productId
        });
      } catch (err) {
        console.error('Subscription check error:', err);
        setSubscription({ plan: 'free', status: 'inactive' });
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user]);

  // isPro is true for any paid tier
  const isPro = subscription?.plan !== 'free' && subscription?.status === 'active';
  
  return {
    subscription,
    loading,
    isPro,
    isExplorer: subscription?.plan === 'explorer' && subscription?.status === 'active',
    isFrequentChraveler: subscription?.plan === 'frequent-chraveler' && subscription?.status === 'active',
    isEnterprise: subscription?.plan === 'enterprise' && subscription?.status === 'active',
    isActive: subscription?.status === 'active' || subscription?.status === 'trial',
    isFree: subscription?.plan === 'free' || !subscription?.status || subscription?.status === 'inactive'
  };
}
