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
import { PaymentErrorHandler } from '../../services/paymentErrors';
import { useDemoMode } from '../../hooks/useDemoMode';
import { AuthModal } from '../AuthModal';
import { Loader2, LogIn, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface PaymentsTabProps {
  tripId: string;
}

export const PaymentsTab = ({ tripId }: PaymentsTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isLoading: demoLoading } = useDemoMode();
  // ⚡ TanStack Query: payment data (cached, prefetchable)
  const { tripPayments, paymentsLoading, demoActive, refreshPayments, createPaymentMessage } =
    usePayments(tripId);

  // ⚡ TanStack Query: balance summary (previously useState/useEffect with 4 DB round-trips)
  const { balanceSummary, balanceLoading, refreshBalanceSummary } = useBalanceSummary(tripId);

  // ⚡ TanStack Query: trip members (reuses shared cache instead of separate fetch)
  const {
    tripMembers: rawMembers,
    loading: membersLoading,
    hadMembersError,
    refreshMembers,
  } = useTripMembersQuery(tripId);

  const [showAuthModal, setShowAuthModal] = useState(false);

  // Map TripMember[] to the shape PaymentInput expects
  const tripMembers = useMemo(
    () => rawMembers.map(m => ({ id: m.id, name: m.name, avatar: m.avatar })),
    [rawMembers],
  );

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

  // Handle payment submission — throws on error so PaymentInput does not reset form
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
      const { title, description } = PaymentErrorHandler.getServiceErrorDisplay(result.error);
      toast({
        title,
        description,
        variant: 'destructive',
      });
      throw new Error(description);
    } else {
      throw new Error('Failed to create payment. Please try again.');
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
      {demoLoading ? (
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
      ) : hadMembersError ? (
        <Card className="bg-gradient-to-br from-amber-900/20 to-amber-950/20 border-amber-500/30">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Couldn&apos;t load trip members. This might be a connection issue.
            </p>
            <Button variant="outline" onClick={() => refreshMembers()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <PaymentInput
          onSubmit={handlePaymentSubmit}
          tripMembers={tripMembers}
          isVisible={true}
          tripId={tripId}
        />
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
