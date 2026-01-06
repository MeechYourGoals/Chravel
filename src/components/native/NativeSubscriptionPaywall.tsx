import React, { useState, useEffect } from 'react';
import { Check, X, Crown, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hapticService } from '@/services/hapticService';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isRevenueCatAvailable,
  isNativePlatform,
} from '@/integrations/revenuecat/revenuecatClient';
import { useDemoMode } from '@/hooks/useDemoMode';
import { toast } from 'sonner';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface PricingPlan {
  id: string;
  name: string;
  subtitle: string;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyPerMonth: string;
  savings?: string;
  features: PlanFeature[];
  popular?: boolean;
  icon: React.ReactNode;
  gradient: string;
  packageId: string; // RevenueCat package identifier
}

const PLANS: PricingPlan[] = [
  {
    id: 'explorer',
    name: 'Explorer',
    subtitle: 'Perfect for casual travelers',
    monthlyPrice: '$9.99',
    yearlyPrice: '$99.99',
    yearlyPerMonth: '$8.33',
    savings: 'Save 17%',
    packageId: '$rc_monthly', // RevenueCat monthly package
    icon: <Sparkles size={24} />,
    gradient: 'from-blue-500 to-cyan-400',
    features: [
      { text: 'Up to 5 trips', included: true },
      { text: 'Up to 10 collaborators per trip', included: true },
      { text: 'AI Concierge (50 queries/month)', included: true },
      { text: 'Media uploads (5GB storage)', included: true },
      { text: 'Basic expense splitting', included: true },
      { text: 'Calendar sync', included: true },
      { text: 'Unlimited trips', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    id: 'frequent-chraveler',
    name: 'Frequent Chraveler',
    subtitle: 'For the avid traveler',
    monthlyPrice: '$19.99',
    yearlyPrice: '$199.99',
    yearlyPerMonth: '$16.66',
    savings: 'Save 17%',
    popular: true,
    packageId: '$rc_annual', // RevenueCat annual package
    icon: <Crown size={24} />,
    gradient: 'from-purple-500 to-pink-500',
    features: [
      { text: 'Unlimited trips', included: true },
      { text: 'Up to 25 collaborators per trip', included: true },
      { text: 'AI Concierge (unlimited)', included: true },
      { text: 'Media uploads (50GB storage)', included: true },
      { text: 'Advanced expense splitting', included: true },
      { text: 'Calendar sync + export', included: true },
      { text: 'Priority support', included: true },
      { text: 'Early access to new features', included: true },
    ],
  },
];

interface NativeSubscriptionPaywallProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  featureHighlight?: string;
}

/**
 * iOS-style subscription paywall with native UI patterns.
 * Integrates with RevenueCat for in-app purchases.
 */
export const NativeSubscriptionPaywall = ({
  isOpen,
  onClose,
  onSuccess,
  featureHighlight,
}: NativeSubscriptionPaywallProps) => {
  const { isDemoMode } = useDemoMode();
  const [selectedPlan, setSelectedPlan] = useState<string>('frequent-chraveler');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  // Fetch RevenueCat offerings on mount (for future dynamic pricing)
  useEffect(() => {
    if (isOpen && isRevenueCatAvailable()) {
      // Preload offerings - currently using static pricing, but ready for dynamic
      getOfferings(isDemoMode).catch(() => {
        // Silent fail - static pricing will be used as fallback
      });
    }
  }, [isOpen, isDemoMode]);

  const handleSelectPlan = async (planId: string) => {
    await hapticService.light();
    setSelectedPlan(planId);
  };

  const handleBillingToggle = async (period: 'monthly' | 'yearly') => {
    await hapticService.light();
    setBillingPeriod(period);
  };

  const handlePurchase = async () => {
    if (isDemoMode) {
      toast.info('Purchases disabled in demo mode');
      return;
    }

    if (!isNativePlatform()) {
      toast.info('In-app purchases are only available on mobile devices');
      return;
    }

    const plan = PLANS.find(p => p.id === selectedPlan);
    if (!plan) return;

    setIsPurchasing(true);
    await hapticService.medium();

    try {
      const packageId = billingPeriod === 'yearly' ? '$rc_annual' : '$rc_monthly';
      const result = await purchasePackage(packageId, 'default', isDemoMode);

      if (result.success) {
        await hapticService.success();
        toast.success('Welcome to Chravel Pro!', {
          description: `Your ${plan.name} subscription is now active.`,
        });
        onSuccess?.();
        onClose();
      } else if (result.errorCode === 'CANCELLED') {
        // User cancelled, no action needed
      } else {
        toast.error('Purchase failed', {
          description: result.error || 'Please try again later.',
        });
      }
    } catch {
      toast.error('Purchase failed', {
        description: 'An unexpected error occurred.',
      });
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    if (isDemoMode) {
      toast.info('Restores disabled in demo mode');
      return;
    }

    setIsRestoring(true);
    await hapticService.light();

    try {
      const result = await restorePurchases(isDemoMode);

      if (result.success) {
        await hapticService.success();
        toast.success('Purchases restored!');
        onSuccess?.();
        onClose();
      } else {
        toast.info('No previous purchases found');
      }
    } catch {
      toast.error('Restore failed', {
        description: 'Please try again later.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen) return null;

  const selectedPlanData = PLANS.find(p => p.id === selectedPlan);
  const price =
    billingPeriod === 'yearly' ? selectedPlanData?.yearlyPrice : selectedPlanData?.monthlyPrice;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/30 via-black to-black" />

      {/* Content */}
      <div
        className="relative h-full flex flex-col overflow-y-auto"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
          style={{ marginTop: 'env(safe-area-inset-top)' }}
        >
          <X size={20} className="text-white/70" />
        </button>

        {/* Header */}
        <div className="px-6 pt-12 pb-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Crown size={32} className="text-white" />
          </div>
          <h1 className="text-[28px] font-bold text-white mb-2">Unlock Chravel Pro</h1>
          <p className="text-[15px] text-white/60 max-w-[280px] mx-auto">
            {featureHighlight || 'Get unlimited trips, AI concierge, and more premium features'}
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-6 px-6">
          <div className="inline-flex bg-white/10 rounded-full p-1">
            <button
              onClick={() => handleBillingToggle('monthly')}
              className={cn(
                'px-5 py-2 rounded-full text-[15px] font-medium transition-all',
                billingPeriod === 'monthly' ? 'bg-white text-black' : 'text-white/70',
              )}
            >
              Monthly
            </button>
            <button
              onClick={() => handleBillingToggle('yearly')}
              className={cn(
                'px-5 py-2 rounded-full text-[15px] font-medium transition-all',
                billingPeriod === 'yearly' ? 'bg-white text-black' : 'text-white/70',
              )}
            >
              Yearly
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="px-4 space-y-3 mb-6">
          {PLANS.map(plan => (
            <button
              key={plan.id}
              onClick={() => handleSelectPlan(plan.id)}
              className={cn(
                'w-full p-4 rounded-2xl text-left transition-all relative overflow-hidden',
                'border-2',
                selectedPlan === plan.id
                  ? 'border-primary bg-primary/10'
                  : 'border-white/10 bg-white/5 active:bg-white/10',
              )}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute top-0 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[11px] font-bold px-3 py-1 rounded-b-lg">
                  MOST POPULAR
                </div>
              )}

              <div className="flex items-start gap-4">
                {/* Selection indicator */}
                <div
                  className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-1',
                    selectedPlan === plan.id ? 'border-primary bg-primary' : 'border-white/30',
                  )}
                >
                  {selectedPlan === plan.id && (
                    <Check size={14} className="text-white" strokeWidth={3} />
                  )}
                </div>

                {/* Plan info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn('text-white', plan.popular && 'text-primary')}>
                      {plan.icon}
                    </div>
                    <span className="text-[17px] font-semibold text-white">{plan.name}</span>
                  </div>
                  <p className="text-[13px] text-white/50 mb-2">{plan.subtitle}</p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-[24px] font-bold text-white">
                      {billingPeriod === 'yearly' ? plan.yearlyPerMonth : plan.monthlyPrice}
                    </span>
                    <span className="text-[13px] text-white/50">/month</span>
                  </div>
                  {billingPeriod === 'yearly' && plan.savings && (
                    <span className="inline-block mt-1 text-[12px] text-green-400 font-medium bg-green-400/10 px-2 py-0.5 rounded-full">
                      {plan.savings}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Features list */}
        <div className="px-6 mb-6">
          <h3 className="text-[13px] font-medium text-white/50 uppercase tracking-wide mb-3">
            What&apos;s included
          </h3>
          <div className="space-y-2">
            {selectedPlanData?.features.slice(0, 6).map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center',
                    feature.included
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/10 text-white/30',
                  )}
                >
                  <Check size={12} strokeWidth={3} />
                </div>
                <span
                  className={cn(
                    'text-[15px]',
                    feature.included ? 'text-white' : 'text-white/40 line-through',
                  )}
                >
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTA Section */}
        <div className="px-6 pb-6 bg-gradient-to-t from-black via-black/90 to-transparent pt-8">
          {/* Purchase button */}
          <button
            onClick={handlePurchase}
            disabled={isPurchasing || isRestoring}
            className={cn(
              'w-full h-[54px] rounded-2xl font-semibold text-[17px]',
              'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
              'shadow-lg shadow-purple-500/30',
              'active:scale-[0.98] transition-transform',
              'disabled:opacity-50',
            )}
          >
            {isPurchasing ? (
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            ) : (
              `Subscribe for ${price}${billingPeriod === 'yearly' ? '/year' : '/month'}`
            )}
          </button>

          {/* Restore & Terms */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={handleRestore}
              disabled={isPurchasing || isRestoring}
              className="text-[15px] text-primary active:opacity-50"
            >
              {isRestoring ? 'Restoring...' : 'Restore Purchases'}
            </button>
          </div>

          {/* Legal */}
          <p className="text-[11px] text-white/30 text-center mt-4 leading-relaxed">
            Payment will be charged to your Apple ID account at confirmation. Subscription
            automatically renews unless cancelled at least 24 hours before the end of the current
            period.{' '}
            <a href="/terms" className="underline">
              Terms
            </a>{' '}
            &{' '}
            <a href="/privacy" className="underline">
              Privacy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
