import React from 'react';
import { DollarSign, Users, CheckSquare } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent } from '../ui/card';
import { usePaymentSplits } from '@/hooks/usePaymentSplits';
import { useDemoMode } from '@/hooks/useDemoMode';
import { PaymentMethodId } from '@/types/paymentMethods';

interface PaymentInputProps {
  onSubmit: (paymentData: {
    amount: number;
    currency: string;
    description: string;
    splitCount: number;
    splitParticipants: string[];
    paymentMethods: string[];
  }) => void;
  tripMembers: Array<{ id: string; name: string; avatar?: string }>;
  isVisible: boolean;
}

export const PaymentInput = ({ onSubmit, tripMembers, isVisible }: PaymentInputProps) => {
  const {
    amount,
    currency,
    description,
    selectedParticipants,
    selectedPaymentMethods,
    perPersonAmount,
    allParticipantsSelected,
    allPaymentMethodsSelected,
    setAmount,
    setCurrency,
    setDescription,
    toggleParticipant,
    togglePaymentMethod,
    selectAllParticipants,
    selectAllPaymentMethods,
    getPaymentData,
    resetForm
  } = usePaymentSplits(tripMembers);

  const paymentMethodOptions: Array<{ id: PaymentMethodId; label: string }> = [
    { id: 'venmo', label: 'Venmo' },
    { id: 'cashapp', label: 'Cash App' },
    { id: 'zelle', label: 'Zelle' },
    { id: 'paypal', label: 'PayPal' },
    { id: 'applecash', label: 'Apple Cash' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paymentData = getPaymentData();
    if (paymentData) {
      onSubmit(paymentData);
      resetForm();
    }
  };

  const amountPerPerson = perPersonAmount;
  const { isDemoMode } = useDemoMode();

  if (!isVisible) return null;

  // Only show empty state in production mode when truly empty
  if (!isDemoMode && tripMembers.length === 0) {
    return (
      <Card className="bg-payment-background-light border-payment-border dark:bg-payment-background dark:border-payment-border">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-400 mb-2">No trip collaborators yet</h4>
            <p className="text-gray-500 text-sm">Add collaborators to this trip before creating payment splits</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-payment-background-light border-payment-border dark:bg-payment-background dark:border-payment-border rounded-lg">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={16} className="text-payment-primary" />
          <span className="text-sm font-medium text-payment-primary-foreground dark:text-payment-primary-foreground">Payment Details</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Amount and Currency */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label htmlFor="amount" className="text-xs">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0.00"
                className="bg-white dark:bg-white !text-black placeholder:!text-gray-500"
                required
              />
            </div>
            <div>
              <Label htmlFor="currency" className="text-xs">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="bg-white dark:bg-white !text-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-xs">What's this for?</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Dinner, taxi, tickets, etc."
              className="bg-white dark:bg-white !text-black placeholder:!text-gray-500"
              required
            />
          </div>

          {/* Split Options */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Users size={14} />
                Split between {selectedParticipants.length} people
                {amountPerPerson > 0 && (
                  <span className="text-payment-primary font-medium text-xs">
                    (${amountPerPerson.toFixed(2)} each)
                  </span>
                )}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllParticipants}
                className="text-xs h-7"
              >
                {allParticipantsSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="mt-1.5 max-h-28 overflow-y-auto space-y-1.5 p-2 bg-white dark:bg-white rounded border">
              {tripMembers.map(member => (
                <div key={member.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`participant-${member.id}`}
                    checked={selectedParticipants.includes(member.id)}
                    onCheckedChange={() => toggleParticipant(member.id)}
                  />
                  <label 
                    htmlFor={`participant-${member.id}`}
                    className="text-sm flex items-center gap-2 cursor-pointer !text-black"
                  >
                    {member.avatar && (
                      <img 
                        src={member.avatar} 
                        alt={member.name}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    {member.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <CheckSquare size={14} />
                Preferred payment methods
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllPaymentMethods}
                className="text-xs h-7"
              >
                {allPaymentMethodsSelected ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {paymentMethodOptions.map(method => (
                <div key={method.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`payment-${method.id}`}
                    checked={selectedPaymentMethods.includes(method.id)}
                    onCheckedChange={() => togglePaymentMethod(method.id)}
                  />
                  <label 
                    htmlFor={`payment-${method.id}`}
                    className="text-sm cursor-pointer flex items-center gap-1 !text-white"
                  >
                    {method.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

        <Button 
          type="submit" 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={!amount || !description || selectedParticipants.length === 0}
        >
          Add Payment Request
        </Button>
        </form>
      </CardContent>
    </Card>
  );
};