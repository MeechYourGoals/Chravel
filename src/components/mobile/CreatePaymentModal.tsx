import React, { useState } from 'react';
import { X, DollarSign, Users, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { demoModeService } from '@/services/demoModeService';
import { paymentService } from '@/services/paymentService';
import { usePaymentSplits } from '@/hooks/usePaymentSplits';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/utils/avatarUtils';
import { PAYMENT_METHOD_OPTIONS } from '@/types/paymentMethods';
import { useToast } from '@/hooks/use-toast';
import { PaymentErrorHandler } from '@/services/paymentErrors';
import { formatCurrency } from '@/services/currencyService';
import { CURRENCIES } from '@/constants/currencies';

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripMembers: Array<{ id: string; name: string; avatar?: string }>;
  onPaymentCreated?: () => void;
  /** When true, payments go to session storage (demo). When false, persist to DB. */
  demoActive?: boolean;
  /** Required when demoActive is false — used for DB persistence */
  userId?: string;
}

export const CreatePaymentModal = ({
  isOpen,
  onClose,
  tripId,
  tripMembers,
  onPaymentCreated,
  demoActive = true,
  userId,
}: CreatePaymentModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const {
    amount,
    currency,
    description,
    selectedParticipants,
    selectedPaymentMethods,
    perPersonAmount,
    allParticipantsSelected,
    setAmount,
    setCurrency,
    setDescription,
    toggleParticipant,
    togglePaymentMethod,
    selectAllParticipants,
    getPaymentData,
    resetForm,
  } = usePaymentSplits(tripMembers);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const paymentData = getPaymentData();
      if (!paymentData) {
        setIsSubmitting(false);
        return;
      }

      if (demoActive) {
        demoModeService.addSessionPayment(tripId, paymentData);
        resetForm();
        onPaymentCreated?.();
        onClose();
        return;
      }

      // Authenticated: persist to database
      if (!userId) {
        toast({
          title: 'Sign in required',
          description: 'Please sign in to create payment requests.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      const result = await paymentService.createPaymentMessage(tripId, userId, {
        amount: paymentData.amount,
        currency: paymentData.currency,
        description: paymentData.description,
        splitCount: paymentData.splitCount,
        splitParticipants: paymentData.splitParticipants,
        paymentMethods: paymentData.paymentMethods,
      });

      if (result.success) {
        resetForm();
        onPaymentCreated?.();
        onClose();
        toast({
          title: 'Payment created',
          description: `${paymentData.description} - ${formatCurrency(paymentData.amount, paymentData.currency)}`,
        });
      } else if (result.error) {
        const { title, description } = PaymentErrorHandler.getServiceErrorDisplay(result.error);
        toast({
          title,
          description,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to create payment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-glass-slate-card border border-glass-slate-border rounded-t-3xl sm:rounded-3xl shadow-enterprise-2xl flex flex-col max-h-[calc(100vh-80px)] animate-slide-up">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Add Payment</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto p-6 pb-24 native-scroll">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g., Dinner at restaurant"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount || ''}
                  onChange={e => setAmount(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
                aria-label="Select currency"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol}) - {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <Users size={16} />
                  Split between {selectedParticipants.length} people
                </label>
                <button
                  type="button"
                  onClick={selectAllParticipants}
                  className="text-xs text-green-400 hover:text-green-300 font-medium px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {allParticipantsSelected ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto flex flex-wrap gap-2 p-3 bg-white/5 border border-white/10 rounded-xl native-scroll">
                {tripMembers.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-2 w-full">
                    No trip members found
                  </p>
                ) : (
                  tripMembers.map(member => {
                    const isSelected = selectedParticipants.includes(member.id);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleParticipant(member.id)}
                        className={`
                        inline-flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-all w-auto shrink-0
                        ${
                          isSelected
                            ? 'bg-green-500/20 border-2 border-green-500 ring-1 ring-green-500/30'
                            : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
                        }
                      `}
                      >
                        {/* Checkmark indicator */}
                        <div
                          className={`
                        w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all
                        ${
                          isSelected
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-700 border border-gray-600'
                        }
                      `}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                        <Avatar className="w-6 h-6 shrink-0">
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`text-sm whitespace-nowrap ${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}
                        >
                          {member.name}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              {perPersonAmount > 0 && selectedParticipants.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  ${perPersonAmount.toFixed(2)} per person
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Preferred Payment Methods
              </label>
              <div className="space-y-2">
                {PAYMENT_METHOD_OPTIONS.map(method => {
                  const isSelected = selectedPaymentMethods.includes(method.id);
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => togglePaymentMethod(method.id)}
                      className={`
                      flex items-center gap-3 w-full p-3 rounded-xl cursor-pointer transition-all
                      ${
                        isSelected
                          ? 'bg-green-500/20 border-2 border-green-500 ring-1 ring-green-500/30'
                          : 'bg-white/5 hover:bg-white/10 border-2 border-transparent'
                      }
                    `}
                    >
                      {/* Checkmark indicator */}
                      <div
                        className={`
                      w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all
                      ${
                        isSelected
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-700 border border-gray-600'
                      }
                    `}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span
                        className={`${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}
                      >
                        {method.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  selectedParticipants.length === 0 ||
                  selectedPaymentMethods.length === 0 ||
                  !amount ||
                  !description
                }
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Payment'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
