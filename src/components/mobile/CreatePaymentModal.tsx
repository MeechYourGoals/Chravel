import React, { useState } from 'react';
import { X, DollarSign, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { demoModeService } from '@/services/demoModeService';
import { usePaymentSplits } from '@/hooks/usePaymentSplits';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getConsistentAvatar, getInitials } from '@/utils/avatarUtils';

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  tripMembers: Array<{ id: string; name: string; avatar?: string }>;
  onPaymentCreated?: () => void;
}

export const CreatePaymentModal = ({ isOpen, onClose, tripId, tripMembers, onPaymentCreated }: CreatePaymentModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
    resetForm
  } = usePaymentSplits(tripMembers);

  const paymentMethodOptions = [
    { id: 'venmo', label: 'Venmo' },
    { id: 'cashapp', label: 'Cash App' },
    { id: 'zelle', label: 'Zelle' },
    { id: 'paypal', label: 'PayPal' },
    { id: 'applecash', label: 'Apple Cash' }
  ];

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

      // Create demo payment with proper format
      demoModeService.addSessionPayment(tripId, paymentData);

      // Reset form
      resetForm();

      // Trigger callback and close
      onPaymentCreated?.();
      onClose();
    } catch (error) {
      console.error('Failed to create payment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Dinner at restaurant"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
              <input
                type="number"
                step="0.01"
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="JPY">JPY (¥)</option>
              <option value="CAD">CAD ($)</option>
              <option value="AUD">AUD ($)</option>
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
            <div className="max-h-32 overflow-y-auto space-y-2 p-3 bg-white/5 border border-white/10 rounded-xl native-scroll">
              {tripMembers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">No trip members found</p>
              ) : (
                tripMembers.map(member => (
                  <label 
                    key={member.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(member.id)}
                      onChange={() => toggleParticipant(member.id)}
                      className="w-5 h-5 rounded border-white/20 bg-white/5 text-green-600 focus:ring-2 focus:ring-green-500/50"
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={getConsistentAvatar(member.name)} alt={member.name} />
                        <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-white text-sm">{member.name}</span>
                    </div>
                  </label>
                ))
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
              {paymentMethodOptions.map((method) => (
                <label key={method.id} className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedPaymentMethods.includes(method.id as any)}
                    onChange={() => togglePaymentMethod(method.id as any)}
                    className="w-5 h-5 rounded border-white/10 bg-white/5 text-green-600 focus:ring-2 focus:ring-green-500/50"
                  />
                  <span className="text-white">{method.label}</span>
                </label>
              ))}
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
                disabled={isSubmitting || selectedParticipants.length === 0 || !amount || !description}
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
