import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

interface PaymentSplit {
  id: string;
  debtor_user_id: string;
  amount_owed: number;
  is_settled: boolean;
  debtor_name?: string;
  debtor_avatar?: string;
}

interface EditablePayment {
  id: string;
  description: string;
  amount: number;
  currency: string;
  splitCount: number;
  createdBy: string;
  paymentMethods: string[];
  splits: PaymentSplit[];
  splitParticipants?: string[];
}

interface TripMember {
  id: string;
  name: string;
  avatar?: string;
}

interface EditPaymentDialogProps {
  payment: EditablePayment | null;
  tripMembers: TripMember[];
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onUpdatePayment: (
    paymentId: string,
    updates: { amount?: number; description?: string },
  ) => Promise<boolean>;
  isDemoMode?: boolean;
}

/** Edit dialog supports only amount and description — matches backend capabilities. */
export const EditPaymentDialog = ({
  payment,
  tripMembers: _tripMembers,
  tripId: _tripId,
  isOpen,
  onClose,
  onSave,
  onUpdatePayment,
  isDemoMode = false,
}: EditPaymentDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (payment) {
      setAmount(payment.amount);
      setDescription(payment.description);
    }
  }, [payment]);

  const handleSave = async () => {
    if (!payment) return;

    if (!description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Description is required.',
        variant: 'destructive',
      });
      return;
    }

    if (amount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Amount must be greater than zero.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const success = await onUpdatePayment(payment.id, {
        amount,
        description,
      });

      if (success) {
        toast({
          title: isDemoMode ? 'Payment updated (Demo)' : 'Payment updated',
          description: 'Changes saved successfully',
        });
        onSave();
        onClose();
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update payment. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-amount">Amount</Label>
            <Input
              id="edit-amount"
              type="number"
              step="0.01"
              value={amount || ''}
              onChange={e => setAmount(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">What&apos;s this for?</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Dinner, taxi, tickets, etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
