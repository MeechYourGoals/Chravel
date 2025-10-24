import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { hapticService } from '@/services/hapticService';
import { CreatePaymentModal } from './CreatePaymentModal';
import { demoModeService } from '@/services/demoModeService';

interface Payment {
  id: string;
  payer: string;
  payerAvatar: string;
  amount: number;
  currency: string;
  description: string;
  status: 'settled' | 'pending' | 'overdue';
  splitWith: string[];
  date: string;
}

interface MobileTripPaymentsProps {
  tripId: string;
}

/**
 * iOS-optimized mobile payments view
 * Shows payment splits, settlements, and status
 */
export const MobileTripPayments = ({ tripId }: MobileTripPaymentsProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Mock data - replace with real data from backend
  const [payments, setPayments] = useState<Payment[]>([
    {
      id: '1',
      payer: 'Sarah Chen',
      payerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
      amount: 450.00,
      currency: 'USD',
      description: 'Hotel - Night 1 & 2',
      status: 'settled',
      splitWith: ['Alex', 'Jordan', 'Taylor'],
      date: '2024-03-15'
    },
    {
      id: '2',
      payer: 'Alex Rivera',
      payerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
      amount: 120.50,
      currency: 'USD',
      description: 'Group Dinner - Italian Restaurant',
      status: 'pending',
      splitWith: ['Sarah', 'Jordan', 'Taylor'],
      date: '2024-03-16'
    },
    {
      id: '3',
      payer: 'Jordan Kim',
      payerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
      amount: 85.00,
      currency: 'USD',
      description: 'Uber to Airport',
      status: 'pending',
      splitWith: ['Sarah', 'Alex', 'Taylor'],
      date: '2024-03-17'
    }
  ]);

  // Load session payments on mount
  useEffect(() => {
    const sessionPayments = demoModeService.getSessionPayments(tripId);
    if (sessionPayments.length > 0) {
      // Convert session payments to Payment format
      const convertedPayments = sessionPayments.map(sp => ({
        id: sp.id,
        payer: sp.createdByName,
        payerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo',
        amount: sp.amount,
        currency: sp.currency,
        description: sp.description,
        status: sp.is_settled ? 'settled' as const : 'pending' as const,
        splitWith: sp.split_participants,
        date: sp.created_at
      }));
      setPayments(prev => [...convertedPayments, ...prev]);
    }
  }, [tripId]);

  const handleAddPayment = async () => {
    await hapticService.medium();
    setIsModalOpen(true);
  };

  const handlePaymentCreated = () => {
    // Refresh payments from session storage
    const sessionPayments = demoModeService.getSessionPayments(tripId);
    const convertedPayments = sessionPayments.map(sp => ({
      id: sp.id,
      payer: sp.createdByName,
      payerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo',
      amount: sp.amount,
      currency: sp.currency,
      description: sp.description,
      status: sp.is_settled ? 'settled' as const : 'pending' as const,
      splitWith: sp.split_participants,
      date: sp.created_at
    }));
    setPayments(convertedPayments);
  };

  const handlePaymentTap = async (paymentId: string) => {
    await hapticService.light();
    // TODO: Open payment detail modal
    console.log('Payment tapped:', paymentId);
  };

  const getStatusIcon = (status: Payment['status']) => {
    switch (status) {
      case 'settled':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'pending':
        return <Clock size={20} className="text-yellow-500" />;
      case 'overdue':
        return <AlertCircle size={20} className="text-red-500" />;
    }
  };

  const getStatusText = (status: Payment['status']) => {
    switch (status) {
      case 'settled':
        return 'Settled';
      case 'pending':
        return 'Pending';
      case 'overdue':
        return 'Overdue';
    }
  };

  const totalOwed = payments
    .filter(p => p.status !== 'settled')
    .reduce((sum, p) => sum + (p.amount / (p.splitWith.length + 1)), 0);

  return (
    <div className="flex flex-col h-full bg-black">
      {/* Summary Card */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 border border-green-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Your Share Pending</span>
            <DollarSign size={20} className="text-green-500" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            ${totalOwed.toFixed(2)}
          </div>
          <p className="text-xs text-gray-400">
            {payments.filter(p => p.status !== 'settled').length} unsettled payments
          </p>
        </div>
      </div>

      {/* Payments List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 native-scroll">
        {payments.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign size={48} className="text-slate-600 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-slate-400 mb-2">No payments yet</h4>
            <p className="text-slate-500 text-sm">
              Split expenses and track who owes what
            </p>
          </div>
        ) : (
          payments.map((payment) => (
            <button
              key={payment.id}
              onClick={() => handlePaymentTap(payment.id)}
              className="w-full bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-4 transition-all active:scale-[0.98] text-left"
            >
              <div className="flex items-start gap-3">
                {/* Payer Avatar */}
                <img
                  src={payment.payerAvatar}
                  alt={payment.payer}
                  className="w-10 h-10 rounded-full flex-shrink-0"
                />

                {/* Payment Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {payment.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        Paid by {payment.payer}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-white">
                        ${payment.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        ${(payment.amount / (payment.splitWith.length + 1)).toFixed(2)} each
                      </p>
                    </div>
                  </div>

                  {/* Status and Split Info */}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      {getStatusIcon(payment.status)}
                      <span className="text-xs text-gray-400">
                        {getStatusText(payment.status)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      Split {payment.splitWith.length + 1} ways
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Add Payment FAB */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-black via-black to-transparent border-t border-white/10 ios-safe-bottom">
        <button
          onClick={handleAddPayment}
          className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-medium py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 min-h-[44px]"
        >
          <Plus size={20} />
          Add Payment Split
        </button>
      </div>

      {/* Create Payment Modal */}
      <CreatePaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tripId={tripId}
        onPaymentCreated={handlePaymentCreated}
      />
    </div>
  );
};
