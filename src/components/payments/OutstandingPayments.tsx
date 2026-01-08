import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { supabase } from '../../integrations/supabase/client';
import { paymentService } from '../../services/paymentService';
import { demoModeService } from '../../services/demoModeService';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/use-toast';
import { Loader2, Clock, Users, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { EditPaymentDialog } from './EditPaymentDialog';
import * as haptics from '@/native/haptics';

interface PaymentSplit {
  id: string;
  debtor_user_id: string;
  amount_owed: number;
  is_settled: boolean;
  settled_at: string | null;
  debtor_name?: string;
  debtor_avatar?: string;
}

interface PaymentMethodDetail {
  method: string;
  displayName: string;
  identifier: string;
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
  paymentMethods: string[];
  creatorPaymentDetails: PaymentMethodDetail[];
  splitParticipants?: string[];
}

interface TripMember {
  id: string;
  name: string;
  avatar?: string;
}

interface OutstandingPaymentsProps {
  tripId: string;
  tripMembers?: TripMember[];
  onPaymentUpdated?: () => void;
  refreshTrigger?: number;
}

// Map method types to display names
const METHOD_DISPLAY_NAMES: Record<string, string> = {
  venmo: 'Venmo',
  paypal: 'PayPal',
  zelle: 'Zelle',
  cashapp: 'Cash App',
  applepay: 'Apple Pay',
  applecash: 'Apple Cash',
  cash: 'Cash',
  other: 'Other'
};

export const OutstandingPayments = ({ tripId, tripMembers = [], onPaymentUpdated, refreshTrigger = 0 }: OutstandingPaymentsProps) => {
  const [payments, setPayments] = useState<OutstandingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPayment, setEditingPayment] = useState<OutstandingPayment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
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

      // Get unique creator IDs
      const creatorIds = [...new Set(unsettledPayments.map(p => p.createdBy))];

      // For demo mode, create mock splits and payment methods
      if (demoActive) {
        const mockMembers = demoModeService.getMockMembers(tripId);
        
        // Mock creator payment methods for demo
        const mockCreatorMethods: Record<string, PaymentMethodDetail[]> = {};
        creatorIds.forEach(creatorId => {
          mockCreatorMethods[creatorId] = [
            { method: 'venmo', displayName: 'Venmo', identifier: '@demo-user' },
            { method: 'paypal', displayName: 'PayPal', identifier: 'demo@email.com' },
            { method: 'zelle', displayName: 'Zelle', identifier: '555-123-4567' },
            { method: 'cashapp', displayName: 'Cash App', identifier: '$demouser' }
          ];
        });

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

          // Filter creator's methods to match selected payment methods
          const allCreatorMethods = mockCreatorMethods[payment.createdBy] || [];
          const selectedMethods = payment.paymentMethods || [];
          const creatorPaymentDetails = allCreatorMethods.filter(m => 
            selectedMethods.includes(m.method)
          );

          return {
            ...payment,
            splits,
            settledCount: 0,
            creatorPaymentDetails
          };
        });

        setPayments(paymentsWithSplits);
        setLoading(false);
        return;
      }

      // Authenticated mode: fetch real splits and creator payment methods
      const paymentIds = unsettledPayments.map(p => p.id);
      
      // Fetch splits and creator payment methods in parallel
      const [splitsResult, creatorMethodsResult] = await Promise.all([
        supabase
          .from('payment_splits')
          .select('*')
          .in('payment_message_id', paymentIds),
        supabase
          .from('user_payment_methods')
          .select('user_id, method_type, identifier, display_name')
          .in('user_id', creatorIds)
      ]);

      if (splitsResult.error) throw splitsResult.error;

      // Build creator methods map
      const creatorMethodsMap = new Map<string, PaymentMethodDetail[]>();
      (creatorMethodsResult.data || []).forEach(method => {
        const existing = creatorMethodsMap.get(method.user_id) || [];
        existing.push({
          method: method.method_type?.toLowerCase() || 'other',
          displayName: method.display_name || METHOD_DISPLAY_NAMES[method.method_type?.toLowerCase() || 'other'] || method.method_type || 'Other',
          identifier: method.identifier || ''
        });
        creatorMethodsMap.set(method.user_id, existing);
      });

      // Get debtor profiles (use public view for co-member data)
      const debtorIds = [...new Set((splitsResult.data || []).map(s => s.debtor_user_id))];
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, avatar_url')
        .in('user_id', debtorIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Map splits to payments
      const paymentsWithSplits = unsettledPayments.map(payment => {
        const paymentSplits = (splitsResult.data || [])
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

        // Get creator's payment methods and filter to match selected methods
        const allCreatorMethods = creatorMethodsMap.get(payment.createdBy) || [];
        const selectedMethods = (payment.paymentMethods || []).map(m => m.toLowerCase());
        const creatorPaymentDetails = selectedMethods.length > 0
          ? allCreatorMethods.filter(m => selectedMethods.includes(m.method))
          : allCreatorMethods; // Show all if none specifically selected

        return {
          ...payment,
          splits: paymentSplits,
          settledCount: paymentSplits.filter(s => s.is_settled).length,
          creatorPaymentDetails
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
  }, [tripId, isDemoMode, refreshTrigger]);

  const handleToggleSplit = async (splitId: string, paymentId: string, currentlySettled: boolean) => {
    if (demoActive) {
      // Demo mode: just update local state
      setPayments(prev => {
        const updated = prev.map(payment => {
          if (payment.id === paymentId) {
            const updatedSplits = payment.splits.map(s => 
              s.id === splitId 
                ? { ...s, is_settled: !currentlySettled, settled_at: !currentlySettled ? new Date().toISOString() : null } 
                : s
            );
            const newSettledCount = updatedSplits.filter(s => s.is_settled).length;
            const allSettled = newSettledCount === updatedSplits.length;
            return {
              ...payment,
              splits: updatedSplits,
              settledCount: newSettledCount,
              isSettled: allSettled
            };
          }
          return payment;
        });
        // Filter out fully settled payments (they move to history)
        return updated.filter(p => !p.isSettled);
      });
      toast({ 
        title: currentlySettled ? "Marked as unpaid" : "Marked as paid", 
        description: "Payment status updated" 
      });

      if (!currentlySettled) {
        // Payment marked paid: success haptic (native-only, hard-gated).
        void haptics.success();
      }
      return;
    }

    // Authenticated mode: update database
    let success: boolean;
    if (currentlySettled) {
      success = await paymentService.unsettlePayment(splitId);
    } else {
      success = await paymentService.settlePayment(splitId, 'manual');
    }
    
    if (success) {
      toast({ 
        title: currentlySettled ? "Marked as unpaid" : "Marked as paid", 
        description: "Payment status updated" 
      });

      if (!currentlySettled) {
        // Payment marked paid: success haptic (native-only, hard-gated).
        void haptics.success();
      }
      await loadPayments();
      onPaymentUpdated?.();
    } else {
      toast({ title: "Error", description: "Failed to update payment status", variant: "destructive" });
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    setDeleting(true);
    
    try {
      if (demoActive) {
        // Demo mode: remove from local state
        setPayments(prev => prev.filter(p => p.id !== paymentId));
        toast({ title: "Payment deleted (Demo)" });
        setDeleteConfirmId(null);
        onPaymentUpdated?.();
        return;
      }

      // Authenticated mode: delete from database
      const success = await paymentService.deletePaymentMessage(paymentId);
      
      if (success) {
        toast({ title: "Payment deleted", description: "Payment request has been removed" });
        setDeleteConfirmId(null);
        await loadPayments();
        onPaymentUpdated?.();
      } else {
        toast({ 
          title: "Error", 
          description: "Failed to delete payment. Please try again.", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({ 
        title: "Error", 
        description: "An unexpected error occurred.", 
        variant: "destructive" 
      });
    } finally {
      setDeleting(false);
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
    <>
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
                {/* Payment Header - Compact single row */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <span className="font-semibold text-base text-foreground">{payment.description}</span>
                    <span className="text-muted-foreground hidden sm:inline">•</span>
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-300 border-amber-500/30">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {payment.settledCount}/{payment.splits.length} paid
                    </span>
                    
                    {/* Payment Methods inline with separators */}
                    {payment.creatorPaymentDetails.map((method) => (
                      <React.Fragment key={method.method}>
                        <span className="text-muted-foreground hidden sm:inline">•</span>
                        <span className="text-sm">
                          <span className="text-muted-foreground">{method.displayName}:</span>{' '}
                          <span className="text-primary">{method.identifier || '—'}</span>
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                  
                  {/* Amount and Actions on far right */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-lg text-foreground">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ({formatCurrency(payment.amount / payment.splitCount, payment.currency)}/ea)
                    </span>
                    
                    {/* Edit/Delete buttons - only for creator */}
                    {isCreator && (
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setEditingPayment(payment)}
                          title="Edit payment"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteConfirmId(payment.id)}
                          title="Delete payment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Splits List - compact, no header label */}
                {isCreator && payment.splits.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border space-y-0.5">
                    {payment.splits.map(split => (
                      <div key={split.id} className="flex items-center justify-between py-0.5">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={split.is_settled}
                            onCheckedChange={() => handleToggleSplit(split.id, payment.id, split.is_settled)}
                          />
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={split.debtor_avatar} />
                            <AvatarFallback className="text-xs">
                              {split.debtor_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className={`text-sm ${split.is_settled ? 'text-muted-foreground' : 'text-foreground'}`}>
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

                {/* Non-creator view - inline */}
                {!isCreator && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>Split among {payment.splitCount} people</span>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Edit Payment Dialog */}
      <EditPaymentDialog
        payment={editingPayment}
        tripMembers={tripMembers}
        isOpen={!!editingPayment}
        onClose={() => setEditingPayment(null)}
        onSave={() => {
          loadPayments();
          onPaymentUpdated?.();
        }}
        isDemoMode={demoActive}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete Payment
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this payment request? This will remove all associated splits and cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteConfirmId && handleDeletePayment(deleteConfirmId)}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
