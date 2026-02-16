import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Plus, DollarSign, CheckCircle, Clock, AlertCircle, Lock, Loader2, ArrowUpRight, ArrowDownLeft, RefreshCw } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from './PullToRefreshIndicator';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { hapticService } from '@/services/hapticService';
import { safeReload } from '@/utils/safeReload';
import { CreatePaymentModal } from './CreatePaymentModal';
import { demoModeService } from '@/services/demoModeService';
import { paymentService } from '@/services/paymentService';
import { paymentBalanceService, BalanceSummary as BalanceSummaryType } from '@/services/paymentBalanceService';
import { tripService } from '@/services/tripService';
import { supabase } from '@/integrations/supabase/client';
import { getTripById } from '@/data/tripsData';
import { useDemoMode } from '@/hooks/useDemoMode';
import { useConsumerSubscription } from '@/hooks/useConsumerSubscription';
import { useAuth } from '@/hooks/useAuth';
import { getConsistentAvatar, getInitials } from '@/utils/avatarUtils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { tripKeys, QUERY_CACHE_CONFIG } from '@/lib/queryKeys';

interface Payment {
  id: string;
  payer: string;
  payerId: string;
  payerAvatar: string;
  amount: number;
  currency: string;
  description: string;
  status: 'settled' | 'pending' | 'overdue';
  splitWith: string[];
  splitCount: number;
  date: string;
  isSettled: boolean;
}

interface MobileTripPaymentsProps {
  tripId: string;
}

/**
 * iOS-optimized mobile payments view
 * Shows payment splits, settlements, and status
 * Uses same data source as desktop (Supabase for auth, mock for demo)
 */
export const MobileTripPayments = ({ tripId }: MobileTripPaymentsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isDemoMode, isLoading: demoLoading } = useDemoMode();
  const { tier, upgradeToTier } = useConsumerSubscription();
  
  // ⚡ PERFORMANCE: Timeout state to prevent indefinite spinners
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // CRITICAL: Match desktop logic exactly for demo mode detection
  const isNumericOnly = /^\d+$/.test(tripId);
  const tripIdNum = parseInt(tripId, 10);
  const isConsumerDemoTrip = isNumericOnly && !isNaN(tripIdNum) && tripIdNum >= 1 && tripIdNum <= 12;
  const demoActive = isDemoMode && isConsumerDemoTrip;

  // ⚡ PERFORMANCE: TanStack Query for authenticated payment data
  // This enables prefetch cache warming + instant re-visits
  const { data: authPaymentData, isLoading: authQueryLoading, refetch: refetchPayments } = useQuery({
    queryKey: tripKeys.payments(tripId),
    queryFn: async () => {
      // ⚡ Parallel fetch: members (creator-guaranteed) + payments + user profile + balance
      const [membersData, paymentsData, userProfileResult] = await Promise.all([
        tripService.getTripMembersWithCreator(tripId),
        paymentService.getTripPaymentMessages(tripId),
        // Pre-fetch user profile in parallel (in case user isn't in members list)
        user ? supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('user_id', user.id)
          .single() : Promise.resolve({ data: null }),
      ]);

      // getTripMembersWithCreator guarantees creator is always in the list
      const formattedMembers = membersData.members.map(m => ({
        id: m.id,
        name: m.name,
        avatar: m.avatar,
      }));

      // Ensure current user is in members list when viewing (e.g. shared trip)
      let finalMembers = formattedMembers;
      if (user && !formattedMembers.find(m => m.id === user.id)) {
        const profile = userProfileResult?.data;
        finalMembers = [
          {
            id: user.id,
            name: profile?.display_name || user.email?.split('@')[0] || 'Unknown',
            avatar: profile?.avatar_url || undefined,
          },
          ...formattedMembers,
        ];
      }

      // Convert Supabase payments to Payment format
      const convertedPayments: Payment[] = paymentsData.map(p => {
        const payerProfile = finalMembers.find(m => m.id === p.createdBy);
        return {
          id: p.id,
          payer: payerProfile?.name || 'Unknown',
          payerId: p.createdBy,
          payerAvatar: payerProfile?.avatar || getConsistentAvatar(payerProfile?.name || 'Unknown'),
          amount: p.amount,
          currency: p.currency,
          description: p.description,
          status: p.isSettled ? ('settled' as const) : ('pending' as const),
          splitWith: p.splitParticipants,
          splitCount: p.splitCount,
          date: p.createdAt,
          isSettled: p.isSettled,
        };
      });

      // ⚡ Fetch balance summary in parallel with the rest
      let balanceSummary: BalanceSummaryType | null = null;
      if (user?.id) {
        try {
          balanceSummary = await paymentBalanceService.getBalanceSummary(tripId, user.id);
        } catch (error) {
          console.error('Error loading balance summary:', error);
          balanceSummary = {
            totalOwed: 0,
            totalOwedToYou: 0,
            netBalance: 0,
            baseCurrency: 'USD',
            balances: [],
          };
        }
      }

      return { members: finalMembers, payments: convertedPayments, balanceSummary };
    },
    enabled: !demoActive && !demoLoading && !!user,
    staleTime: QUERY_CACHE_CONFIG.payments.staleTime,
    gcTime: QUERY_CACHE_CONFIG.payments.gcTime,
    refetchOnWindowFocus: QUERY_CACHE_CONFIG.payments.refetchOnWindowFocus,
  });

  // Demo mode state (unchanged logic, just separated from auth flow)
  const [demoMembers, setDemoMembers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [demoPayments, setDemoPayments] = useState<Payment[]>([]);
  const [demoBalance, setDemoBalance] = useState<BalanceSummaryType | null>(null);
  const [demoDataLoaded, setDemoDataLoaded] = useState(false);

  useEffect(() => {
    if (!demoActive || demoLoading) return;

    const mockTrip = getTripById(tripIdNum);
    const mockMembers = demoModeService.getMockMembers(tripId);

    let formattedMembers: Array<{ id: string; name: string; avatar?: string }>;
    if (mockTrip && mockTrip.participants) {
      formattedMembers = mockTrip.participants.map(p => ({
        id: String(p.id),
        name: p.name,
        avatar: p.avatar,
      }));
    } else {
      formattedMembers = mockMembers.map(m => ({
        id: m.user_id,
        name: m.display_name,
        avatar: m.avatar_url,
      }));
    }
    setDemoMembers(formattedMembers);

    const getPayerName = (createdBy: string, createdByName?: string): string => {
      if (createdByName) return createdByName;
      const member = formattedMembers.find(m => m.id === createdBy);
      if (member) return member.name;
      const mockMember = mockMembers.find(m => m.user_id === createdBy);
      return mockMember?.display_name || 'Unknown';
    };

    const rawDemoPayments = demoModeService.getMockPayments(tripId, false);
    const sessionPayments = demoModeService.getSessionPayments(tripId);

    const convertedSessionPayments: Payment[] = sessionPayments.map(p => ({
      id: p.id,
      payer: p.createdByName || getPayerName(p.created_by),
      payerId: p.created_by || 'demo-user',
      payerAvatar: getConsistentAvatar(p.createdByName || getPayerName(p.created_by)),
      amount: p.amount,
      currency: p.currency || 'USD',
      description: p.description,
      status: p.is_settled ? ('settled' as const) : ('pending' as const),
      splitWith: p.split_participants || [],
      splitCount: p.split_count || 1,
      date: p.created_at,
      isSettled: p.is_settled || false,
    }));

    const convertedMockPayments: Payment[] = rawDemoPayments.map(p => ({
      id: p.id,
      payer: getPayerName(p.created_by),
      payerId: p.created_by,
      payerAvatar: getConsistentAvatar(getPayerName(p.created_by)),
      amount: p.amount,
      currency: p.currency || 'USD',
      description: p.description,
      status: p.is_settled ? ('settled' as const) : ('pending' as const),
      splitWith: p.split_participants || [],
      splitCount: p.split_count || 1,
      date: p.created_at,
      isSettled: p.is_settled || false,
    }));

    setDemoPayments([...convertedSessionPayments, ...convertedMockPayments]);

    const allDemoPayments = [...sessionPayments, ...rawDemoPayments];
    const totalAmount = allDemoPayments.reduce((sum, p) => sum + p.amount, 0);
    const avgPerPerson = totalAmount / Math.max(mockMembers.length, 1);

    setDemoBalance({
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

    setDemoDataLoaded(true);
  }, [tripId, demoActive, demoLoading, tripIdNum]);

  // ⚡ Unified data accessors — demo or auth
  const tripMembers = demoActive ? demoMembers : (authPaymentData?.members ?? []);
  const payments = demoActive ? demoPayments : (authPaymentData?.payments ?? []);
  const balanceSummary = demoActive ? demoBalance : (authPaymentData?.balanceSummary ?? null);
  const isLoading = demoActive ? (!demoDataLoaded && !demoLoading) : authQueryLoading;
  const membersLoading = isLoading;

  // Count user's payment requests
  const userPaymentCount = useMemo(() => {
    return payments.filter(p => p.payerId === user?.id).length;
  }, [payments, user]);

  const paymentLimit = tier === 'free' ? 5 : -1;
  const remainingPayments = paymentLimit === -1 ? -1 : Math.max(0, paymentLimit - userPaymentCount);
  const canCreateMorePayments = paymentLimit === -1 || userPaymentCount < paymentLimit;

  // Split payments into outstanding and completed
  const outstandingPayments = useMemo(() => payments.filter(p => !p.isSettled), [payments]);
  const completedPayments = useMemo(() => payments.filter(p => p.isSettled), [payments]);

  // ⚡ PERFORMANCE: 10-second timeout to prevent indefinite spinners
  useEffect(() => {
    if (isLoading && !hasTimedOut) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn('[MobileTripPayments] Query timeout - showing fallback UI');
        setHasTimedOut(true);
      }, 10000);
    }
    
    // Clear timeout when loading completes
    if (!isLoading && loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
      setHasTimedOut(false);
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading, hasTimedOut]);

  // Retry function for timeout state
  const handleRetryAfterTimeout = useCallback(() => {
    setHasTimedOut(false);
    if (demoActive) {
      safeReload();
    } else {
      refetchPayments();
    }
  }, [demoActive, refetchPayments]);

  // Subscribe to profile updates — invalidate query cache for instant avatar/name refresh
  useEffect(() => {
    if (!tripId || demoActive) return;

    const channel = supabase
      .channel(`mobile-payments-profiles-${tripId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          // Invalidate the payments query so it refetches with updated profile data
          queryClient.invalidateQueries({ queryKey: tripKeys.payments(tripId) });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {
        // ignore
      });
    };
  }, [tripId, demoActive, queryClient]);

  const handleAddPayment = async () => {
    await hapticService.medium();
    setIsModalOpen(true);
  };

  const handlePaymentCreated = useCallback(async () => {
    if (demoActive) {
      // Re-trigger demo data load
      const rawDemoPayments = demoModeService.getMockPayments(tripId, false);
      const sessionPayments = demoModeService.getSessionPayments(tripId);
      const mockMembers = demoModeService.getMockMembers(tripId);

      const getPayerName = (createdBy: string, createdByName?: string): string => {
        if (createdByName) return createdByName;
        const member = tripMembers.find(m => m.id === createdBy);
        if (member) return member.name;
        const mockMember = mockMembers.find(m => m.user_id === createdBy);
        return mockMember?.display_name || 'Unknown';
      };

      const convertedSessionPayments: Payment[] = sessionPayments.map(p => ({
        id: p.id,
        payer: p.createdByName || getPayerName(p.created_by),
        payerId: p.created_by || 'demo-user',
        payerAvatar: getConsistentAvatar(p.createdByName || getPayerName(p.created_by)),
        amount: p.amount,
        currency: p.currency || 'USD',
        description: p.description,
        status: p.is_settled ? ('settled' as const) : ('pending' as const),
        splitWith: p.split_participants || [],
        splitCount: p.split_count || 1,
        date: p.created_at,
        isSettled: p.is_settled || false,
      }));

      const convertedMockPayments: Payment[] = rawDemoPayments.map(p => ({
        id: p.id,
        payer: getPayerName(p.created_by),
        payerId: p.created_by,
        payerAvatar: getConsistentAvatar(getPayerName(p.created_by)),
        amount: p.amount,
        currency: p.currency || 'USD',
        description: p.description,
        status: p.is_settled ? ('settled' as const) : ('pending' as const),
        splitWith: p.split_participants || [],
        splitCount: p.split_count || 1,
        date: p.created_at,
        isSettled: p.is_settled || false,
      }));

      setDemoPayments([...convertedSessionPayments, ...convertedMockPayments]);
    } else {
      // ⚡ Invalidate TanStack Query cache — refetches members + payments + balance in one call
      await queryClient.invalidateQueries({ queryKey: tripKeys.payments(tripId) });
    }
  }, [tripId, demoActive, tripMembers, queryClient]);

  const handlePaymentTap = async (paymentId: string) => {
    await hapticService.light();
    // TODO: Open payment detail modal
  };

  const handleRefresh = useCallback(async () => {
    if (demoActive) {
      handleRetryAfterTimeout();
    } else {
      await refetchPayments();
    }
  }, [demoActive, handleRetryAfterTimeout, refetchPayments]);

  const { isRefreshing, pullDistance } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    maxPullDistance: 120,
  });

  const getStatusIcon = (status: Payment['status']) => {
    switch (status) {
      case 'settled':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-500" />;
      case 'overdue':
        return <AlertCircle size={16} className="text-red-500" />;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // ⚡ PERFORMANCE: Show timeout UI instead of indefinite spinner
  if (hasTimedOut && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black py-12 px-4">
        <AlertCircle className="w-10 h-10 text-yellow-500 mb-3" />
        <h3 className="text-lg font-semibold text-white mb-2">Taking longer than expected</h3>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Payments are slow to load. This might be a connection issue.
        </p>
        <button
          onClick={handleRetryAfterTimeout}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  if (isLoading || demoLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <span className="text-sm text-muted-foreground">Loading payments...</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full bg-black">
      {(isRefreshing || pullDistance > 0) && (
        <PullToRefreshIndicator
          isRefreshing={isRefreshing}
          pullDistance={pullDistance}
          threshold={80}
        />
      )}
      {/* Balance Summary Card - Matching desktop structure */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-card/50 border border-border rounded-xl p-4">
          <div className="grid grid-cols-3 gap-3">
            {/* You Owe */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ArrowUpRight size={14} className="text-orange-500" />
                <span className="text-xs text-muted-foreground">You Owe</span>
              </div>
              <p className="text-lg font-bold text-orange-500">
                {formatCurrency(balanceSummary?.totalOwed || 0)}
              </p>
            </div>
            
            {/* You Are Owed */}
            <div className="text-center border-x border-border">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ArrowDownLeft size={14} className="text-green-500" />
                <span className="text-xs text-muted-foreground">You're Owed</span>
              </div>
              <p className="text-lg font-bold text-green-500">
                {formatCurrency(balanceSummary?.totalOwedToYou || 0)}
              </p>
            </div>
            
            {/* Net Balance */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign size={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Net</span>
              </div>
              <p className={`text-lg font-bold ${
                (balanceSummary?.netBalance || 0) >= 0 ? 'text-green-500' : 'text-orange-500'
              }`}>
                {formatCurrency(balanceSummary?.netBalance || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 native-scroll mobile-safe-scroll">
        {payments.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign size={48} className="text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium text-muted-foreground mb-2">No payments yet</h4>
            <p className="text-muted-foreground text-sm">
              Split expenses and track who owes what
            </p>
          </div>
        ) : (
          <>
            {/* Outstanding Payments Section */}
            {outstandingPayments.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-yellow-500" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Outstanding Payments
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ({outstandingPayments.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {outstandingPayments.map((payment) => (
                    <PaymentCard
                      key={payment.id}
                      payment={payment}
                      onTap={handlePaymentTap}
                      formatCurrency={formatCurrency}
                      getStatusIcon={getStatusIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Payments Section */}
            {completedPayments.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Completed Payments
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    ({completedPayments.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {completedPayments.map((payment) => (
                    <PaymentCard
                      key={payment.id}
                      payment={payment}
                      onTap={handlePaymentTap}
                      formatCurrency={formatCurrency}
                      getStatusIcon={getStatusIcon}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Payment FAB with Limit Check */}
      <div className="sticky bottom-0 px-4 py-2 pb-[env(safe-area-inset-bottom)] bg-gradient-to-t from-black via-black to-transparent border-t border-border">
        {tier === 'free' && remainingPayments > 0 && remainingPayments !== -1 && (
          <div className="text-center text-xs text-blue-400 mb-2">
            {remainingPayments} of 5 payment requests remaining
          </div>
        )}
        {!canCreateMorePayments && tier === 'free' ? (
          <button
            onClick={async () => {
              await hapticService.light();
              upgradeToTier('explorer', 'monthly');
            }}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-500 text-white font-medium py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Lock size={20} />
            Upgrade for Unlimited Payments
          </button>
        ) : (
          <button
            onClick={handleAddPayment}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 min-h-[44px]"
          >
            <Plus size={20} />
            Add Payment Request
          </button>
        )}
      </div>

      {/* Create Payment Modal */}
      <CreatePaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tripId={tripId}
        tripMembers={tripMembers}
        onPaymentCreated={handlePaymentCreated}
      />
    </div>
  );
};

// Extracted PaymentCard component for cleaner code
interface PaymentCardProps {
  payment: Payment;
  onTap: (id: string) => void;
  formatCurrency: (amount: number, currency?: string) => string;
  getStatusIcon: (status: Payment['status']) => React.ReactNode;
}

const PaymentCard: React.FC<PaymentCardProps> = ({
  payment,
  onTap,
  formatCurrency,
  getStatusIcon
}) => {
  return (
    <button
      onClick={() => onTap(payment.id)}
      className={`w-full border rounded-xl p-3 transition-all active:scale-[0.98] text-left ${
        payment.isSettled 
          ? 'bg-green-500/5 border-green-500/20 hover:bg-green-500/10' 
          : 'bg-card/50 border-border hover:bg-card/80'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Payer Avatar */}
        <Avatar className="w-9 h-9">
          <AvatarImage src={payment.payerAvatar} alt={payment.payer} />
          <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">
            {getInitials(payment.payer)}
          </AvatarFallback>
        </Avatar>

        {/* Payment Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {payment.description}
              </p>
              <p className="text-xs text-muted-foreground">
                Paid by {payment.payer}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(payment.amount, payment.currency)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(payment.amount / payment.splitCount, payment.currency)} each
              </p>
            </div>
          </div>

          {/* Status and Split Info */}
          <div className="flex items-center justify-between mt-1.5">
            <div className="flex items-center gap-1.5">
              {getStatusIcon(payment.status)}
              <span className={`text-xs ${
                payment.isSettled ? 'text-green-500' : 'text-yellow-500'
              }`}>
                {payment.isSettled ? 'Settled' : 'Pending'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Split {payment.splitCount} ways
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};
