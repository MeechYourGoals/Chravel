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
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';

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
  tripId: _tripId
}: SettlePaymentDialogProps) => {
  const { toast } = useToast();
  const [settling, setSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionReference, setTransactionReference] = useState('');
  const [settlementNote, setSettlementNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const normalizeProvider = (
    methodType?: string,
  ): 'venmo' | 'zelle' | 'paypal' | 'cash-app' | 'manual' => {
    switch ((methodType ?? '').toLowerCase()) {
      case 'venmo':
        return 'venmo';
      case 'zelle':
        return 'zelle';
      case 'paypal':
        return 'paypal';
      case 'cashapp':
        return 'cash-app';
      default:
        return 'manual';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(amount));
  };

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
        if (!acknowledged) {
          throw new Error('Please confirm you sent the payment.');
        }

        const provider = normalizeProvider(balance.preferredPaymentMethod?.type);
        const requiresReference = provider !== 'manual';
        const reference = transactionReference.trim();
        const note = settlementNote.trim();

        if (requiresReference && reference.length < 4) {
          throw new Error('Transaction reference is required for verification.');
        }

        const { error: updateError } = await supabase
          .from('payment_splits')
          .update({
            confirmation_status: 'pending',
            settlement_method: balance.preferredPaymentMethod?.type || 'other',
            external_settlement_provider: provider,
            external_settlement_id: reference || null,
            external_settlement_metadata: {
              note: note || null,
              captured_at: new Date().toISOString(),
            },
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
  const paymentMethodLabel = balance.preferredPaymentMethod
    ? `${balance.preferredPaymentMethod.type.charAt(0).toUpperCase()}${balance.preferredPaymentMethod.type.slice(1)}`
    : 'Other';
  const provider = normalizeProvider(balance.preferredPaymentMethod?.type);
  const referenceIsRequired = youOweThem && provider !== 'manual';
  const canConfirmSettlement = youOweThem
    ? acknowledged && (!referenceIsRequired || transactionReference.trim().length >= 4)
    : true;

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
                {paymentMethodLabel}
              </span>
            </div>
          )}

          {youOweThem ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="transaction-reference">
                  Transaction reference {referenceIsRequired ? '(required)' : '(optional)'}
                </Label>
                <Input
                  id="transaction-reference"
                  value={transactionReference}
                  onChange={e => setTransactionReference(e.target.value)}
                  placeholder="Paste the transaction ID / reference from your payment app"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  This helps prevent fraud and makes it easier for {balance.userName} to verify.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settlement-note">Note (optional)</Label>
                <Input
                  id="settlement-note"
                  value={settlementNote}
                  onChange={e => setSettlementNote(e.target.value)}
                  placeholder="e.g., “Dinner split”, “Hotel deposit”"
                  autoComplete="off"
                />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox
                  id="acknowledge-settlement"
                  checked={acknowledged}
                  onCheckedChange={checked => setAcknowledged(checked === true)}
                />
                <Label htmlFor="acknowledge-settlement" className="text-sm leading-5">
                  I confirm I sent this payment to {balance.userName}.
                </Label>
              </div>

              <p className="text-sm text-muted-foreground">
                This will request confirmation from {balance.userName} before the payment is finalized.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mt-4">
              This will mark all associated payments as settled. This action cannot be undone.
            </p>
          )}

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
          <Button onClick={handleSettle} disabled={settling || !canConfirmSettlement}>
            {settling && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {settling ? 'Settling...' : 'Confirm Settlement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
