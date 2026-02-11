import React, { useMemo, useCallback, useState } from 'react';
import { BalanceSummary } from './BalanceSummary';
import { PersonBalanceCard } from './PersonBalanceCard';
import { PaymentHistory } from './PaymentHistory';
import { OutstandingPayments } from './OutstandingPayments';
import { PaymentInput } from './PaymentInput';
import { useAuth } from '../../hooks/useAuth';
import { usePayments } from '../../hooks/usePayments';
import { useBalanceSummary } from '../../hooks/useBalanceSummary';
import { useTripMembersQuery } from '../../hooks/useTripMembersQuery';
import { useToast } from '../../hooks/use-toast';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useConsumerSubscription } from '../../hooks/useConsumerSubscription';
import { useSuperAdmin } from '../../hooks/useSuperAdmin';
import { AuthModal } from '../AuthModal';
import { Loader2, LogIn, Lock, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface PaymentsTabProps {
  tripId: string;
}

export const PaymentsTab = ({ tripId }: PaymentsTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isLoading: demoLoading } = useDemoMode();
  const { tier, isLoading: tierLoading, upgradeToTier } = useConsumerSubscription();
  const { isSuperAdmin } = useSuperAdmin();

  // ⚡ TanStack Query: payment data (cached, prefetchable)
  const { tripPayments, paymentsLoading, demoActive, refreshPayments, createPaymentMessage } =
    usePayments(tripId);

  // ⚡ TanStack Query: balance summary (previously useState/useEffect with 4 DB round-trips)
  const { balanceSummary, balanceLoading, refreshBalanceSummary } = useBalanceSummary(tripId);

  // ⚡ TanStack Query: trip members (reuses shared cache instead of separate fetch)
  const { tripMembers: rawMembers, loading: membersLoading } = useTripMembersQuery(tripId);

  const [showAuthModal, setShowAuthModal] = useState(false);

  // Map TripMember[] to the shape PaymentInput expects
  const tripMembers = useMemo(
    () => rawMembers.map(m => ({ id: m.id, name: m.name, avatar: m.avatar })),
    [rawMembers],
  );

  // Count user's payment requests for freemium limits
  const userPaymentCount = useMemo(() => {
    return tripPayments.filter(p => p.createdBy === user?.id).length;
  }, [tripPayments, user]);

  const paymentLimit = isSuperAdmin ? -1 : tier === 'free' ? 5 : -1;
  const remainingPayments = paymentLimit === -1 ? -1 : Math.max(0, paymentLimit - userPaymentCount);
  const canCreateMorePayments =
    isSuperAdmin || paymentLimit === -1 || userPaymentCount < paymentLimit;

  // Calculate payment summary from centralized data
  const paymentSummary = useMemo(() => {
    if (!user || tripPayments.length === 0) {
      return {
        totalPaid: 0,
        totalOwed: 0,
        totalOwedToYou: 0,
        totalYouOwe: 0,
        isSettled: true,
      };
    }

    let totalPaid = 0;
    let totalOwedToYou = 0;
    let totalYouOwe = 0;

    tripPayments.forEach(payment => {
      if (payment.createdBy === user.id) {
        totalPaid += payment.amount;
        if (!payment.isSettled) {
          totalOwedToYou += (payment.amount / payment.splitCount) * (payment.splitCount - 1);
        }
      } else {
        if (!payment.isSettled) {
          totalYouOwe += payment.amount / payment.splitCount;
        }
      }
    });

    const totalOwed = totalOwedToYou + totalYouOwe;
    const isSettled = totalOwed === 0;

    return { totalPaid, totalOwed, totalOwedToYou, totalYouOwe, isSettled };
  }, [tripPayments, user]);

  // Unified refresh function for child components
  const handlePaymentUpdated = useCallback(async () => {
    await Promise.all([refreshPayments(), refreshBalanceSummary()]);
  }, [refreshPayments, refreshBalanceSummary]);

  // Handle payment submission
  const handlePaymentSubmit = async (paymentData: {
    amount: number;
    currency: string;
    description: string;
    splitCount: number;
    splitParticipants: string[];
    paymentMethods: string[];
  }) => {
    const result = await createPaymentMessage(paymentData);

    if (result.success && result.paymentId) {
      // Refresh balance summary after successful creation
      await refreshBalanceSummary();

      if (!demoActive) {
        toast({
          title: 'Payment created',
          description: `${paymentData.description} - $${paymentData.amount.toFixed(2)}`,
        });
      }
    } else if (result.error) {
      const errorCode = result.error.code;
      const errorMessage = result.error.message;

      toast({
        title:
          errorCode === 'SESSION_EXPIRED'
            ? 'Session Expired'
            : errorCode === 'RLS_VIOLATION'
              ? 'Permission Denied'
              : errorCode === 'VALIDATION_FAILED'
                ? 'Validation Error'
                : errorCode === 'NETWORK_ERROR'
                  ? 'Connection Error'
                  : 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // ⚡ PROGRESSIVE LOADING: Only block on payment data (fast from cache).
  // Balance summary loads independently and shows its own skeleton.
  if (paymentsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Payment Status Messages */}
      {paymentSummary.isSettled && tripPayments.length > 0 && (
        <Card className="bg-gradient-to-br from-emerald-900/20 to-emerald-950/20 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle size={20} />
              <span className="text-sm font-medium">All settled up! No outstanding payments.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Creation */}
      {demoLoading || tierLoading ? (
        <div className="flex items-center justify-center py-6 opacity-80">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : !user && !demoActive ? (
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <LogIn className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-base font-semibold mb-2">Sign in to create payment requests</h3>
          <p className="text-sm text-muted-foreground mb-3">
            You need to be signed in to create and manage payments for this trip.
          </p>
          <Button variant="default" onClick={() => setShowAuthModal(true)}>
            Sign In
          </Button>
        </div>
      ) : membersLoading ? (
        <div className="flex items-center justify-center py-6 opacity-80">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading trip members...</span>
        </div>
      ) : !canCreateMorePayments && tier === 'free' && !isSuperAdmin ? (
        <Card className="bg-gradient-to-br from-amber-900/20 to-amber-950/20 border-amber-500/30">
          <CardContent className="p-6 text-center">
            <Lock className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Payment Limit Reached</h3>
            <p className="text-gray-400 text-sm mb-4">
              You've created 5 payment requests for this trip (free tier limit).
            </p>
            <Button
              onClick={() => upgradeToTier('explorer', 'monthly')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Upgrade for Unlimited Payments - $9.99/mo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {tier === 'free' &&
            !isSuperAdmin &&
            remainingPayments > 0 &&
            remainingPayments !== -1 && (
              <div className="flex items-center justify-between bg-blue-900/20 border border-blue-500/30 rounded-lg px-4 py-2 mb-2">
                <span className="text-sm text-blue-300">
                  {remainingPayments} of 5 payment requests remaining
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => (window.location.href = '/settings?tab=subscription')}
                  className="text-blue-400 hover:text-blue-300 h-auto py-1"
                >
                  Upgrade
                </Button>
              </div>
            )}
          <PaymentInput
            onSubmit={handlePaymentSubmit}
            tripMembers={tripMembers}
            isVisible={true}
            tripId={tripId}
          />
        </>
      )}

      {/* ⚡ Balance Summary — loads independently with its own skeleton */}
      {balanceLoading ? (
        <div className="space-y-2">
          <div className="h-24 bg-muted/50 rounded-lg border border-border animate-pulse" />
          <div className="h-16 bg-muted/50 rounded-lg border border-border animate-pulse" />
        </div>
      ) : (
        <>
          {/* Balance Summary Card */}
          <BalanceSummary summary={balanceSummary} />

          {/* Per-Person Balance Cards */}
          {balanceSummary.balances.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-foreground mb-1">Balance Breakdown</h3>
              {balanceSummary.balances.map(balance => (
                <PersonBalanceCard key={balance.userId} balance={balance} tripId={tripId} />
              ))}
            </div>
          ) : (
            <div className="text-center py-4 bg-muted/50 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground">
                All settled up! No outstanding payments.
              </p>
            </div>
          )}
        </>
      )}

      {/* Outstanding Payments - pass data as props */}
      <OutstandingPayments
        tripId={tripId}
        tripMembers={tripMembers}
        onPaymentUpdated={handlePaymentUpdated}
        payments={tripPayments}
      />

      {/* Payment History - pass data as props */}
      <PaymentHistory
        tripId={tripId}
        onPaymentUpdated={handlePaymentUpdated}
        payments={tripPayments}
      />

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
};
