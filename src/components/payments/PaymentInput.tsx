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
    <Card className="bg-gradient-to-br from-gray-900/90 via-gray-900/70 to-emerald-900/20 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-emerald-400/20 hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign size={20} className="text-emerald-400" />
          <span className="text-base font-semibold text-white">Payment Details</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Amount, Currency & Description - 2 Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column: Amount + Currency */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount" className="text-sm font-medium text-gray-300 mb-1.5 block">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full h-12 rounded-xl bg-gray-800/70 border border-white/10 text-white px-4 focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-gray-500 transition-all"
                  required
                />
              </div>
              <div>
                <Label htmlFor="currency" className="text-sm font-medium text-gray-300 mb-1.5 block">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="w-full h-12 rounded-xl bg-gray-800/70 border border-white/10 text-white px-4 focus:ring-2 focus:ring-emerald-500 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/10">
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Column: Description (taller textarea) */}
            <div className="flex flex-col">
              <Label htmlFor="description" className="text-sm font-medium text-gray-300 mb-1.5">What's this for?</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dinner, taxi, tickets, etc."
                rows={5}
                className="w-full flex-1 min-h-[7rem] rounded-xl bg-gray-800/70 border border-white/10 text-white px-4 py-3 resize-none focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder-gray-500 transition-all"
                required
              />
            </div>
          </div>

          {/* Split Between People - 3 Column Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-emerald-400" />
                <Label className="text-sm font-medium text-gray-300">
                  Split between {selectedParticipants.length} people
                  {amountPerPerson > 0 && (
                    <span className="text-emerald-400 font-semibold ml-1.5">
                      (${amountPerPerson.toFixed(2)} each)
                    </span>
                  )}
                </Label>
              </div>
              <button
                type="button"
                onClick={selectAllParticipants}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
              >
                {allParticipantsSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto">
              {tripMembers.map(member => (
                <label
                  key={member.id}
                  htmlFor={`participant-${member.id}`}
                  className="flex items-center gap-2.5 bg-gray-800/60 border border-white/10 rounded-xl px-3 py-2.5 hover:border-emerald-500/30 hover:bg-gray-800/80 cursor-pointer transition-all group"
                >
                  <Checkbox
                    id={`participant-${member.id}`}
                    checked={selectedParticipants.includes(member.id)}
                    onCheckedChange={() => toggleParticipant(member.id)}
                    className="accent-emerald-500"
                  />
                  {member.avatar && (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-6 h-6 rounded-full object-cover ring-1 ring-white/10 group-hover:ring-emerald-400/30 transition-all"
                    />
                  )}
                  <span className="text-white text-sm truncate">{member.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preferred Payment Methods - Grid Layout */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-emerald-400" />
                <Label className="text-sm font-medium text-gray-300">Preferred payment methods</Label>
              </div>
              <button
                type="button"
                onClick={selectAllPaymentMethods}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
              >
                {allPaymentMethodsSelected ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {paymentMethodOptions.map(method => (
                <label
                  key={method.id}
                  htmlFor={`payment-${method.id}`}
                  className="flex items-center gap-2.5 bg-gray-800/60 border border-white/10 rounded-xl px-3 py-2.5 hover:border-emerald-500/30 hover:bg-gray-800/80 cursor-pointer transition-all"
                >
                  <Checkbox
                    id={`payment-${method.id}`}
                    checked={selectedPaymentMethods.includes(method.id)}
                    onCheckedChange={() => togglePaymentMethod(method.id)}
                    className="accent-emerald-500"
                  />
                  <span className="text-white text-sm">{method.label}</span>
                </label>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!amount || !description || selectedParticipants.length === 0}
          >
            Add Payment Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};