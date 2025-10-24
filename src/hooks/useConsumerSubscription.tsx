
import { useState, useEffect, createContext, useContext } from 'react';
import { ConsumerSubscription } from '../types/consumer';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { STRIPE_PRODUCTS } from '@/constants/stripe';
import { toast } from 'sonner';

interface ConsumerSubscriptionContextType {
  subscription: ConsumerSubscription | null;
  tier: 'free' | 'starter' | 'explorer' | 'unlimited';
  isPlus: boolean; // Legacy - true for any paid tier
  isSubscribed: boolean;
  isLoading: boolean;
  checkSubscription: () => Promise<void>;
  upgradeToPlus: () => Promise<void>; // Legacy
  upgradeToTier: (tier: 'starter' | 'explorer' | 'unlimited', billingCycle: 'monthly' | 'annual') => Promise<void>;
}

const ConsumerSubscriptionContext = createContext<ConsumerSubscriptionContextType | undefined>(undefined);

export const ConsumerSubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<ConsumerSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;

      const { subscribed, product_id, tier, subscription_end } = data;
      
      // Map tier from backend or detect from product_id
      let userTier: 'free' | 'starter' | 'explorer' | 'unlimited' = 'free';
      if (tier) {
        userTier = tier;
      } else if (product_id) {
        // Fallback detection for legacy/unmapped products
        if (product_id === STRIPE_PRODUCTS['consumer-starter'].product_id) userTier = 'starter';
        else if (product_id === STRIPE_PRODUCTS['consumer-explorer'].product_id) userTier = 'explorer';
        else if (product_id === STRIPE_PRODUCTS['consumer-unlimited'].product_id) userTier = 'unlimited';
        else if (product_id === STRIPE_PRODUCTS['consumer-plus'].product_id) userTier = 'starter'; // Legacy mapping
      }
      
      setSubscription({
        tier: userTier,
        status: subscribed ? 'active' : 'expired',
        subscriptionEndsAt: subscription_end,
        stripeCustomerId: data.stripe_customer_id,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription({ tier: 'free', status: 'expired' });
    } finally {
      setIsLoading(false);
    }
  };

  const upgradeToPlus = async () => {
    // Legacy function - defaults to Starter tier
    await upgradeToTier('starter', 'annual');
  };

  const upgradeToTier = async (tier: 'starter' | 'explorer' | 'unlimited', billingCycle: 'monthly' | 'annual') => {
    if (!user) {
      toast.error('Please sign in to upgrade');
      return;
    }

    setIsLoading(true);
    try {
      const tierMap = {
        starter: 'consumer-starter',
        explorer: 'consumer-explorer',
        unlimited: 'consumer-unlimited'
      };
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          tier: tierMap[tier],
          billing_cycle: billingCycle 
        }
      });
      
      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Failed to start checkout');
    } finally {
      setIsLoading(false);
    }
  };

  const currentTier = subscription?.tier || 'free';
  const isPlus = subscription?.status === 'active' && currentTier !== 'free'; // Any paid tier
  const isSubscribed = subscription?.status === 'active' && currentTier !== 'free';

  return (
    <ConsumerSubscriptionContext.Provider value={{
      subscription,
      tier: currentTier,
      isPlus,
      isSubscribed,
      isLoading,
      checkSubscription,
      upgradeToPlus,
      upgradeToTier
    }}>
      {children}
    </ConsumerSubscriptionContext.Provider>
  );
};

export const useConsumerSubscription = () => {
  const context = useContext(ConsumerSubscriptionContext);
  if (context === undefined) {
    throw new Error('useConsumerSubscription must be used within a ConsumerSubscriptionProvider');
  }
  return context;
};
