import React, { useState } from 'react';
import { X, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { demoModeService } from '@/services/demoModeService';

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  onPaymentCreated?: () => void;
}

export const CreatePaymentModal = ({ isOpen, onClose, tripId, onPaymentCreated }: CreatePaymentModalProps) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [splitCount, setSplitCount] = useState(2);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create demo payment with proper format
      demoModeService.addSessionPayment(tripId, {
        amount: parseFloat(amount),
        currency,
        description,
        splitCount,
        splitParticipants: Array.from({ length: splitCount }, (_, i) => `user${i + 1}`),
        paymentMethods: paymentMethods.length > 0 ? paymentMethods : ['Venmo']
      });

      // Reset form
      setDescription('');
      setAmount('');
      setCurrency('USD');
      setSplitCount(2);
      setPaymentMethods([]);

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
      <div className="relative w-full max-w-md bg-glass-slate-card border border-glass-slate-border rounded-t-3xl sm:rounded-3xl shadow-enterprise-2xl p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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

        {/* Form */}
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Split Between People
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={splitCount}
              onChange={(e) => setSplitCount(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500/50"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              {amount && splitCount > 0 ? `$${(parseFloat(amount) / splitCount).toFixed(2)} per person` : ''}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Preferred Payment Methods
            </label>
            <div className="space-y-2">
              {['Venmo', 'Cash App', 'Zelle', 'PayPal', 'Apple Cash'].map((method) => (
                <label key={method} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentMethods.includes(method)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPaymentMethods([...paymentMethods, method]);
                      } else {
                        setPaymentMethods(paymentMethods.filter(m => m !== method));
                      }
                    }}
                    className="w-5 h-5 rounded border-white/10 bg-white/5 text-green-600 focus:ring-2 focus:ring-green-500/50"
                  />
                  <span className="text-white">{method}</span>
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
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {isSubmitting ? 'Creating...' : 'Create Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
