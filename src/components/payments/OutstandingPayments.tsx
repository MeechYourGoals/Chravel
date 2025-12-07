import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { supabase } from '../../integrations/supabase/client';
import { paymentService } from '../../services/paymentService';
import { demoModeService } from '../../services/demoModeService';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/use-toast';
import { format } from 'date-fns';
import { Loader2, Clock, Users } from 'lucide-react';

interface PaymentSplit {
  id: string;
  debtor_user_id: string;
  amount_owed: number;
  is_settled: boolean;
  settled_at: string | null;
  debtor_name?: string;
  debtor_avatar?: string;
}

interface OutstandingPayment {
  id: string;
  description: string;
  amount: number;
  currency: string;
  splitCount: number;
  createdBy: string;
  createdAt: string;
  isSettled: boolean;
  splits: PaymentSplit[];
  settledCount: number;
}

interface OutstandingPaymentsProps {
  tripId: string;
  onPaymentUpdated?: () => void;
}

export const OutstandingPayments = ({ tripId, onPaymentUpdated }: OutstandingPaymentsProps) => {
  const [payments, setPayments] = useState<OutstandingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  const { toast } = useToast();

  const isNumericOnly = /^\d+$/.test(tripId);
  const tripIdNum = parseInt(tripId, 10);
  const demoActive = isDemoMode && isNumericOnly && tripIdNum >= 1 && tripIdNum <= 12;

  const loadPayments = async () => {
    setLoading(true);
    try {
      // Get payment messages
      const paymentMessages = await paymentService.getTripPaymentMessages(tripId);
      
      // Filter to only unsettled payments
      const unsettledPayments = paymentMessages.filter(p => !p.isSettled);

      if (unsettledPayments.length === 0) {
        setPayments([]);
        setLoading(false);
        return;
      }

      // For demo mode, create mock splits
      if (demoActive) {
        const mockMembers = demoModeService.getMockMembers(tripId);
        const paymentsWithSplits = unsettledPayments.map(payment => {
          const splits: PaymentSplit[] = payment.splitParticipants.map((participantId, idx) => {
            const member = mockMembers.find(m => m.user_id === participantId);
            return {
              id: `demo-split-${payment.id}-${idx}`,
              debtor_user_id: participantId,
              amount_owed: payment.amount / payment.splitCount,
              is_settled: false,
              settled_at: null,
              debtor_name: member?.display_name || `Participant ${idx + 1}`,
              debtor_avatar: member?.avatar_url
            };
          });

          return {
            ...payment,
            splits,
            settledCount: 0
          };
        });

        setPayments(paymentsWithSplits);
        setLoading(false);
        return;
      }

      // Authenticated mode: fetch real splits
      const paymentIds = unsettledPayments.map(p => p.id);
      const { data: splitsData, error: splitsError } = await supabase
        .from('payment_splits')
        .select('*')
        .in('payment_message_id', paymentIds);

      if (splitsError) throw splitsError;

      // Get debtor profiles
      const debtorIds = [...new Set((splitsData || []).map(s => s.debtor_user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', debtorIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Map splits to payments
      const paymentsWithSplits = unsettledPayments.map(payment => {
        const paymentSplits = (splitsData || [])
          .filter(s => s.payment_message_id === payment.id)
          .map(s => {
            const profile = profileMap.get(s.debtor_user_id);
            return {
              id: s.id,
              debtor_user_id: s.debtor_user_id,
              amount_owed: parseFloat(s.amount_owed.toString()),
              is_settled: s.is_settled,
              settled_at: s.settled_at,
              debtor_name: profile?.display_name || 'Unknown',
              debtor_avatar: profile?.avatar_url
            };
          });

        return {
          ...payment,
          splits: paymentSplits,
          settledCount: paymentSplits.filter(s => s.is_settled).length
        };
      });

      setPayments(paymentsWithSplits);
    } catch (error) {
      console.error('Error loading outstanding payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [tripId, isDemoMode]);

  const handleSettleSplit = async (splitId: string, paymentId: string) => {
    if (demoActive) {
      // Demo mode: just update local state
      setPayments(prev => prev.map(payment => {
        if (payment.id === paymentId) {
          const updatedSplits = payment.splits.map(s => 
            s.id === splitId ? { ...s, is_settled: true, settled_at: new Date().toISOString() } : s
          );
          const newSettledCount = updatedSplits.filter(s => s.is_settled).length;
          return {
            ...payment,
            splits: updatedSplits,
            settledCount: newSettledCount,
            isSettled: newSettledCount === updatedSplits.length
          };
        }
        return payment;
      }));
      toast({ title: "Marked as paid", description: "Payment status updated" });
      return;
    }

    // Authenticated mode: update database
    const success = await paymentService.settlePayment(splitId, 'manual');
    if (success) {
      toast({ title: "Marked as paid", description: "Payment status updated" });
      await loadPayments();
      onPaymentUpdated?.();
    } else {
      toast({ title: "Error", description: "Failed to update payment status", variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) {
    return null; // Don't show section if no outstanding payments
  }

  return (
    <Card className="rounded-lg border-amber-500/30 bg-gradient-to-br from-amber-900/10 to-amber-950/10">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" />
          <CardTitle className="text-base text-amber-100">Outstanding Payments</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Track who has paid and mark as settled
        </p>
      </CardHeader>
      <CardContent className="py-2 px-4 space-y-3">
        {payments.map(payment => {
          const isCreator = user?.id === payment.createdBy;
          
          return (
            <div key={payment.id} className="bg-card/50 rounded-lg p-3 border border-border">
              {/* Payment Header */}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="font-medium text-foreground">{payment.description}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-300 border-amber-500/30">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {payment.settledCount}/{payment.splits.length} paid
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-foreground">
                    {formatCurrency(payment.amount, payment.currency)}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(payment.amount / payment.splitCount, payment.currency)}/person
                  </p>
                </div>
              </div>

              {/* Splits List - only show to creator */}
              {isCreator && (
                <div className="space-y-1 mt-2 pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Mark who has paid:</p>
                  {payment.splits.map(split => (
                    <div key={split.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={split.is_settled}
                          onCheckedChange={() => {
                            if (!split.is_settled) {
                              handleSettleSplit(split.id, payment.id);
                            }
                          }}
                          disabled={split.is_settled}
                        />
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={split.debtor_avatar} />
                          <AvatarFallback className="text-xs">
                            {split.debtor_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`text-sm ${split.is_settled ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {split.debtor_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(split.amount_owed, payment.currency)}
                        </span>
                        {split.is_settled && (
                          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                            Paid
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Non-creator view */}
              {!isCreator && (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>Split among {payment.splitCount} people</span>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
