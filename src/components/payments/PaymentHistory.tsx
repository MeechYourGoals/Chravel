import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { supabase } from '../../integrations/supabase/client';
import { paymentService } from '../../services/paymentService';
import { demoModeService } from '../../services/demoModeService';
import { useDemoMode } from '../../hooks/useDemoMode';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/use-toast';
import { format } from 'date-fns';
import { Loader2, Pencil, Trash2, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface MockPayment {
  id: string;
  trip_id: string;
  amount: number;
  currency: string;
  description: string;
  split_count: number;
  split_participants: string[];
  payment_methods: string[];
  created_by: string;
  is_settled: boolean;
  created_at: string;
  updated_at: string;
  version: number;
}

interface PaymentHistoryProps {
  tripId: string;
  onPaymentUpdated?: () => void;
}

interface PaymentRecord {
  id: string;
  description: string;
  amount: number;
  currency: string;
  splitCount: number;
  createdBy: string;
  createdAt: string;
  createdByName?: string;
  isSettled: boolean;
}

export const PaymentHistory = ({ tripId, onPaymentUpdated }: PaymentHistoryProps) => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { isDemoMode } = useDemoMode();
  const { user } = useAuth();
  const { toast } = useToast();

  const loadPayments = async () => {
    setLoading(true);
    try {
      let paymentMessages = await paymentService.getTripPaymentMessages(tripId);

      const isNumericOnly = /^\d+$/.test(tripId);
      const tripIdNum = parseInt(tripId);
      const shouldUseMockData = isDemoMode && isNumericOnly && tripIdNum >= 1 && tripIdNum <= 12;
      
      if (paymentMessages.length === 0 && shouldUseMockData) {
        const mockPayments = demoModeService.getMockPayments(tripId, false);
        paymentMessages = mockPayments.map((p: MockPayment) => ({
          id: p.id,
          tripId: p.trip_id,
          messageId: null,
          amount: p.amount,
          currency: p.currency,
          description: p.description,
          splitCount: p.split_count,
          splitParticipants: p.split_participants,
          paymentMethods: p.payment_methods,
          createdBy: p.created_by,
          createdAt: p.created_at,
          isSettled: p.is_settled
        }));
      }

      const sessionPayments = demoModeService.getSessionPayments(tripId);
      if (sessionPayments.length > 0) {
        const sessionMessages = sessionPayments.map((p) => ({
          id: p.id,
          tripId: p.trip_id,
          messageId: null,
          amount: p.amount,
          currency: p.currency,
          description: p.description,
          splitCount: p.split_count,
          splitParticipants: p.split_participants,
          paymentMethods: p.payment_methods,
          createdBy: p.created_by,
          createdAt: p.created_at,
          isSettled: p.is_settled
        }));
        paymentMessages = [...paymentMessages, ...sessionMessages];
      }

      // Filter to only COMPLETED payments (is_settled = true)
      const completedPayments = paymentMessages.filter(p => p.isSettled);
      
      completedPayments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const authorIds = [...new Set(completedPayments
        .filter(p => p.createdBy !== 'demo-user')
        .map(p => p.createdBy))];
      
      const profileMap = new Map<string, string>();
      
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles_public')
          .select('user_id, display_name')
          .in('user_id', authorIds);

        (profiles || []).forEach(p => {
          profileMap.set(p.user_id, p.display_name || 'Trip member');
        });
      }

      const formattedPayments = completedPayments.map(payment => ({
        id: payment.id,
        description: payment.description,
        amount: payment.amount,
        currency: payment.currency,
        splitCount: payment.splitCount,
        createdBy: payment.createdBy,
        createdAt: payment.createdAt,
        createdByName: payment.createdBy === 'demo-user' 
          ? 'Demo User' 
          : profileMap.get(payment.createdBy) || 'Trip member',
        isSettled: payment.isSettled
      }));

      setPayments(formattedPayments);
    } catch (error) {
      console.error('Error loading payment history:', error);
      
      const isNumericOnly = /^\d+$/.test(tripId);
      const tripIdNum = parseInt(tripId);
      const shouldUseMockData = isDemoMode && isNumericOnly && tripIdNum >= 1 && tripIdNum <= 12;
      
      if (shouldUseMockData) {
        const mockPayments = demoModeService.getMockPayments(tripId, false);
        const fallbackPayments = mockPayments.map((p: MockPayment) => ({
          id: p.id,
          description: p.description,
          amount: p.amount,
          currency: p.currency,
          splitCount: p.split_count,
          createdBy: p.created_by,
          createdAt: p.created_at,
          createdByName: 'Demo User',
          isSettled: p.is_settled
        }));
        setPayments(fallbackPayments);
      } else {
        setPayments([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, [tripId, isDemoMode]);

  const handleEdit = (payment: PaymentRecord) => {
    setEditingPayment(payment);
    setEditAmount(payment.amount.toString());
    setEditDescription(payment.description);
  };

  const handleSaveEdit = async () => {
    if (!editingPayment) return;

    const isNumericOnly = /^\d+$/.test(tripId);
    const tripIdNum = parseInt(tripId);
    const demoActive = isDemoMode && isNumericOnly && tripIdNum >= 1 && tripIdNum <= 12;

    if (demoActive) {
      // Demo mode: update local state
      setPayments(prev => prev.map(p => 
        p.id === editingPayment.id 
          ? { ...p, amount: parseFloat(editAmount), description: editDescription }
          : p
      ));
      toast({ title: "Payment updated (Demo)", description: "Changes saved" });
      setEditingPayment(null);
      return;
    }

    // Authenticated mode
    const success = await paymentService.updatePaymentMessage(editingPayment.id, {
      amount: parseFloat(editAmount),
      description: editDescription
    });

    if (success) {
      toast({ title: "Payment updated", description: "Changes saved" });
      setEditingPayment(null);
      await loadPayments();
      onPaymentUpdated?.();
    } else {
      toast({ title: "Error", description: "Failed to update payment", variant: "destructive" });
    }
  };

  const handleDelete = async (paymentId: string) => {
    const isNumericOnly = /^\d+$/.test(tripId);
    const tripIdNum = parseInt(tripId);
    const demoActive = isDemoMode && isNumericOnly && tripIdNum >= 1 && tripIdNum <= 12;

    if (demoActive) {
      setPayments(prev => prev.filter(p => p.id !== paymentId));
      toast({ title: "Payment deleted (Demo)" });
      setDeleteConfirmId(null);
      return;
    }

    const success = await paymentService.deletePaymentMessage(paymentId);
    if (success) {
      toast({ title: "Payment deleted" });
      setDeleteConfirmId(null);
      await loadPayments();
      onPaymentUpdated?.();
    } else {
      toast({ title: "Error", description: "Failed to delete payment", variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-lg">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-base">Completed Payments</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fully settled payment requests
          </p>
        </CardHeader>
        <CardContent className="py-3 px-4">
          {payments.length > 0 ? (
            <div className="space-y-1">
              {payments.map(payment => {
                const isCreator = user?.id === payment.createdBy;
                
                return (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b border-border last:border-0 gap-2 flex-wrap">
                    {/* Single row: all info inline with bullet separators */}
                    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                      <span className="font-semibold text-foreground">{payment.description}</span>
                      <span className="text-muted-foreground hidden sm:inline">•</span>
                      {payment.isSettled ? (
                        <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Settled
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-300 border-amber-500/30">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                      <span className="text-muted-foreground hidden sm:inline">•</span>
                      <span className="text-sm text-muted-foreground">{payment.createdByName || 'Trip member'}</span>
                      <span className="text-muted-foreground hidden sm:inline">•</span>
                      <span className="text-sm text-muted-foreground">Split {payment.splitCount} ways</span>
                      <span className="text-muted-foreground hidden sm:inline">•</span>
                      <span className="text-sm text-muted-foreground">{format(new Date(payment.createdAt), 'MMM d')}</span>
                    </div>
                    
                    {/* Amount and actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-bold text-foreground">
                        {formatCurrency(payment.amount, payment.currency)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({formatCurrency(payment.amount / payment.splitCount, payment.currency)}/ea)
                      </span>
                      
                      {/* Edit/Delete buttons - only for creator */}
                      {isCreator && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEdit(payment)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(payment.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No payments yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingPayment} onOpenChange={() => setEditingPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPayment(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            Are you sure you want to delete this payment request? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
