import React, { useState, useEffect, useRef } from 'react';
import {
  Purchases,
  type Offering,
  type Package,
  type CustomerInfo,
  ErrorCode,
  PurchasesError,
} from '@revenuecat/purchases-js';
import { Check, Loader2, Crown, Sparkles, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { safeReload } from '@/utils/safeReload';

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

/**
 * Subscription Paywall Component
 * Displays RevenueCat offerings with pricing and handles purchase flow.
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

  const purchaseContainerRef = useRef<HTMLDivElement>(null);

  // Fetch offerings on mount
  useEffect(() => {
    const fetchOfferings = async () => {
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
        console.error('[Paywall] Error fetching offerings:', err);
        setError('Failed to load subscription options. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchOfferings();
  }, [offeringId, entitlementId]);

  // Handle purchase
  const handlePurchase = async () => {
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
    } catch (err) {
      if (err instanceof PurchasesError) {
        if (err.errorCode === ErrorCode.UserCancelledError) {
          // User cancelled, not an error
          console.log('[Paywall] User cancelled purchase');
          return;
        }
        setError(err.message || 'Purchase failed. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error('[Paywall] Purchase error:', err);
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

  // Already subscribed view
  if (isEntitled && customerInfo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <Card className="w-full max-w-md bg-card border-border p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">You're Subscribed!</h2>
          <p className="text-muted-foreground mb-6">
            You have full access to all premium features.
          </p>
          <Button onClick={onClose} className="w-full">
            Continue
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <Card className="w-full max-w-lg bg-card border-border relative">
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="p-6 pb-4 text-center border-b border-border">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Unlock Premium</h2>
          <p className="text-muted-foreground">
            Get access to all premium features and enhance your travel experience.
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading subscription options...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="w-8 h-8 text-destructive mb-4" />
              <p className="text-destructive text-center mb-4">{error}</p>
              <Button variant="outline" onClick={() => safeReload()}>
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* Features list */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Premium includes:
                </h3>
                <ul className="space-y-2">
                  {[
                    'Unlimited trip creation',
                    'AI-powered travel concierge',
                    'Advanced budget tracking',
                    'Priority support',
                    'No ads',
                  ].map(feature => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Package selection */}
              <div className="space-y-3 mb-6">
                {packages.map(packageInfo => (
                  <button
                    key={packageInfo.pkg.identifier}
                    onClick={() => setSelectedPackage(packageInfo.pkg)}
                    disabled={purchasing}
                    className={cn(
                      'w-full p-4 rounded-xl border-2 text-left transition-all relative',
                      selectedPackage?.identifier === packageInfo.pkg.identifier
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 bg-card',
                      purchasing && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {packageInfo.isBestValue && (
                      <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Best Value
                      </div>
                    )}
                    <div className="flex items-center justify-between">
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
                        selectedPackage?.identifier === packageInfo.pkg.identifier
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground',
                      )}
                    >
                      {selectedPackage?.identifier === packageInfo.pkg.identifier && (
                        <Check className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Purchase button */}
              <Button
                onClick={handlePurchase}
                disabled={!selectedPackage || purchasing}
                className="w-full h-12 text-base font-semibold"
              >
                {purchasing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
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
  );
};

export default SubscriptionPaywall;
