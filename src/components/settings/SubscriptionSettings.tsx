/**
 * SubscriptionSettings Component
 *
 * Apple-compliant subscription management UI.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Crown, Check, RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import { useUnifiedEntitlements } from '@/hooks/useUnifiedEntitlements';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  isNativePlatform,
} from '@/integrations/revenuecat/revenuecatClient';
import { REVENUECAT_CONFIG } from '@/constants/revenuecat';
import { toast } from 'sonner';
import type { RevenueCatOfferings } from '@/integrations/revenuecat/types';

export function SubscriptionSettings({ className }: { className?: string }) {
  const { plan, status, source, isLoading, refreshEntitlements } = useUnifiedEntitlements();
  const { isDemoMode } = useDemoMode();
  const { upgradeToTier } = useConsumerSubscription();

  const [offerings, setOfferings] = useState<RevenueCatOfferings | null>(null);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const isNative = isNativePlatform();
  const revenueCatEnabled = REVENUECAT_CONFIG.enabled;

  const getPlanInfo = () => {
    const plans: Record<
      string,
      { name: string; price: string; color: string; features: string[] }
    > = {
      explorer: {
        name: 'Explorer',
        price: '$4.99/mo',
        color: 'bg-blue-500',
        features: ['Extended AI queries', 'More trips & storage', 'PDF export', 'Calendar sync'],
      },
      'frequent-chraveler': {
        name: 'Frequent Chraveler',
        price: '$9.99/mo',
        color: 'bg-purple-500',
        features: ['Unlimited AI', 'Unlimited trips', 'Pro trip creation', 'Event creation'],
      },
      'pro-starter': {
        name: 'Pro Starter',
        price: '$29/mo',
        color: 'bg-orange-500',
        features: ['Team channels', 'Role management', 'Roster management'],
      },
      'pro-growth': {
        name: 'Pro Growth',
        price: '$79/mo',
        color: 'bg-red-500',
        features: ['Everything in Starter', 'Logistics', 'Events (200 attendees)'],
      },
      'pro-enterprise': {
        name: 'Pro Enterprise',
        price: '$199/mo',
        color: 'bg-gradient-to-r from-purple-500 to-pink-500',
        features: ['Everything unlimited', 'Approvals', 'QuickBooks', 'Audit'],
      },
    };
    return (
      plans[plan] || {
        name: 'Free',
        price: 'Free',
        color: 'bg-muted',
        features: ['5 AI queries/trip', '3 trips', 'Basic storage'],
      }
    );
  };

  const planInfo = getPlanInfo();

  const loadOfferings = async () => {
    if (!isNative || !revenueCatEnabled) return;
    setIsLoadingOfferings(true);
    try {
      const result = await getOfferings();
      if (result.success && result.data) setOfferings(result.data);
    } finally {
      setIsLoadingOfferings(false);
    }
  };

  const handleNativePurchase = async (packageId: string) => {
    setIsPurchasing(true);
    try {
      const result = await purchasePackage(packageId, 'default');
      if (result.success) {
        toast.success('Purchase successful!');
        await refreshEntitlements();
      } else if (result.error && !result.error.includes('cancelled')) {
        toast.error('Purchase failed', { description: result.error });
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    setIsRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.success) {
        await refreshEntitlements();
        toast.success('Purchases restored');
      } else {
        toast.info('No purchases to restore');
      }
    } finally {
      setIsRestoring(false);
    }
  };

  const handleWebUpgrade = async (tier: 'explorer' | 'frequent-chraveler') => {
    setIsPurchasing(true);
    try {
      await upgradeToTier(tier, 'monthly');
    } finally {
      setIsPurchasing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {isDemoMode && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="flex items-center gap-3 p-4">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-700 dark:text-yellow-400">Demo Mode Active</p>
              <p className="text-sm text-muted-foreground">All premium features unlocked.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                Current Plan
              </CardTitle>
              <CardDescription>
                {source === 'revenuecat' && 'Managed via App Store / Play Store'}
                {source === 'stripe' && 'Managed via Stripe'}
                {source === 'demo' && 'Demo mode'}
                {source === 'none' && 'Free tier'}
              </CardDescription>
            </div>
            <Badge variant="secondary" className={`${planInfo.color} text-white`}>
              {planInfo.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold">{planInfo.price}</span>
            {status === 'trialing' && (
              <Badge variant="outline" className="border-blue-500 text-blue-500">
                Trial
              </Badge>
            )}
          </div>
          <ul className="space-y-1">
            {planInfo.features.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-500" />
                {f}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {plan === 'free' && !isDemoMode && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isNative && revenueCatEnabled ? (
              <>
                {!offerings && (
                  <Button
                    onClick={loadOfferings}
                    disabled={isLoadingOfferings}
                    variant="outline"
                    className="w-full"
                  >
                    {isLoadingOfferings ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'View Subscription Options'
                    )}
                  </Button>
                )}
                {offerings?.current?.availablePackages?.map(pkg => (
                  <Card key={pkg.identifier} className="border-primary/50">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{pkg.product.title}</p>
                        <p className="text-sm text-muted-foreground">{pkg.product.description}</p>
                      </div>
                      <Button
                        onClick={() => handleNativePurchase(pkg.identifier)}
                        disabled={isPurchasing}
                      >
                        {isPurchasing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          pkg.product.priceString
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : isNative && !revenueCatEnabled ? (
              <div className="flex items-center gap-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">Subscriptions Unavailable</p>
                  <p className="text-sm text-muted-foreground">Please upgrade on our website.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-blue-500/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Explorer</h3>
                      <Badge className="bg-blue-500">$4.99/mo</Badge>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleWebUpgrade('explorer')}
                      disabled={isPurchasing}
                    >
                      {isPurchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upgrade'}
                    </Button>
                  </CardContent>
                </Card>
                <Card className="border-purple-500/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Frequent Chraveler</h3>
                      <Badge className="bg-purple-500">$9.99/mo</Badge>
                    </div>
                    <Button
                      className="w-full bg-purple-500 hover:bg-purple-600"
                      onClick={() => handleWebUpgrade('frequent-chraveler')}
                      disabled={isPurchasing}
                    >
                      {isPurchasing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Upgrade'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isNative && revenueCatEnabled && (
        <Card>
          <CardContent className="p-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleRestorePurchases}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Restore Purchases
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
