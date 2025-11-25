
import { useState, useEffect, createContext, useContext } from 'react';
import { ConsumerSubscription } from '../types/consumer';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { STRIPE_PRODUCTS } from '@/constants/stripe';
import { toast } from 'sonner';

interface ConsumerSubscriptionContextType {
  subscription: ConsumerSubscription | null;
  tier: 'free' | 'explorer' | 'frequent-chraveler';
  isPlus: boolean; // Legacy - true for any paid tier
  isSubscribed: boolean;
  isLoading: boolean;
  checkSubscription: () => Promise<void>;
  upgradeToPlus: () => Promise<void>; // Legacy
  upgradeToTier: (tier: 'explorer' | 'frequent-chraveler', billingCycle: 'monthly' | 'annual') => Promise<void>;
  canCreateProTrip: boolean;
  proTripQuota: number;
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
      let userTier: 'free' | 'explorer' | 'frequent-chraveler' = 'free';
      if (tier) {
        userTier = tier as 'free' | 'explorer' | 'frequent-chraveler';
      } else if (product_id) {
        // Fallback detection for legacy/unmapped products
        const explorerProduct = STRIPE_PRODUCTS['consumer-explorer'];
        const fcProduct = STRIPE_PRODUCTS['consumer-frequent-chraveler'];
        
        if (product_id === explorerProduct.product_id_monthly || product_id === explorerProduct.product_id_annual) {
          userTier = 'explorer';
        } else if (product_id === fcProduct.product_id_monthly || product_id === fcProduct.product_id_annual) {
          userTier = 'frequent-chraveler';
        } else if (product_id === STRIPE_PRODUCTS['consumer-plus'].product_id) {
          userTier = 'explorer'; // Legacy Plus -> Explorer
        }
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
    // Legacy function - defaults to Explorer tier
    await upgradeToTier('explorer', 'annual');
  };

  const upgradeToTier = async (tier: 'explorer' | 'frequent-chraveler', billingCycle: 'monthly' | 'annual') => {
    if (!user) {
      toast.error('Please sign in to upgrade');
      return;
    }

    setIsLoading(true);
    try {
      const tierMap = {
        explorer: 'consumer-explorer',
        'frequent-chraveler': 'consumer-frequent-chraveler'
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
  const canCreateProTrip = currentTier === 'frequent-chraveler';
  const proTripQuota = currentTier === 'frequent-chraveler' ? 1 : 0;

  return (
    <ConsumerSubscriptionContext.Provider value={{
      subscription,
      tier: currentTier,
      isPlus,
      isSubscribed,
      isLoading,
      checkSubscription,
      upgradeToPlus,
      upgradeToTier,
      canCreateProTrip,
      proTripQuota
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
