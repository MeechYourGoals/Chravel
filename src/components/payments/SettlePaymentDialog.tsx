import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { PersonalBalance } from '../../services/paymentBalanceService';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../ui/use-toast';
import { Loader2 } from 'lucide-react';

interface SettlePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: PersonalBalance;
  tripId: string;
}

export const SettlePaymentDialog = ({
  open,
  onOpenChange,
  balance,
  tripId
}: SettlePaymentDialogProps) => {
  const { toast } = useToast();
  const [settling, setSettling] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  };

  const handleSettle = async () => {
    setSettling(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const youOweThem = balance.amountOwed < 0;
      const splitIds = balance.unsettledPayments.map(p => p.paymentId);

      // If you're the payer (you owe them), mark as pending confirmation
      if (youOweThem) {
        const { error: updateError } = await supabase
          .from('payment_splits')
          .update({
            confirmation_status: 'pending',
            settlement_method: balance.preferredPaymentMethod?.type || 'other'
          })
          .in('payment_message_id', splitIds)
          .eq('debtor_user_id', user.id)
          .eq('is_settled', false);

        if (updateError) throw updateError;

        toast({
          title: 'Payment Marked as Paid',
          description: `${balance.userName} will be notified to confirm receipt`,
        });
      } else {
        // If they owe you, you're marking as settled (immediate)
        const { error: updateError } = await supabase
          .from('payment_splits')
          .update({
            is_settled: true,
            settled_at: new Date().toISOString(),
            confirmation_status: 'confirmed',
            confirmed_by: user.id,
            confirmed_at: new Date().toISOString(),
            settlement_method: balance.preferredPaymentMethod?.type || 'other'
          })
          .in('payment_message_id', splitIds)
          .eq('debtor_user_id', balance.userId)
          .eq('is_settled', false);

        if (updateError) throw updateError;

        toast({
          title: 'Payment Settled',
          description: `Marked payment from ${balance.userName} as settled`,
        });
      }

      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      console.error('Error settling payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to settle payment. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSettling(false);
    }
  };

  const youOweThem = balance.amountOwed < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settle Payment</DialogTitle>
          <DialogDescription>
            Confirm that this payment has been completed
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Amount:</span>
            <span className="text-lg font-semibold">
              {formatCurrency(Math.abs(balance.amountOwed))}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">
              {youOweThem ? 'Paying to:' : 'Receiving from:'}
            </span>
            <span className="font-medium">{balance.userName}</span>
          </div>

          {balance.preferredPaymentMethod && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Method:</span>
              <span className="font-medium">
                {balance.preferredPaymentMethod.type.charAt(0).toUpperCase() + 
                 balance.preferredPaymentMethod.type.slice(1)}
              </span>
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-4">
            This will mark all associated payments as settled. This action cannot be undone.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={settling}
          >
            Cancel
          </Button>
          <Button onClick={handleSettle} disabled={settling}>
            {settling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm Settlement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
