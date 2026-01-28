
import React, { useState } from 'react';
import { Crown, Star, Globe, Sparkles } from 'lucide-react';
import { useConsumerSubscription } from '../../hooks/useConsumerSubscription';
import { CONSUMER_PRICING } from '../../types/consumer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const ConsumerBillingSection = () => {
  const { subscription, tier, isSubscribed, upgradeToTier, isLoading } = useConsumerSubscription();
  const [expandedPlan, setExpandedPlan] = useState<string | null>(tier);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        toast.error('No portal URL received');
      }
    } catch (error) {
      toast.error(`Failed to open customer portal: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(error);
    }
  };

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.'
    );
    
    if (!confirmed) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        toast.error('No portal URL received');
      }
    } catch (error) {
      toast.error(`Failed to open cancellation page: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error(error);
    }
  };

  const plans = {
    free: {
      name: 'Free',
      price: 0,
      icon: Crown,
      features: [
        'Up to 3 active trips (archive to save more)',
        'Unlimited participants',
        'Core group chat',
        'Shared calendar (manual)',
        'Photo & video sharing',
        'Basic itinerary planning',
        'Expense tracking',
        'AI Trip Assistant (5 queries per user per trip)',
        '1 PDF export per trip',
        'ICS calendar download'
      ]
    },
    explorer: {
      name: 'Explorer',
      price: CONSUMER_PRICING.explorer.monthly,
      annualPrice: CONSUMER_PRICING.explorer.annual,
      icon: Globe,
      features: [
        'Unlimited saved trips + restore archived',
        '10 AI queries per user per trip',
        'Unlimited PDF exports',
        'Location-aware AI suggestions',
        'Smart notifications',
        'Search past trips',
        'Priority support',
        'Custom trip categories & tagging'
      ]
    },
    'frequent-chraveler': {
      name: 'Frequent Chraveler',
      price: CONSUMER_PRICING['frequent-chraveler'].monthly,
      annualPrice: CONSUMER_PRICING['frequent-chraveler'].annual,
      icon: Sparkles,
      features: [
        'Everything in Explorer',
        'Unlimited AI queries',
        'Calendar sync (Google, Apple, Outlook)',
        'PDF trip export',
        'Create 1 Chravel Pro trip per month (50-seat limit)',
        'Role-based channels on Pro trips',
        'Custom trip categories & tagging',
        'Early feature access'
      ]
    }
  } as const;

  return (
    <div className="space-y-3">
      <h3 className="text-2xl font-bold text-white">Subscriptions</h3>
      
      {/* Current Plan */}
      <div className={`rounded-xl p-4 ${
        isSubscribed
          ? 'bg-gradient-to-r from-glass-orange/10 to-glass-yellow/10 border border-glass-orange/20'
          : 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div>
              <h4 className="text-xl font-bold text-white flex items-center gap-2 capitalize">
                {tier}
                {isSubscribed && <Crown size={20} className="text-glass-orange" />}
              </h4>
              <p className={isSubscribed ? 'text-glass-orange' : 'text-blue-400'}>
                {isSubscribed ? 'Premium Features Active' : 'Free Forever'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              ${plans[tier as keyof typeof plans].price}/month
            </div>
            {isSubscribed && subscription?.status === 'trial' && (
              <div className="text-sm text-glass-yellow">Trial Active</div>
            )}
          </div>
        </div>
        
        <div className="mb-4">
          <h5 className="font-semibold text-white mb-2">Current Plan Features</h5>
          <ul className="space-y-1.5 text-sm text-gray-300">
            {plans[tier as keyof typeof plans].features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                  isSubscribed ? 'bg-glass-orange' : 'bg-blue-400'
                }`}></div>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {!isSubscribed && (
          <button 
            onClick={() => upgradeToTier('explorer', billingCycle)}
            disabled={isLoading}
            className="bg-gradient-to-r from-glass-orange to-glass-yellow hover:from-glass-orange/80 hover:to-glass-yellow/80 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'View Upgrade Options'}
          </button>
        )}

        {isSubscribed && (
          <div className="flex gap-3">
            <button 
              onClick={handleManageSubscription}
              className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Manage Subscription
            </button>
            <button 
              onClick={handleCancelSubscription}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Cancel Subscription
            </button>
          </div>
        )}
      </div>

      {/* Billing Period Toggle */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Billing Period</h4>
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              billingCycle === 'monthly'
                ? 'bg-glass-orange text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              billingCycle === 'annual'
                ? 'bg-glass-orange text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            Annual <span className="text-xs opacity-75">(Save 17%)</span>
          </button>
        </div>
        <div className="text-sm text-gray-400 mb-4">
          {billingCycle === 'monthly' ? (
            <span>Explorer: $9.99/mo • Frequent Chraveler: $19.99/mo</span>
          ) : (
            <span>Explorer: $99/yr ($8.25/mo) • Frequent Chraveler: $199/yr ($16.58/mo)</span>
          )}
        </div>
      </div>

      {/* Available Plans */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h4 className="text-base font-semibold text-white mb-3">Available Plans</h4>
        <div className="space-y-3">
          {Object.entries(plans).map(([key, plan]) => {
            const PlanIcon = plan.icon;
            return (
              <Collapsible key={key} open={expandedPlan === key} onOpenChange={() => setExpandedPlan(expandedPlan === key ? null : key)}>
                <CollapsibleTrigger className="w-full">
                  <div className={`border rounded-lg p-3 transition-colors hover:bg-white/5 ${
                    key === tier
                      ? 'border-glass-orange/50 bg-glass-orange/10'
                      : 'border-white/10 bg-white/5'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="text-left flex items-center gap-3">
                        <PlanIcon size={20} className={key === tier ? 'text-glass-orange' : 'text-gray-400'} />
                        <div>
                          <h5 className="font-semibold text-white flex items-center gap-2 capitalize">
                            {plan.name}
                          </h5>
                          <div className="text-xl font-bold text-white">${plan.price}/month</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {key === tier && (
                          <div className="text-sm text-glass-orange font-medium">Current Plan</div>
                        )}
                        <div className="text-gray-400">
                          {expandedPlan === key ? '−' : '+'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="bg-white/5 rounded-lg p-3 ml-4">
                    <h6 className="font-medium text-white mb-2">Features Included:</h6>
                    <ul className="space-y-1.5 text-sm text-gray-300">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-glass-orange rounded-full mt-2 flex-shrink-0"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {key !== 'free' && key !== tier && (
                      <button 
                        onClick={() => upgradeToTier(key as 'explorer' | 'frequent-chraveler', billingCycle)}
                        disabled={isLoading}
                        className="mt-4 bg-gradient-to-r from-glass-orange to-glass-yellow hover:from-glass-orange/80 hover:to-glass-yellow/80 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {isLoading ? 'Processing...' : `Upgrade to ${plan.name}`}
                      </button>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </div>
  );
};
