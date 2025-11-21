import React, { useEffect, useState } from 'react';
import { BalanceSummary } from './BalanceSummary';
import { PersonBalanceCard } from './PersonBalanceCard';
import { PaymentHistory } from './PaymentHistory';
import { PaymentInput } from './PaymentInput';
import { paymentBalanceService, BalanceSummary as BalanceSummaryType } from '../../services/paymentBalanceService';
import { useAuth } from '../../hooks/useAuth';
import { usePayments } from '../../hooks/usePayments';
import { useToast } from '../../hooks/use-toast';
import { useDemoMode } from '../../hooks/useDemoMode';
import { supabase } from '../../integrations/supabase/client';
import { getTripById } from '../../data/tripsData';
import { demoModeService } from '../../services/demoModeService';
import { AuthModal } from '../AuthModal';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '../ui/button';

interface PaymentsTabProps {
  tripId: string;
}

export const PaymentsTab = ({ tripId }: PaymentsTabProps) => {
  const { user } = useAuth();
  const { createPaymentMessage } = usePayments(tripId);
  const { toast } = useToast();
  const { isDemoMode, isLoading: demoLoading } = useDemoMode();
  const [balanceSummary, setBalanceSummary] = useState<BalanceSummaryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [tripMembers, setTripMembers] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Consumer trips (1-12) are ALWAYS in demo mode for testing/investors
  const tripIdNum = parseInt(tripId);
  const demoActive = isDemoMode || (tripIdNum >= 1 && tripIdNum <= 12);

  // Load trip members - use tripsData for consumer trips (1-12), DB for others
  useEffect(() => {
    if (demoLoading) return; // Wait for demo mode to initialize
    
    const loadMembers = async () => {
      const tripIdNum = parseInt(tripId);
      
      // Consumer trips (1-12): use tripsData
      if (tripIdNum >= 1 && tripIdNum <= 12) {
        const trip = getTripById(tripIdNum);
        if (trip?.participants) {
          const formattedMembers = trip.participants.map(p => ({
            id: p.id.toString(),
            name: p.name,
            avatar: p.avatar
          }));
          setTripMembers(formattedMembers);
          return;
        }
      }
      
      // Other trips: two-step fetch to avoid RLS and FK issues
      try {
        // Step 1: Get user_ids from trip_members
        const { data: memberIds, error: memberError } = await supabase
          .from('trip_members')
          .select('user_id')
          .eq('trip_id', tripId);

        if (memberError || !memberIds || memberIds.length === 0) {
          console.warn('No trip members found or error:', memberError);
          setTripMembers([]);
          return;
        }

        const userIds = memberIds.map(m => m.user_id);

        // Step 2: Get profiles for those user_ids
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('user_id, display_name, avatar_url')
          .in('user_id', userIds);

        if (profileError) {
          console.warn('Error fetching profiles:', profileError);
          setTripMembers([]);
          return;
        }

        const formattedMembers = (profiles || []).map(p => ({
          id: p.user_id,
          name: p.display_name || 'Unknown User',
          avatar: p.avatar_url || undefined
        }));

        setTripMembers(formattedMembers);
      } catch (error) {
        console.error('Error loading trip members:', error);
        setTripMembers([]);
      }
    };

    loadMembers();
  }, [tripId, demoLoading]);

  // Load balances
  useEffect(() => {
    if (demoLoading) return; // Wait for demo mode to initialize
    
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
      ) : (
        <PaymentInput
          onSubmit={handlePaymentSubmit}
          tripMembers={tripMembers}
          isVisible={true}
          tripId={tripId}
        />
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
