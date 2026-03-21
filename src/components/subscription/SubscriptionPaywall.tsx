import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Purchases,
  type Offering,
  type Package,
  type CustomerInfo,
  ErrorCode,
  PurchasesError,
} from '@revenuecat/purchases-js';
import {
  Check,
  Loader2,
  Crown,
  Sparkles,
  X,
  AlertCircle,
  Shield,
  Zap,
  Globe,
  Headphones,
  BanIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SubscriptionPaywallProps {
  /** Called when user successfully purchases */
  onPurchaseComplete?: (customerInfo: CustomerInfo) => void;
  /** Called when user closes the paywall */
  onClose?: () => void;
  /** Optional offering identifier to display (defaults to current) */
  offeringId?: string;
  /** Entitlement identifier to check access */
  entitlementId?: string;
  /** Optional customer email for checkout */
  customerEmail?: string;
}

interface PackageDisplayInfo {
  pkg: Package;
  title: string;
  price: string;
  period: string;
  description: string | null;
  isBestValue?: boolean;
  savings?: string;
}

/** Feature item for the plan comparison checklist */
interface PlanFeature {
  label: string;
  icon: React.ReactNode;
  includedIn: ('free' | 'explorer' | 'premium')[];
}

/** Features included in each tier for comparison */
const PLAN_FEATURES: PlanFeature[] = [
  {
    label: 'Up to 3 trips',
    icon: <Globe className="w-4 h-4" />,
    includedIn: ['free', 'explorer', 'premium'],
  },
  {
    label: 'Unlimited trips',
    icon: <Globe className="w-4 h-4" />,
    includedIn: ['explorer', 'premium'],
  },
  {
    label: 'AI travel concierge',
    icon: <Sparkles className="w-4 h-4" />,
    includedIn: ['explorer', 'premium'],
  },
  {
    label: 'Advanced budget tracking',
    icon: <Zap className="w-4 h-4" />,
    includedIn: ['explorer', 'premium'],
  },
  {
    label: 'Calendar sync & PDF export',
    icon: <Shield className="w-4 h-4" />,
    includedIn: ['explorer', 'premium'],
  },
  {
    label: 'Voice concierge',
    icon: <Headphones className="w-4 h-4" />,
    includedIn: ['premium'],
  },
  {
    label: 'Priority support',
    icon: <Headphones className="w-4 h-4" />,
    includedIn: ['premium'],
  },
  {
    label: 'No ads',
    icon: <BanIcon className="w-4 h-4" />,
    includedIn: ['premium'],
  },
];

/**
 * Subscription status badge component
 */
function SubscriptionStatusBadge({
  status,
}: {
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | 'none';
}) {
  const config: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-green-500/20 text-green-500' },
    trialing: { label: 'Trial', className: 'bg-blue-500/20 text-blue-500' },
    past_due: { label: 'Past Due', className: 'bg-yellow-500/20 text-yellow-500' },
    canceled: { label: 'Canceled', className: 'bg-orange-500/20 text-orange-500' },
    expired: { label: 'Expired', className: 'bg-red-500/20 text-red-500' },
    none: { label: 'Free', className: 'bg-muted text-muted-foreground' },
  };

  const { label, className } = config[status] || config.none;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        className,
      )}
      role="status"
      aria-label={`Subscription status: ${label}`}
    >
      {label}
    </span>
  );
}

/**
 * Loading skeleton for the paywall
 */
function PaywallSkeleton() {
  return (
    <div className="p-6 space-y-6" aria-busy="true" aria-label="Loading subscription options">
      {/* Feature list skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
      </div>

      {/* Package cards skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>

      {/* Button skeleton */}
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}

/**
 * Subscription Paywall Component
 * Displays RevenueCat offerings with pricing and handles purchase flow.
 * Includes plan comparison, upgrade/downgrade confirmation, status display,
 * and toast notifications for subscription events.
 */
export const SubscriptionPaywall: React.FC<SubscriptionPaywallProps> = ({
  onPurchaseComplete,
  onClose,
  offeringId,
  entitlementId = 'pro',
  customerEmail,
}) => {
  const [offerings, setOfferings] = useState<Offering | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isEntitled, setIsEntitled] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const purchaseContainerRef = useRef<HTMLDivElement>(null);

  // Fetch offerings with retry support
  const fetchOfferings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const purchases = Purchases.getSharedInstance();

      // Get customer info to check entitlements
      const info = await purchases.getCustomerInfo();
      setCustomerInfo(info);

      // Check if user already has access
      if (entitlementId && info.entitlements.active[entitlementId]) {
        setIsEntitled(true);
      }

      // Fetch offerings
      const offeringsResult = await purchases.getOfferings({
        offeringIdentifier: offeringId,
      });

      const offering = offeringId ? offeringsResult.all[offeringId] : offeringsResult.current;

      if (offering) {
        setOfferings(offering);
        // Pre-select the annual package if available, otherwise first package
        const defaultPkg = offering.annual || offering.monthly || offering.availablePackages[0];
        if (defaultPkg) {
          setSelectedPackage(defaultPkg);
        }
      } else {
        setError('No subscription packages available');
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Paywall] Error fetching offerings:', err);
      setError('Failed to load subscription options. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [offeringId, entitlementId]);

  // Fetch on mount
  useEffect(() => {
    fetchOfferings();
  }, [fetchOfferings]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    fetchOfferings();
  }, [fetchOfferings]);

  // Handle purchase with confirmation dialog
  const handlePurchaseClick = () => {
    if (!selectedPackage) return;
    setShowConfirmDialog(true);
  };

  // Confirmed purchase
  const handlePurchaseConfirmed = async () => {
    setShowConfirmDialog(false);
    if (!selectedPackage) return;

    try {
      setPurchasing(true);
      setError(null);

      const purchases = Purchases.getSharedInstance();

      const result = await purchases.purchase({
        rcPackage: selectedPackage,
        customerEmail,
        htmlTarget: purchaseContainerRef.current || undefined,
      });

      // Check entitlements after purchase
      if (entitlementId && result.customerInfo.entitlements.active[entitlementId]) {
        setIsEntitled(true);
      }

      setCustomerInfo(result.customerInfo);
      onPurchaseComplete?.(result.customerInfo);

      toast.success('Subscription activated! Welcome to premium.');
    } catch (err) {
      if (err instanceof PurchasesError) {
        if (err.errorCode === ErrorCode.UserCancelledError) {
          // User cancelled, not an error
          if (import.meta.env.DEV) console.log('[Paywall] User cancelled purchase');
          return;
        }
        const errorMsg = err.message || 'Purchase failed. Please try again.';
        setError(errorMsg);
        toast.error('Purchase failed', { description: errorMsg });
      } else {
        const errorMsg = 'An unexpected error occurred. Please try again.';
        setError(errorMsg);
        toast.error('Purchase failed', { description: errorMsg });
      }
      if (import.meta.env.DEV) console.error('[Paywall] Purchase error:', err);
    } finally {
      setPurchasing(false);
    }
  };

  // Format package info for display
  const formatPackage = (pkg: Package): PackageDisplayInfo => {
    const product = pkg.webBillingProduct;
    const price = product.price;

    let period = '';
    let savings: string | undefined;

    switch (pkg.packageType) {
      case '$rc_annual':
        period = '/year';
        // Calculate monthly equivalent for savings display
        if (offerings?.monthly) {
          const monthlyPrice = offerings.monthly.webBillingProduct.price.amountMicros;
          const yearlyEquivalent = monthlyPrice * 12;
          const annualPrice = price.amountMicros;
          if (yearlyEquivalent > annualPrice) {
            const savingsPercent = Math.round((1 - annualPrice / yearlyEquivalent) * 100);
            savings = `Save ${savingsPercent}%`;
          }
        }
        break;
      case '$rc_six_month':
        period = '/6 months';
        break;
      case '$rc_three_month':
        period = '/3 months';
        break;
      case '$rc_two_month':
        period = '/2 months';
        break;
      case '$rc_monthly':
        period = '/month';
        break;
      case '$rc_weekly':
        period = '/week';
        break;
      case '$rc_lifetime':
        period = ' (lifetime)';
        break;
      default:
        period = product.period ? `/${product.period.unit}` : '';
    }

    return {
      pkg,
      title: product.title,
      price: price.formattedPrice,
      period,
      description: product.description,
      isBestValue: pkg.packageType === '$rc_annual',
      savings,
    };
  };

  // Get available packages
  const packages: PackageDisplayInfo[] =
    offerings?.availablePackages.map(formatPackage).sort((a, b) => {
      // Sort: annual first, then by period length
      const order = [
        '$rc_annual',
        '$rc_six_month',
        '$rc_three_month',
        '$rc_monthly',
        '$rc_weekly',
        '$rc_lifetime',
      ];
      return order.indexOf(a.pkg.packageType) - order.indexOf(b.pkg.packageType);
    }) || [];

  // Determine the selected package display info for the confirmation dialog
  const selectedPackageInfo = selectedPackage
    ? packages.find(p => p.pkg.identifier === selectedPackage.identifier)
    : null;

  // Already subscribed view
  if (isEntitled && customerInfo) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Subscription status"
      >
        <Card className="w-full max-w-md bg-card border-border p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-green-500" aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">You're Subscribed!</h2>
          <SubscriptionStatusBadge status="active" />
          <p className="text-muted-foreground mb-6 mt-3">
            You have full access to all premium features.
          </p>
          <Button onClick={onClose} className="w-full min-h-[44px]" aria-label="Continue to app">
            Continue
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Subscription plans"
      >
        <Card className="w-full max-w-lg bg-card border-border relative">
          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
              aria-label="Close subscription dialog"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}

          {/* Header */}
          <div className="p-6 pb-4 text-center border-b border-border">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
              <Crown className="w-8 h-8 text-primary" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Unlock Premium</h2>
            <p className="text-muted-foreground">
              Get access to all premium features and enhance your travel experience.
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <PaywallSkeleton />
            ) : error ? (
              <div
                className="flex flex-col items-center justify-center py-8"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="w-8 h-8 text-destructive mb-4" aria-hidden="true" />
                <p className="text-destructive text-center mb-2">{error}</p>
                {retryCount > 0 && (
                  <p className="text-xs text-muted-foreground mb-4">
                    Attempt {retryCount + 1} — if this persists, check your connection.
                  </p>
                )}
                <Button
                  variant="outline"
                  onClick={handleRetry}
                  className="min-h-[44px]"
                  aria-label="Retry loading subscription options"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <>
                {/* Plan comparison feature checklist */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Compare plans</h3>
                  <div className="border border-border rounded-lg overflow-hidden">
                    {/* Header row */}
                    <div className="grid grid-cols-[1fr,60px,60px,60px] gap-1 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                      <span>Feature</span>
                      <span className="text-center">Free</span>
                      <span className="text-center">Explorer</span>
                      <span className="text-center">Premium</span>
                    </div>
                    {/* Feature rows */}
                    {PLAN_FEATURES.map(feature => (
                      <div
                        key={feature.label}
                        className="grid grid-cols-[1fr,60px,60px,60px] gap-1 px-3 py-2 border-t border-border text-sm"
                      >
                        <span className="flex items-center gap-1.5 text-foreground">
                          <span className="text-muted-foreground" aria-hidden="true">
                            {feature.icon}
                          </span>
                          {feature.label}
                        </span>
                        {(['free', 'explorer', 'premium'] as const).map(tier => (
                          <span
                            key={tier}
                            className="flex items-center justify-center"
                            aria-label={
                              feature.includedIn.includes(tier)
                                ? `${feature.label} included in ${tier}`
                                : `${feature.label} not included in ${tier}`
                            }
                          >
                            {feature.includedIn.includes(tier) ? (
                              <Check className="w-4 h-4 text-green-500" aria-hidden="true" />
                            ) : (
                              <X className="w-4 h-4 text-muted-foreground/40" aria-hidden="true" />
                            )}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Package selection */}
                <div
                  className="space-y-3 mb-6"
                  role="radiogroup"
                  aria-label="Select a subscription plan"
                >
                  {packages.map(packageInfo => {
                    const isSelected = selectedPackage?.identifier === packageInfo.pkg.identifier;
                    return (
                      <button
                        key={packageInfo.pkg.identifier}
                        onClick={() => setSelectedPackage(packageInfo.pkg)}
                        disabled={purchasing}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${packageInfo.title} - ${packageInfo.price}${packageInfo.period}${packageInfo.savings ? `, ${packageInfo.savings}` : ''}`}
                        className={cn(
                          'w-full p-4 rounded-xl text-left transition-all relative min-h-[44px]',
                          isSelected
                            ? 'accent-ring-active'
                            : 'border-2 border-border hover:border-gold-primary/30 bg-card',
                          purchasing && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        {packageInfo.isBestValue && (
                          <div className="absolute -top-2.5 left-4 px-2 py-0.5 accent-fill-gold text-xs font-medium rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3" aria-hidden="true" />
                            Best Value
                          </div>
                        )}
                        <div className="flex items-center justify-between pr-8">
                          <div>
                            <div className="font-semibold text-foreground">{packageInfo.title}</div>
                            {packageInfo.description && (
                              <div className="text-sm text-muted-foreground">
                                {packageInfo.description}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-foreground">
                              {packageInfo.price}
                              <span className="text-sm font-normal text-muted-foreground">
                                {packageInfo.period}
                              </span>
                            </div>
                            {packageInfo.savings && (
                              <div className="text-xs text-green-500 font-medium">
                                {packageInfo.savings}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Selection indicator */}
                        <div
                          className={cn(
                            'absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                            isSelected
                              ? 'border-gold-primary bg-gold-primary/15 shadow-ring-glow'
                              : 'border-muted-foreground',
                          )}
                          aria-hidden="true"
                        >
                          {isSelected && <Check className="w-3 h-3 text-gold-primary" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Purchase button */}
                <Button
                  onClick={handlePurchaseClick}
                  disabled={!selectedPackage || purchasing}
                  className="w-full min-h-[48px] text-base font-semibold"
                  aria-label={
                    selectedPackageInfo
                      ? `Subscribe to ${selectedPackageInfo.title} for ${selectedPackageInfo.price}${selectedPackageInfo.period}`
                      : 'Subscribe now'
                  }
                >
                  {purchasing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
                      Processing...
                    </>
                  ) : (
                    'Subscribe Now'
                  )}
                </Button>

                {/* Terms */}
                <p className="text-xs text-muted-foreground text-center mt-4">
                  Cancel anytime. Subscription auto-renews unless cancelled.
                </p>

                {/* Purchase container for RevenueCat UI */}
                <div ref={purchaseContainerRef} />
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Upgrade/downgrade confirmation dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedPackageInfo ? (
                <>
                  You are about to subscribe to{' '}
                  <span className="font-semibold text-foreground">{selectedPackageInfo.title}</span>{' '}
                  for{' '}
                  <span className="font-semibold text-foreground">
                    {selectedPackageInfo.price}
                    {selectedPackageInfo.period}
                  </span>
                  .
                  {selectedPackageInfo.savings && (
                    <span className="block mt-1 text-green-500 font-medium">
                      {selectedPackageInfo.savings} compared to monthly billing.
                    </span>
                  )}
                  <span className="block mt-2">
                    You can cancel anytime from your account settings.
                  </span>
                </>
              ) : (
                'Are you sure you want to proceed with this subscription?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurchaseConfirmed}
              className="min-h-[44px]"
              aria-label="Confirm subscription purchase"
            >
              {purchasing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                  Processing...
                </>
              ) : (
                'Confirm Purchase'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export { SubscriptionStatusBadge };
export default SubscriptionPaywall;
