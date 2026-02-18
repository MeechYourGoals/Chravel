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
import { safeReload } from '@/utils/safeReload';
import { PersonalBalance } from '../../services/paymentBalanceService';
import { supabase } from '../../integrations/supabase/client';
import { useToast } from '../ui/use-toast';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '../../services/currencyService';

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
  const [error, setError] = useState<string | null>(null);
  const currency = balance.amountOwedCurrency || 'USD';

  const handleSettle = async () => {
    setSettling(true);
    setError(null);

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
      await safeReload();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error settling payment:', error);
      }
      const errorMessage = error instanceof Error ? error.message : 'Failed to settle payment';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage + '. Please try again.',
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
              {formatCurrency(Math.abs(balance.amountOwed), currency)}
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

          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-destructive font-medium">Error: {error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSettle}
                disabled={settling}
                className="mt-2 w-full"
              >
                Retry Settlement
              </Button>
            </div>
          )}
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
            {settling ? 'Settling...' : 'Confirm Settlement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
