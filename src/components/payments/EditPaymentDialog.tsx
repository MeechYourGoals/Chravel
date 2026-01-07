import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { CurrencySelector } from './CurrencySelector';
import { Check, Users, AlertTriangle, Loader2 } from 'lucide-react';
import { paymentService } from '../../services/paymentService';
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
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  isDemoMode?: boolean;
}

type PaymentMethodId = 'venmo' | 'cashapp' | 'zelle' | 'paypal' | 'applecash';

const PAYMENT_METHODS: Array<{ id: PaymentMethodId; label: string }> = [
  { id: 'venmo', label: 'Venmo' },
  { id: 'cashapp', label: 'Cash App' },
  { id: 'zelle', label: 'Zelle' },
  { id: 'paypal', label: 'PayPal' },
  { id: 'applecash', label: 'Apple Cash' }
];

export const EditPaymentDialog = ({
  payment,
  tripMembers,
  isOpen,
  onClose,
  onSave,
  isDemoMode = false
}: EditPaymentDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([]);
  
  // Track which participants have already paid (cannot be removed)
  const [settledParticipants, setSettledParticipants] = useState<Set<string>>(new Set());

  // Initialize form when payment changes
  useEffect(() => {
    if (payment) {
      setAmount(payment.amount);
      setDescription(payment.description);
      setCurrency(payment.currency);
      setSelectedPaymentMethods(payment.paymentMethods || []);
      
      // Get participants from splits or splitParticipants
      const participants = payment.splits?.map(s => s.debtor_user_id) || payment.splitParticipants || [];
      setSelectedParticipants(participants);
      
      // Track settled participants
      const settled = new Set(
        payment.splits?.filter(s => s.is_settled).map(s => s.debtor_user_id) || []
      );
      setSettledParticipants(settled);
    }
  }, [payment]);

  const toggleParticipant = (participantId: string) => {
    // Cannot remove settled participants
    if (settledParticipants.has(participantId)) {
      toast({
        title: "Cannot remove",
        description: "This person has already paid. Their payment must be unsettled first.",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedParticipants(prev => 
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const togglePaymentMethod = (methodId: string) => {
    setSelectedPaymentMethods(prev =>
      prev.includes(methodId)
        ? prev.filter(id => id !== methodId)
        : [...prev, methodId]
    );
  };

  const perPersonAmount = selectedParticipants.length > 0 
    ? amount / selectedParticipants.length 
    : 0;

  const handleSave = async () => {
    if (!payment) return;
    
    if (selectedParticipants.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one participant.",
        variant: "destructive"
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Validation Error",
        description: "Description is required.",
        variant: "destructive"
      });
      return;
    }

    if (amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Amount must be greater than zero.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);

    try {
      if (isDemoMode) {
        // Demo mode - just close and trigger refresh
        toast({ title: "Payment updated (Demo)", description: "Changes saved" });
        onSave();
        onClose();
        return;
      }

      // Update payment message with new amount and description
      const success = await paymentService.updatePaymentMessage(payment.id, {
        amount,
        description
      });

      if (success) {
        toast({ title: "Payment updated", description: "Changes saved successfully" });
        onSave();
        onClose();
      } else {
        toast({
          title: "Error",
          description: "Failed to update payment. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error updating payment:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Amount (first - UX priority) */}
          <div className="space-y-2">
            <Label htmlFor="edit-amount">Amount</Label>
            <Input
              id="edit-amount"
              type="number"
              step="0.01"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>

          {/* Description (second) */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">What's this for?</Label>
            <Input
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dinner, taxi, tickets, etc."
            />
          </div>

          {/* Currency (third) */}
          <div className="space-y-2">
            <Label>Currency</Label>
            <CurrencySelector value={currency} onChange={setCurrency} />
          </div>

          {/* Split Between */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-primary" />
                <Label>
                  Split between {selectedParticipants.length} people
                  {perPersonAmount > 0 && (
                    <span className="text-primary font-semibold ml-1.5">
                      (${perPersonAmount.toFixed(2)} each)
                    </span>
                  )}
                </Label>
              </div>
            </div>

            {settledParticipants.size > 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 p-2 rounded-lg">
                <AlertTriangle size={14} />
                <span>Participants who have already paid cannot be removed.</span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
              {tripMembers.map(member => {
                const isSelected = selectedParticipants.includes(member.id);
                const isSettled = settledParticipants.has(member.id);

                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleParticipant(member.id)}
                    disabled={isSettled}
                    className={`
                      inline-flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-all
                      ${isSelected
                        ? isSettled
                          ? 'bg-emerald-500/30 border-2 border-emerald-500 opacity-80'
                          : 'bg-primary/20 border-2 border-primary ring-1 ring-primary/30'
                        : 'bg-muted/50 hover:bg-muted border-2 border-transparent'
                      }
                      ${isSettled ? 'cursor-not-allowed' : ''}
                    `}
                  >
                    <div className={`
                      w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all
                      ${isSelected
                        ? isSettled ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground'
                        : 'bg-muted-foreground/20 border border-muted-foreground/40'
                      }
                    `}>
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                    {member.avatar && (
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback className="text-xs">
                          {member.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span className={`text-sm whitespace-nowrap ${isSelected ? 'font-medium' : ''}`}>
                      {member.name}
                    </span>
                    {isSettled && (
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        Paid
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            <Label>Preferred Payment Methods</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(method => {
                const isSelected = selectedPaymentMethods.includes(method.id);
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => togglePaymentMethod(method.id)}
                    className={`
                      flex items-center justify-center gap-2 rounded-lg h-10 cursor-pointer transition-all
                      ${isSelected
                        ? 'bg-primary/20 border-2 border-primary ring-1 ring-primary/30'
                        : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                      }
                    `}
                  >
                    <div className={`
                      w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all
                      ${isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted-foreground/20 border border-muted-foreground/40'
                      }
                    `}>
                      {isSelected && <Check size={12} strokeWidth={3} />}
                    </div>
                    <span className={`text-sm ${isSelected ? 'font-medium' : ''}`}>
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>
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
