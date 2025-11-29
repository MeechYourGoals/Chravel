import React, { useEffect, useState, useMemo } from 'react';
import { BalanceSummary } from './BalanceSummary';
import { PersonBalanceCard } from './PersonBalanceCard';
import { PaymentHistory } from './PaymentHistory';
import { PaymentInput } from './PaymentInput';
import { paymentService } from '../../services/paymentService';
import { paymentBalanceService, BalanceSummary as BalanceSummaryType } from '../../services/paymentBalanceService';
import { useAuth } from '../../hooks/useAuth';
import { usePayments } from '../../hooks/usePayments';
import { useToast } from '../../hooks/use-toast';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useConsumerSubscription } from '../../hooks/useConsumerSubscription';
import { supabase } from '../../integrations/supabase/client';
import { getTripById } from '../../data/tripsData';
import { demoModeService } from '../../services/demoModeService';
import { tripService } from '../../services/tripService';
import { AuthModal } from '../AuthModal';
import { Loader2, LogIn, Lock, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { FREEMIUM_LIMITS } from '../../utils/featureTiers';

interface PaymentsTabProps {
  tripId: string;
}

export const PaymentsTab = ({ tripId }: PaymentsTabProps) => {
  const { user } = useAuth();
  const { createPaymentMessage } = usePayments(tripId);
  const { toast } = useToast();
  const { isDemoMode, isLoading: demoLoading } = useDemoMode();
  const { tier, isLoading: tierLoading, upgradeToTier } = useConsumerSubscription();
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummaryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [tripMembers, setTripMembers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [paymentMessages, setPaymentMessages] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // CRITICAL: Only parse as demo trip if tripId is ENTIRELY numeric (not a UUID)
  const isNumericOnly = /^\d+$/.test(tripId);
  const tripIdNum = parseInt(tripId, 10);
  const isConsumerDemoTrip = isNumericOnly && !isNaN(tripIdNum) && tripIdNum >= 1 && tripIdNum <= 12;
  // Only activate demo mode for trips 1-12 if EXPLICITLY in demo mode
  const demoActive = isDemoMode && isConsumerDemoTrip;

  // Fetch trip members and payment messages
  useEffect(() => {
    const fetchData = async () => {
      if (!tripId) return;
      
      setMembersLoading(true);
      try {
        // 🎭 DEMO MODE: Load participants from tripsData.ts (same as Trip Collaborators)
        if (demoActive) {
          const mockTrip = getTripById(tripIdNum);
          
          if (mockTrip && mockTrip.participants) {
            // Transform participants to match expected format
            const formattedMembers = mockTrip.participants.map(p => ({
              id: String(p.id),
              name: p.name,
              avatar: p.avatar
            }));
            setTripMembers(formattedMembers);
          } else {
            // Fallback to generic demo members if trip not found
            const demoMembers = demoModeService.getMockMembers(tripId);
            setTripMembers(demoMembers.map(m => ({
              id: m.user_id,
              name: m.display_name,
              avatar: m.avatar_url
            })));
          }
          
          // Demo payments
          const demoPayments = demoModeService.getMockPayments(tripId, false);
          setPaymentMessages(demoPayments);
          setMembersLoading(false);
          return;
        }
        
        // 🔐 AUTHENTICATED MODE: Query Supabase
        const [membersData, paymentsData] = await Promise.all([
          tripService.getTripMembers(tripId),
          paymentService.getTripPaymentMessages(tripId)
        ]);
        
        // Format members from getTripMembers return structure
        const formattedMembers = membersData.map(m => ({
          id: m.user_id,
          name: m.profiles?.display_name || m.profiles?.email?.split('@')[0] || 'Unknown User',
          avatar: m.profiles?.avatar_url || undefined
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
              avatar: profile?.avatar_url
            },
            ...formattedMembers
          ];
        }
        
        setTripMembers(finalMembers);
        setPaymentMessages(paymentsData);
      } catch (error) {
        console.error('Error loading payment data:', error);
        toast({
          title: "Error",
          description: "Failed to load payment information",
          variant: "destructive"
        });
      } finally {
        setMembersLoading(false);
      }
    };

    fetchData();
  }, [tripId, user, demoActive]);

  // Count user's payment requests for this trip
  const userPaymentCount = useMemo(() => {
    return paymentMessages.filter(p => p.createdBy === user?.id).length;
  }, [paymentMessages, user]);

  const paymentLimit = tier === 'free' ? 5 : -1;
  const remainingPayments = paymentLimit === -1 ? -1 : Math.max(0, paymentLimit - userPaymentCount);
  const canCreateMorePayments = paymentLimit === -1 || userPaymentCount < paymentLimit;

  // Calculate payment summary
  const paymentSummary = useMemo(() => {
    if (!user || paymentMessages.length === 0) {
      return {
        totalPaid: 0,
        totalOwed: 0,
        totalOwedToYou: 0,
        totalYouOwe: 0,
        isSettled: true
      };
    }

    // Simple balance calculation from payment messages
    let totalPaid = 0;
    let totalOwed = 0;
    let totalOwedToYou = 0;
    let totalYouOwe = 0;

    paymentMessages.forEach(payment => {
      if (payment.createdBy === user.id) {
        totalPaid += payment.amount;
        if (!payment.isSettled) {
          totalOwedToYou += payment.amount / payment.splitCount * (payment.splitCount - 1);
        }
      } else {
        if (!payment.isSettled) {
          totalYouOwe += payment.amount / payment.splitCount;
        }
      }
    });

    totalOwed = totalOwedToYou + totalYouOwe;
    const isSettled = totalOwed === 0;

    return {
      totalPaid,
      totalOwed,
      totalOwedToYou,
      totalYouOwe,
      isSettled
    };
  }, [paymentMessages, user]);

  // Load balances
  useEffect(() => {
    if (demoLoading) return;
    
    const loadBalances = async () => {
      // Demo mode: use mock data
      if (demoActive) {
        // ⚡ OPTIMIZATION: Synchronous demo data loading
        const mockPayments = demoModeService.getMockPayments(tripId, false);
        const mockMembers = demoModeService.getMockMembers(tripId);
        
        // Compute simple demo balance summary
        const totalAmount = mockPayments.reduce((sum, p) => sum + p.amount, 0);
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
            unsettledPayments: []
          }))
        });
        setLoading(false);
        return;
      }
      
      if (!user?.id) {
          setBalanceSummary({
            totalOwed: 0,
            totalOwedToYou: 0,
            netBalance: 0,
            baseCurrency: 'USD',
            balances: []
          });
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const summary = await paymentBalanceService.getBalanceSummary(tripId, user.id);
        setBalanceSummary(summary);
      } catch (error) {
        console.error('Error loading balance summary:', error);
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to view payment balances for this trip.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to load payment balances.",
            variant: "destructive"
          });
        }
          setBalanceSummary({
            totalOwed: 0,
            totalOwedToYou: 0,
            netBalance: 0,
            baseCurrency: 'USD',
            balances: []
          });
      } finally {
        setLoading(false);
      }
    };

    loadBalances();
  }, [tripId, user?.id, demoActive, demoLoading]);

  const handlePaymentSubmit = async (paymentData: {
    amount: number;
    currency: string;
    description: string;
    splitCount: number;
    splitParticipants: string[];
    paymentMethods: string[];
  }) => {
    // Demo mode: use session storage
    if (demoActive) {
      const paymentId = demoModeService.addSessionPayment(tripId, paymentData);
      
      if (paymentId) {
        toast({
          title: "Payment request created (Demo)",
          description: `${paymentData.description} - $${paymentData.amount}`,
        });
        
        // Refresh balances with session payments included
        // ⚡ OPTIMIZATION: Synchronous demo data loading
        const mockPayments = demoModeService.getMockPayments(tripId, false);
        const sessionPayments = demoModeService.getSessionPayments(tripId);
        const allPayments = [...mockPayments, ...sessionPayments];
        
        // Recompute balance summary
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
            unsettledPayments: []
          }))
        });
      }
      return;
    }

    // Production mode: use database
    const paymentId = await createPaymentMessage(paymentData);
    
    if (paymentId) {
      toast({
        title: "Payment request created",
        description: `${paymentData.description} - $${paymentData.amount}`,
      });
      
      // Refresh balance summary
      if (user?.id) {
        try {
          const summary = await paymentBalanceService.getBalanceSummary(tripId, user.id);
          setBalanceSummary(summary);
        } catch (error) {
          console.error('Error refreshing balance summary:', error);
          // Don't show toast here - user just created a payment, don't interrupt with error
          // The next time they visit the tab, the error will be shown
        }
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to create payment request",
        variant: "destructive"
      });
    }
  };

  if (loading) {
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
      {paymentSummary.isSettled && paymentMessages.length > 0 && (
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
      ) : !canCreateMorePayments && tier === 'free' ? (
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
          {tier === 'free' && remainingPayments > 0 && remainingPayments !== -1 && (
            <div className="flex items-center justify-between bg-blue-900/20 border border-blue-500/30 rounded-lg px-4 py-2 mb-2">
              <span className="text-sm text-blue-300">
                {remainingPayments} of 5 payment requests remaining
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/settings?tab=subscription'}
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
            <PersonBalanceCard 
              key={balance.userId} 
              balance={balance}
              tripId={tripId}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            All settled up! No outstanding payments.
          </p>
        </div>
      )}

      {/* Payment History */}
      <PaymentHistory tripId={tripId} />

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </div>
  );
};
