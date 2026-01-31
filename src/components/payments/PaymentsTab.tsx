import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { BalanceSummary } from './BalanceSummary';
import { PersonBalanceCard } from './PersonBalanceCard';
import { PaymentHistory } from './PaymentHistory';
import { OutstandingPayments } from './OutstandingPayments';
import { PaymentInput } from './PaymentInput';
import {
  paymentBalanceService,
  BalanceSummary as BalanceSummaryType,
} from '../../services/paymentBalanceService';
import { useAuth } from '../../hooks/useAuth';
import { usePayments } from '../../hooks/usePayments';
import { useToast } from '../../hooks/use-toast';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useConsumerSubscription } from '../../hooks/useConsumerSubscription';
import { useSuperAdmin } from '../../hooks/useSuperAdmin';
import { navigateInApp } from '@/platform/navigation';
import { supabase } from '../../integrations/supabase/client';
import { getTripById } from '../../data/tripsData';
import { demoModeService } from '../../services/demoModeService';
import { tripService } from '../../services/tripService';
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

  // Single source of truth for payment data
  const { tripPayments, paymentsLoading, demoActive, refreshPayments, createPaymentMessage } =
    usePayments(tripId);

  const [balanceSummary, setBalanceSummary] = useState<BalanceSummaryType | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [tripMembers, setTripMembers] = useState<
    Array<{ id: string; name: string; avatar?: string }>
  >([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Demo mode values
  const _isNumericOnly = /^\d+$/.test(tripId);
  const tripIdNum = parseInt(tripId, 10);

  // Fetch trip members (separate from payments)
  useEffect(() => {
    const fetchMembers = async () => {
      if (!tripId) return;

      setMembersLoading(true);
      try {
        if (demoActive) {
          const mockTrip = getTripById(tripIdNum);

          if (mockTrip && mockTrip.participants) {
            const formattedMembers = mockTrip.participants.map(p => ({
              id: String(p.id),
              name: p.name,
              avatar: p.avatar,
            }));
            setTripMembers(formattedMembers);
          } else {
            const demoMembers = demoModeService.getMockMembers(tripId);
            setTripMembers(
              demoMembers.map(m => ({
                id: m.user_id,
                name: m.display_name,
                avatar: m.avatar_url,
              })),
            );
          }
          setMembersLoading(false);
          return;
        }

        // Authenticated mode: Query Supabase
        const membersData = await tripService.getTripMembers(tripId);

        const formattedMembers = membersData.map(m => ({
          id: m.user_id,
          name: m.profiles?.display_name || 'Unknown User',
          avatar: m.profiles?.avatar_url || undefined,
        }));

        // Ensure current user is always in the members list
        let finalMembers = formattedMembers;
        if (user && !formattedMembers.find(m => m.id === user.id)) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', user.id)
            .single();

          finalMembers = [
            {
              id: user.id,
              name: profile?.display_name || user.email?.split('@')[0] || 'Unknown',
              avatar: profile?.avatar_url,
            },
            ...formattedMembers,
          ];
        }

        setTripMembers(finalMembers);
      } catch (error) {
        console.error('Error loading trip members:', error);
      } finally {
        setMembersLoading(false);
      }
    };

    fetchMembers();
  }, [tripId, user, demoActive, tripIdNum]);

  // Subscribe to profile updates for name/avatar changes
  useEffect(() => {
    if (!tripId || demoActive) return;

    const channel = supabase
      .channel(`payments-profiles-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, payload => {
        const next = payload.new as {
          user_id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
        } | null;
        const userId = next?.user_id;
        if (!userId) return;

        setTripMembers(prev =>
          prev.map(m =>
            m.id === userId
              ? {
                  ...m,
                  name: next.display_name ?? m.name,
                  avatar: next.avatar_url ?? m.avatar,
                }
              : m,
          ),
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [tripId, demoActive]);

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

  // Load balance summary
  useEffect(() => {
    if (demoLoading) return;

    const loadBalances = async () => {
      if (demoActive) {
        const mockPayments = demoModeService.getMockPayments(tripId, false);
        const sessionPayments = demoModeService.getSessionPayments(tripId);
        const allPayments = [...mockPayments, ...sessionPayments];
        const mockMembers = demoModeService.getMockMembers(tripId);

        const totalAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);
        const avgPerPerson = totalAmount / Math.max(mockMembers.length, 1);

        setBalanceSummary({
          totalOwed: avgPerPerson * 0.6,
          totalOwedToYou: avgPerPerson * 0.4,
          netBalance: avgPerPerson * 0.2,
          baseCurrency: 'USD',
          balances: mockMembers.slice(0, 3).map((m, i) => ({
            userId: m.user_id,
            userName: m.display_name,
            avatar: m.avatar_url,
            amountOwed:
              (i === 0 ? avgPerPerson * 0.5 : avgPerPerson * 0.3) * (i % 2 === 0 ? 1 : -1),
            amountOwedCurrency: 'USD',
            preferredPaymentMethod: null,
            unsettledPayments: [],
          })),
        });
        setBalanceLoading(false);
        return;
      }

      if (!user?.id) {
        setBalanceSummary({
          totalOwed: 0,
          totalOwedToYou: 0,
          netBalance: 0,
          baseCurrency: 'USD',
          balances: [],
        });
        setBalanceLoading(false);
        return;
      }

      setBalanceLoading(true);
      try {
        const summary = await paymentBalanceService.getBalanceSummary(tripId, user.id);
        setBalanceSummary(summary);
      } catch (error) {
        console.error('Error loading balance summary:', error);
        // Only show access denied for actual permission issues (not transient auth/network errors)
        if (error instanceof Error) {
          const msg = error.message.toLowerCase();
          // Transient auth errors - don't show "access denied", just log and retry later
          if (
            msg.includes('authentication required') ||
            msg.includes('jwt') ||
            msg.includes('network')
          ) {
            console.warn('[PaymentsTab] Transient auth/network error, will retry on next render');
            // Don't show toast - user just needs to be authenticated
          } else if (msg.includes('unauthorized') || msg.includes('not a trip member')) {
            // Genuine permission issue - but verify auth is actually ready
            // If the user is logged in and still getting this, it's a real permission issue
            toast({
              title: 'Access Denied',
              description: "You don't have permission to view payment balances for this trip.",
              variant: 'destructive',
            });
          }
        }
        setBalanceSummary({
          totalOwed: 0,
          totalOwedToYou: 0,
          netBalance: 0,
          baseCurrency: 'USD',
          balances: [],
        });
      } finally {
        setBalanceLoading(false);
      }
    };

    loadBalances();
  }, [tripId, user?.id, demoActive, demoLoading, toast]);

  // Refresh balance summary when payments change
  const refreshBalanceSummary = useCallback(async () => {
    if (demoActive) {
      const mockPayments = demoModeService.getMockPayments(tripId, false);
      const sessionPayments = demoModeService.getSessionPayments(tripId);
      const allPayments = [...mockPayments, ...sessionPayments];
      const mockMembers = demoModeService.getMockMembers(tripId);

      const totalAmount = allPayments.reduce((sum, p) => sum + p.amount, 0);
      const avgPerPerson = totalAmount / Math.max(mockMembers.length, 1);

      setBalanceSummary({
        totalOwed: avgPerPerson * 0.6,
        totalOwedToYou: avgPerPerson * 0.4,
        netBalance: avgPerPerson * 0.2,
        baseCurrency: 'USD',
        balances: mockMembers.slice(0, 3).map((m, i) => ({
          userId: m.user_id,
          userName: m.display_name,
          avatar: m.avatar_url,
          amountOwed: (i === 0 ? avgPerPerson * 0.5 : avgPerPerson * 0.3) * (i % 2 === 0 ? 1 : -1),
          amountOwedCurrency: 'USD',
          preferredPaymentMethod: null,
          unsettledPayments: [],
        })),
      });
      return;
    }

    if (user?.id) {
      try {
        const summary = await paymentBalanceService.getBalanceSummary(tripId, user.id);
        setBalanceSummary(summary);
      } catch (error) {
        console.error('Error refreshing balance summary:', error);
      }
    }
  }, [tripId, user?.id, demoActive]);

  // Unified refresh function for child components
  const handlePaymentUpdated = useCallback(async () => {
    await refreshPayments();
    await refreshBalanceSummary();
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

  // Loading state
  const isLoading = paymentsLoading && balanceLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!balanceSummary) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Unable to load payment information
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
                  onClick={() => navigateInApp('/settings?tab=subscription')}
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
          <p className="text-sm text-muted-foreground">All settled up! No outstanding payments.</p>
        </div>
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
